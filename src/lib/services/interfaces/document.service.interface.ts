/**
 * Document Service Interface
 * Defines the contract for document business logic operations
 */

import { 
  DocumentRow, 
  DocumentQueryOptions, 
  DocumentStatus 
} from '../../repositories/interfaces/document.repository.interface';

export interface IDocumentService {
  // Service-level operations with business logic
  getUserDocuments(
    userId: string,
    options?: DocumentQueryOptions
  ): Promise<DocumentListResponse>;
  getDocumentById(id: number, userId: string): Promise<DocumentResponse>;
  createDocument(data: CreateDocumentInput, userId: string): Promise<DocumentResponse>;
  updateDocument(id: number, updates: UpdateDocumentInput, userId: string): Promise<DocumentResponse>;
  deleteDocument(id: number, userId: string): Promise<void>;
  
  // Data transformation
  transformDocumentForAPI(document: DocumentRow): DocumentResponse;
  transformDocumentsForAPI(documents: DocumentRow[]): DocumentResponse[];
}

// Service-level input/output types
export interface CreateDocumentInput {
  filename: string;
  file_path: string;
  file_size: number;
  status?: DocumentStatus;
}

export interface UpdateDocumentInput {
  filename?: string;
  status?: DocumentStatus;
}

export interface DocumentResponse {
  id: number;
  filename: string;
  file_path: string;
  file_size: number;
  user_id: string;
  status: DocumentStatus;
  created_at: string;
  updated_at: string;
  // Additional computed fields
  formatted_size: string;
  download_url?: string;
}

export interface DocumentListResponse {
  documents: DocumentResponse[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
