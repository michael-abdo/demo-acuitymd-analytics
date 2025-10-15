/**
 * Document Repository Interface
 * Defines the contract for document data access operations
 */

export interface IDocumentRepository {
  // Create operations
  createDocument(data: CreateDocumentData): Promise<any>;

  // Read operations
  getUserDocuments(userId: string): Promise<DocumentRow[]>;
  getUserDocumentsWithFilters(
    userId: string,
    options: DocumentQueryOptions
  ): Promise<PaginatedDocumentsResult>;
  getDocumentById(id: number): Promise<DocumentRow | null>;

  // Update operations
  updateDocument(id: number, updates: UpdateDocumentData): Promise<any>;

  // Delete operations
  deleteDocument(id: number): Promise<any>;
}

// Data Transfer Objects
export interface CreateDocumentData {
  filename: string;
  file_path: string;
  file_size: number;
  user_id: string;
  status?: DocumentStatus;
}

export interface UpdateDocumentData {
  filename?: string;
  status?: DocumentStatus;
}

export interface DocumentRow {
  id: number;
  filename: string;
  file_path: string;
  file_size: number;
  user_id: string;
  status: DocumentStatus;
  created_at: Date;
  updated_at: Date;
}

export type DocumentStatus = 'uploaded' | 'processing' | 'completed' | 'failed';

export interface DocumentQueryOptions {
  status?: DocumentStatus;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'created_at' | 'filename';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedDocumentsResult {
  documents: DocumentRow[];
  total: number;
  page: number;
  pageSize: number;
}
