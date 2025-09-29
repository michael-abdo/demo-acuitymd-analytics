/**
 * Document Repository Interface
 * Defines the contract for document data access operations
 */

export interface IDocumentRepository {
  // Create operations
  createDocument(data: CreateDocumentData): Promise<any>;

  // Read operations
  getUserDocuments(userId: string): Promise<DocumentRow[]>;
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
}

export interface UpdateDocumentData {
  filename?: string;
  status?: 'uploaded' | 'processing' | 'completed' | 'failed';
}

export interface DocumentRow {
  id: number;
  filename: string;
  file_path: string;
  file_size: number;
  user_id: string;
  status: 'uploaded' | 'processing' | 'completed' | 'failed';
  created_at: Date;
  updated_at: Date;
}