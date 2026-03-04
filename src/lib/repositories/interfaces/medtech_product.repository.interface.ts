/**
 * MedtechProduct Repository Interface
 * Defines the data access contract for medtech_products
 */



export interface MedtechProductRow {
  id: number;
  product_name: string;
  approval_date: string;
  market_region: string;
  units_sold: number;
  fda_status: string;
  user_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateMedtechProductData {
  product_name: string;
  approval_date: string;
  market_region: string;
  units_sold: number;
  fda_status: string;
  user_id: string;
}

export interface UpdateMedtechProductData {
  product_name?: string;
  approval_date?: string;
  market_region?: string;
  units_sold?: number;
  fda_status?: string;
}

export interface MedtechProductQueryOptions {
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'created_at' | 'product_name';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedMedtechProductsResult {
  medtech_products: MedtechProductRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface IMedtechProductRepository {
  createMedtechProduct(data: CreateMedtechProductData): Promise<{ insertId: number }>;
  getMedtechProductById(id: number): Promise<MedtechProductRow | null>;
  getUserMedtechProducts(userId: string): Promise<MedtechProductRow[]>;
  getUserMedtechProductsWithFilters(userId: string, options: MedtechProductQueryOptions): Promise<PaginatedMedtechProductsResult>;
  updateMedtechProduct(id: number, updates: UpdateMedtechProductData): Promise<void>;
  deleteMedtechProduct(id: number): Promise<void>;
}
