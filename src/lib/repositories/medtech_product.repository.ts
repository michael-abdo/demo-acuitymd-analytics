/**
 * MedtechProduct Repository Implementation
 * Handles all database operations for medtech_products
 */

import { executeQuery } from '../database/connection';
import {
  IMedtechProductRepository,
  CreateMedtechProductData,
  UpdateMedtechProductData,
  MedtechProductRow,
  MedtechProductQueryOptions,
  PaginatedMedtechProductsResult
} from './interfaces/medtech_product.repository.interface';

export class MedtechProductRepository implements IMedtechProductRepository {

  private async withErrorHandling<T>(operation: () => Promise<T>, operationName: string): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`Repository error in ${operationName}:`, error);

      let helpMessage = `Database error during "${operationName}".\n`;

      if (errorMsg.includes('ECONNREFUSED')) {
        helpMessage += 'MySQL server is not running. Start it with: brew services start mysql (macOS) or sudo systemctl start mysql (Linux)';
      } else if (errorMsg.includes("doesn't exist") || errorMsg.includes('Unknown table')) {
        helpMessage += 'Database table is missing. Run: npm run db:setup';
      } else if (errorMsg.includes('Duplicate entry')) {
        helpMessage += 'A medtech_product with this data already exists.';
      } else if (errorMsg.includes('Data too long')) {
        helpMessage += 'Input data exceeds maximum length.';
      } else if (errorMsg.includes('Access denied')) {
        helpMessage += 'Database credentials are incorrect. Check DATABASE_URL in .env';
      } else {
        helpMessage += `Technical details: ${errorMsg}`;
      }

      throw new Error(helpMessage);
    }
  }

  async createMedtechProduct(data: CreateMedtechProductData): Promise<{ insertId: number }> {
    return this.withErrorHandling(async () => {
      const result = await executeQuery(
        `INSERT INTO medtech_products (product_name, approval_date, market_region, units_sold, fda_status, user_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [data.product_name, data.approval_date, data.market_region, data.units_sold, data.fda_status, data.user_id]
      );
      return result as { insertId: number };
    }, 'createMedtechProduct');
  }

  async getMedtechProductById(id: number): Promise<MedtechProductRow | null> {
    return this.withErrorHandling(async () => {
      const results = await executeQuery(
        'SELECT * FROM medtech_products WHERE id = ?',
        [id]
      ) as MedtechProductRow[];
      return Array.isArray(results) && results.length > 0 ? results[0] : null;
    }, 'getMedtechProductById');
  }

  async getUserMedtechProducts(userId: string): Promise<MedtechProductRow[]> {
    return this.withErrorHandling(async () => {
      return executeQuery(
        'SELECT * FROM medtech_products WHERE user_id = ? ORDER BY created_at DESC',
        [userId]
      ) as Promise<MedtechProductRow[]>;
    }, 'getUserMedtechProducts');
  }

  async getUserMedtechProductsWithFilters(
    userId: string,
    options: MedtechProductQueryOptions
  ): Promise<PaginatedMedtechProductsResult> {
    return this.withErrorHandling(async () => {
      const {
        search,
        page = 1,
        pageSize = 25,
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = options;

      const MAX_PAGE_SIZE = 100;
      const safePage = Math.max(1, Math.floor(Number(page) || 1));
      const safePageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(Number(pageSize) || 25)));
      const offset = (safePage - 1) * safePageSize;

      const conditions: string[] = ['user_id = ?'];
      const args: unknown[] = [userId];

      if (search) {
        conditions.push('(product_name LIKE ? OR market_region LIKE ? OR fda_status LIKE ?)');
        const likeQuery = `%${search}%`;
        args.push(likeQuery);
        args.push(likeQuery);
        args.push(likeQuery);

      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;
      const allowedSortColumns = new Set(['created_at', 'product_name']);
      const orderColumn = allowedSortColumns.has(sortBy ?? '') ? sortBy : 'created_at';
      const orderDirection = sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      const medtech_products = await executeQuery(
        `SELECT * FROM medtech_products ${whereClause}
         ORDER BY ${orderColumn} ${orderDirection}
         LIMIT ${safePageSize} OFFSET ${offset}`,
        args
      ) as MedtechProductRow[];

      const countResult = await executeQuery(
        `SELECT COUNT(*) as total FROM medtech_products ${whereClause}`,
        args
      ) as Array<{ total: number }>;

      return {
        medtech_products,
        total: countResult?.[0]?.total ?? 0,
        page: safePage,
        pageSize: safePageSize
      };
    }, 'getUserMedtechProductsWithFilters');
  }

  async updateMedtechProduct(id: number, updates: UpdateMedtechProductData): Promise<void> {
    return this.withErrorHandling(async () => {
      const allowedColumns = new Set(['product_name', 'approval_date', 'market_region', 'units_sold', 'fda_status']);
      const safeUpdates = Object.entries(updates).filter(([key]) => allowedColumns.has(key));

      if (safeUpdates.length === 0) {
        throw new Error(
          'No valid update fields provided.\n' +
          'Allowed fields: product_name, approval_date, market_region, units_sold, fda_status'
        );
      }

      const setClause = safeUpdates.map(([key]) => `${key} = ?`).join(', ');
      const values = [...safeUpdates.map(([, value]) => value), id];

      await executeQuery(
        `UPDATE medtech_products SET ${setClause}, updated_at = NOW() WHERE id = ?`,
        values
      );
    }, 'updateMedtechProduct');
  }

  async deleteMedtechProduct(id: number): Promise<void> {
    return this.withErrorHandling(async () => {
      await executeQuery('DELETE FROM medtech_products WHERE id = ?', [id]);
    }, 'deleteMedtechProduct');
  }
}

export const medtechProductRepository = new MedtechProductRepository();
