/**
 * MedtechProduct Service
 * Business logic for medtech_product operations
 */

import { medtechProductRepository, MedtechProductRepository } from '../repositories/medtech_product.repository';
import {
  MedtechProductRow,
  MedtechProductQueryOptions,
  CreateMedtechProductData,
  UpdateMedtechProductData
} from '../repositories/interfaces/medtech_product.repository.interface';
import {
  IMedtechProductService,
  MedtechProductResponse,
  MedtechProductListResponse,
  CreateMedtechProductInput,
  UpdateMedtechProductInput
} from './interfaces/medtech_product.service.interface';

export class MedtechProductService implements IMedtechProductService {
  constructor(private repository: MedtechProductRepository = medtechProductRepository) {}

  async getUserMedtechProducts(userId: string, options: MedtechProductQueryOptions = {}): Promise<MedtechProductListResponse> {
    if (!userId?.trim()) {
      throw new Error('Valid userId is required');
    }

    const { medtech_products, total, page, pageSize } = await this.repository.getUserMedtechProductsWithFilters(
      userId,
      options
    );

    return {
      medtech_products: medtech_products.map(row => this.transformMedtechProductForAPI(row)),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: pageSize > 0 ? Math.ceil(total / pageSize) : 0
      }
    };
  }

  async getMedtechProductById(id: number, userId: string): Promise<MedtechProductResponse> {
    if (!id || id < 1) {
      throw new Error('Valid medtech_product ID is required');
    }

    const row = await this.repository.getMedtechProductById(id);

    if (!row) {
      throw new Error('MedtechProduct not found');
    }

    if (row.user_id !== userId) {
      throw new Error('Access denied');
    }

    return this.transformMedtechProductForAPI(row);
  }

  async createMedtechProduct(data: CreateMedtechProductInput, userId: string): Promise<MedtechProductResponse> {
    if (!data?.product_name?.toString().trim()) {
      throw new Error('Missing required field: product_name');
    }

    const result = await this.repository.createMedtechProduct({
      ...data,
      user_id: userId
    } as CreateMedtechProductData);

    const created = await this.repository.getMedtechProductById(result.insertId);
    if (!created) {
      throw new Error('Failed to retrieve created medtech_product');
    }

    return this.transformMedtechProductForAPI(created);
  }

  async updateMedtechProduct(id: number, updates: UpdateMedtechProductInput, userId: string): Promise<MedtechProductResponse> {
    const existing = await this.repository.getMedtechProductById(id);

    if (!existing) {
      throw new Error('MedtechProduct not found');
    }

    if (existing.user_id !== userId) {
      throw new Error('Access denied');
    }

    await this.repository.updateMedtechProduct(id, updates as UpdateMedtechProductData);

    const updated = await this.repository.getMedtechProductById(id);
    if (!updated) {
      throw new Error('Failed to retrieve updated medtech_product');
    }

    return this.transformMedtechProductForAPI(updated);
  }

  async deleteMedtechProduct(id: number, userId: string): Promise<void> {
    const existing = await this.repository.getMedtechProductById(id);

    if (!existing) {
      throw new Error('MedtechProduct not found');
    }

    if (existing.user_id !== userId) {
      throw new Error('Access denied');
    }

    await this.repository.deleteMedtechProduct(id);
  }

  transformMedtechProductForAPI(row: MedtechProductRow): MedtechProductResponse {
    return {
      id: row.id,
      product_name: row.product_name,
      approval_date: row.approval_date,
      market_region: row.market_region,
      units_sold: row.units_sold,
      fda_status: row.fda_status,
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString()
    };
  }
}

export const medtechProductService = new MedtechProductService();
