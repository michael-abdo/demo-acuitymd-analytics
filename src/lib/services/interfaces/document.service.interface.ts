/**
 * Document Service Interface
 * Defines the contract for document business logic operations
 */

import { DocumentRow } from '../../repositories/interfaces/document.repository.interface';

export interface IDocumentService {
  // Service-level operations with business logic
  getUserDocuments(userId: string): Promise<DocumentResponse[]>;
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
}

export interface UpdateDocumentInput {
  filename?: string;
  status?: 'uploaded' | 'processing' | 'completed' | 'failed';
}

export interface DocumentResponse {
  id: number;
  filename: string;
  file_path: string;
  file_size: number;
  user_id: string;
  status: 'uploaded' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
  // Additional computed fields
  formatted_size: string;
  download_url?: string;
}