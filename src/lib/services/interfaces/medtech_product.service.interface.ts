/**
 * MedtechProduct Service Interface
 * Defines the contract for medtech_product business logic operations
 */

import {
  MedtechProductRow,
  MedtechProductQueryOptions
} from '../../repositories/interfaces/medtech_product.repository.interface';

export interface IMedtechProductService {
  getUserMedtechProducts(userId: string, options?: MedtechProductQueryOptions): Promise<MedtechProductListResponse>;
  getMedtechProductById(id: number, userId: string): Promise<MedtechProductResponse>;
  createMedtechProduct(data: CreateMedtechProductInput, userId: string): Promise<MedtechProductResponse>;
  updateMedtechProduct(id: number, updates: UpdateMedtechProductInput, userId: string): Promise<MedtechProductResponse>;
  deleteMedtechProduct(id: number, userId: string): Promise<void>;
  transformMedtechProductForAPI(row: MedtechProductRow): MedtechProductResponse;
}

export interface CreateMedtechProductInput {
  product_name: string;
  approval_date: string;
  market_region: string;
  units_sold: number;
  fda_status: string;
}

export interface UpdateMedtechProductInput {
  product_name?: string;
  approval_date?: string;
  market_region?: string;
  units_sold?: number;
  fda_status?: string;
}

export interface MedtechProductResponse {
  id: number;
  product_name: string;
  approval_date: string;
  market_region: string;
  units_sold: number;
  fda_status: string;
  created_at: string;
  updated_at: string;
}

export interface MedtechProductListResponse {
  medtech_products: MedtechProductResponse[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
