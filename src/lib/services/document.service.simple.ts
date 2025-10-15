/**
 * Simplified Document Service Implementation
 * Minimal version without complex error handling to fix build issues
 */

import { 
  IDocumentService, 
  CreateDocumentInput, 
  UpdateDocumentInput, 
  DocumentResponse,
  DocumentListResponse
} from './interfaces/document.service.interface';
import { 
  DocumentRow, 
  IDocumentRepository,
  DocumentQueryOptions 
} from '../repositories/interfaces/document.repository.interface';
// @ts-ignore - Used as default parameter in constructor
import { documentRepository as defaultDocumentRepository } from '../repositories/document.repository';

export class SimpleDocumentService implements IDocumentService {
  private readonly documentRepository: IDocumentRepository;

  constructor(documentRepository?: IDocumentRepository) {
    this.documentRepository = documentRepository ?? defaultDocumentRepository;
  }
  
  async getUserDocuments(userId: string, options: DocumentQueryOptions = {}): Promise<DocumentListResponse> {
    try {
      if (!userId || typeof userId !== 'string' || userId.trim() === '') {
        throw new Error('Valid userId is required');
      }

      const normalizedOptions: DocumentQueryOptions = {
        page: options.page ?? 1,
        pageSize: options.pageSize ?? 25,
        status: options.status,
        search: options.search?.trim(),
        sortBy: options.sortBy ?? 'created_at',
        sortOrder: options.sortOrder ?? 'desc'
      };

      const { documents, total, page, pageSize } =
        await this.documentRepository.getUserDocumentsWithFilters(userId, normalizedOptions);
      const transformed = this.transformDocumentsForAPI(documents);
      const totalPages = pageSize > 0 ? Math.ceil(total / pageSize) : 0;

      return {
        documents: transformed,
        pagination: {
          page,
          pageSize,
          total,
          totalPages
        }
      };
    } catch (error) {
      console.error('Error in getUserDocuments:', error);
      throw new Error('Failed to get documents');
    }
  }

  async getDocumentById(id: number, userId: string): Promise<DocumentResponse> {
    try {
      if (!id || typeof id !== 'number' || id < 1) {
        throw new Error('Valid document ID is required');
      }
      if (!userId || typeof userId !== 'string' || userId.trim() === '') {
        throw new Error('Valid userId is required');
      }
      
      const document = await this.documentRepository.getDocumentById(id);
      
      if (!document) {
        throw new Error('Document not found');
      }
      
      if (document.user_id !== userId) {
        throw new Error('Access denied');
      }
      
      return this.transformDocumentForAPI(document);
    } catch (error) {
      console.error('Error in getDocumentById:', error);
      throw error;
    }
  }

  async createDocument(data: CreateDocumentInput, userId: string): Promise<DocumentResponse> {
    try {
      if (!data || !data.filename || !data.file_path || !data.file_size) {
        throw new Error('Missing required document data');
      }
      if (!userId || typeof userId !== 'string' || userId.trim() === '') {
        throw new Error('Valid userId is required');
      }
      
      const documentData = {
        filename: data.filename.trim(),
        file_path: data.file_path.trim(),
        file_size: data.file_size,
        user_id: userId,
        status: data.status
      };
      
      const result = await this.documentRepository.createDocument(documentData);
      const createdDocument = await this.documentRepository.getDocumentById(result.insertId);
      
      if (!createdDocument) {
        throw new Error('Failed to retrieve created document');
      }
      
      return this.transformDocumentForAPI(createdDocument);
    } catch (error) {
      console.error('Error in createDocument:', error);
      throw new Error('Failed to create document');
    }
  }

  async updateDocument(id: number, updates: UpdateDocumentInput, userId: string): Promise<DocumentResponse> {
    try {
      if (!id || typeof id !== 'number' || id < 1) {
        throw new Error('Valid document ID is required');
      }
      if (!updates || Object.keys(updates).length === 0) {
        throw new Error('No updates provided');
      }
      if (!userId || typeof userId !== 'string' || userId.trim() === '') {
        throw new Error('Valid userId is required');
      }
      
      const existingDocument = await this.documentRepository.getDocumentById(id);
      
      if (!existingDocument) {
        throw new Error('Document not found');
      }
      
      if (existingDocument.user_id !== userId) {
        throw new Error('Access denied');
      }
      
      const updateData: any = {};
      if (updates.filename) {
        updateData.filename = updates.filename.trim();
      }
      if (updates.status) {
        updateData.status = updates.status;
      }
      
      await this.documentRepository.updateDocument(id, updateData);
      const updatedDocument = await this.documentRepository.getDocumentById(id);
      
      if (!updatedDocument) {
        throw new Error('Failed to retrieve updated document');
      }
      
      return this.transformDocumentForAPI(updatedDocument);
    } catch (error) {
      console.error('Error in updateDocument:', error);
      throw error;
    }
  }

  async deleteDocument(id: number, userId: string): Promise<void> {
    try {
      if (!id || typeof id !== 'number' || id < 1) {
        throw new Error('Valid document ID is required');
      }
      if (!userId || typeof userId !== 'string' || userId.trim() === '') {
        throw new Error('Valid userId is required');
      }
      
      const existingDocument = await this.documentRepository.getDocumentById(id);
      
      if (!existingDocument) {
        throw new Error('Document not found');
      }
      
      if (existingDocument.user_id !== userId) {
        throw new Error('Access denied');
      }
      
      await this.documentRepository.deleteDocument(id);
    } catch (error) {
      console.error('Error in deleteDocument:', error);
      throw error;
    }
  }

  transformDocumentForAPI(document: DocumentRow): DocumentResponse {
    const formatFileSize = (bytes: number): string => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const generateDownloadUrl = (document: DocumentRow): string | undefined => {
      return `/api/documents/${document.id}/download`;
    };

    return {
      id: document.id,
      filename: document.filename,
      file_path: document.file_path,
      file_size: document.file_size,
      user_id: document.user_id,
      status: document.status,
      created_at: document.created_at.toISOString(),
      updated_at: document.updated_at.toISOString(),
      formatted_size: formatFileSize(document.file_size),
      download_url: generateDownloadUrl(document)
    };
  }

  transformDocumentsForAPI(documents: DocumentRow[]): DocumentResponse[] {
    return documents.map(document => this.transformDocumentForAPI(document));
  }
}

// Export a singleton instance for convenience
export const simpleDocumentService = new SimpleDocumentService();
