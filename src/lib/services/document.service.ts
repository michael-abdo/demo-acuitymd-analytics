/**
 * Document Service Implementation
 * Implements IDocumentService interface with business logic operations
 */

import { 
  IDocumentService, 
  CreateDocumentInput, 
  UpdateDocumentInput, 
  DocumentResponse 
} from './interfaces/document.service.interface';
import { DocumentRow, IDocumentRepository } from '../repositories/interfaces/document.repository.interface';
// @ts-ignore - Used as default parameter in constructor
import { documentRepository } from '../repositories/document.repository';
import { ServiceErrorHandler } from './errors/service-error-handler';
import { ValidationError } from './errors/service-errors';

export class DocumentService implements IDocumentService {
  
  constructor(private documentRepository: IDocumentRepository = documentRepository) {
    // Dependency injection for repository
  }
  
  async getUserDocuments(userId: string): Promise<DocumentResponse[]> {
    return ServiceErrorHandler.withErrorHandling(
      async () => {
        // Validate required input
        ServiceErrorHandler.validateRequired(userId, 'userId');
        ServiceErrorHandler.validateString(userId, 'userId', 1, 255);
        
        // Business logic: Get documents from repository
        const documents = await this.documentRepository.getUserDocuments(userId);
        
        // Transform for API response
        return this.transformDocumentsForAPI(documents);
      },
      {
        serviceName: 'DocumentService',
        operation: 'getUserDocuments',
        userId,
        context: { operation: 'retrieve_user_documents' }
      }
    );
  }

  async getDocumentById(id: number, userId: string): Promise<DocumentResponse> {
    return ServiceErrorHandler.withErrorHandling(
      async () => {
        // Validate inputs
        ServiceErrorHandler.validateRequired(id, 'documentId');
        ServiceErrorHandler.validateNumeric(id, 'documentId', 1);
        ServiceErrorHandler.validateRequired(userId, 'userId');
        ServiceErrorHandler.validateString(userId, 'userId', 1, 255);
        
        // Get document from repository
        const document = await this.documentRepository.getDocumentById(id);
        
        // Check if document exists
        ServiceErrorHandler.checkExists(document, 'Document', id);
        
        // Authorization check: verify document belongs to user
        ServiceErrorHandler.checkOwnership(
          document!.user_id, 
          userId, 
          'Document', 
          id,
          { documentId: id }
        );
        
        // Transform for API response
        return this.transformDocumentForAPI(document!);
      },
      {
        serviceName: 'DocumentService',
        operation: 'getDocumentById',
        userId,
        context: { resourceId: id, operation: 'retrieve_document' }
      }
    );
  }

  async createDocument(data: CreateDocumentInput, userId: string): Promise<DocumentResponse> {
    return ServiceErrorHandler.withErrorHandling(
      async () => {
        // Validate inputs
        ServiceErrorHandler.validateRequired(data, 'documentData');
        ServiceErrorHandler.validateRequired(userId, 'userId');
        ServiceErrorHandler.validateString(userId, 'userId', 1, 255);
        
        // Validate document data fields
        ServiceErrorHandler.validateRequired(data.filename, 'filename');
        ServiceErrorHandler.validateString(data.filename, 'filename', 1, 255);
        ServiceErrorHandler.validateRequired(data.file_path, 'file_path');
        ServiceErrorHandler.validateString(data.file_path, 'file_path', 1, 500);
        ServiceErrorHandler.validateRequired(data.file_size, 'file_size');
        ServiceErrorHandler.validateNumeric(data.file_size, 'file_size', 1, 100 * 1024 * 1024); // 100MB max
        
        // Business logic: Prepare data for repository
        const documentData = {
          filename: data.filename.trim(),
          file_path: data.file_path.trim(),
          file_size: data.file_size,
          user_id: userId
        };
        
        // Create document via repository
        const result = await this.documentRepository.createDocument(documentData);
        
        // Get the created document to return transformed response
        const createdDocument = await this.documentRepository.getDocumentById(result.insertId);
        ServiceErrorHandler.checkExists(createdDocument, 'Created Document', result.insertId);
        
        // Transform for API response
        return this.transformDocumentForAPI(createdDocument!);
      },
      {
        serviceName: 'DocumentService',
        operation: 'createDocument',
        userId,
        context: { 
          filename: data?.filename,
          file_size: data?.file_size,
          operation: 'create_document' 
        }
      }
    );
  }

  async updateDocument(id: number, updates: UpdateDocumentInput, userId: string): Promise<DocumentResponse> {
    return ServiceErrorHandler.withErrorHandling(
      async () => {
        // Validate inputs
        ServiceErrorHandler.validateRequired(id, 'documentId');
        ServiceErrorHandler.validateNumeric(id, 'documentId', 1);
        ServiceErrorHandler.validateRequired(updates, 'updates');
        ServiceErrorHandler.validateRequired(userId, 'userId');
        ServiceErrorHandler.validateString(userId, 'userId', 1, 255);
        
        // Validate there are updates to process
        if (!updates || Object.keys(updates).length === 0) {
          throw new ValidationError('No updates provided', 'updates', updates);
        }
        
        // First verify the document exists and user owns it
        const existingDocument = await this.documentRepository.getDocumentById(id);
        ServiceErrorHandler.checkExists(existingDocument, 'Document', id);
        ServiceErrorHandler.checkOwnership(
          existingDocument!.user_id, 
          userId, 
          'Document', 
          id,
          { operation: 'update_document' }
        );
        
        // Validate update fields
        if (updates.filename !== undefined) {
          ServiceErrorHandler.validateString(updates.filename, 'filename', 1, 255);
        }
        
        if (updates.status !== undefined) {
          const validStatuses = ['uploaded', 'processing', 'completed', 'failed'];
          ServiceErrorHandler.validateEnum(updates.status, 'status', validStatuses);
        }
        
        // Prepare update data
        const updateData: any = {};
        if (updates.filename) {
          updateData.filename = updates.filename.trim();
        }
        if (updates.status) {
          updateData.status = updates.status;
        }
        
        // Update document via repository
        await this.documentRepository.updateDocument(id, updateData);
        
        // Get updated document to return transformed response
        const updatedDocument = await this.documentRepository.getDocumentById(id);
        ServiceErrorHandler.checkExists(updatedDocument, 'Updated Document', id);
        
        // Transform for API response
        return this.transformDocumentForAPI(updatedDocument!);
      },
      {
        serviceName: 'DocumentService',
        operation: 'updateDocument',
        userId,
        context: { 
          resourceId: id,
          updates: Object.keys(updates || {}),
          operation: 'update_document' 
        }
      }
    );
  }

  async deleteDocument(id: number, userId: string): Promise<void> {
    return ServiceErrorHandler.withErrorHandling(
      async () => {
        // Validate inputs
        ServiceErrorHandler.validateRequired(id, 'documentId');
        ServiceErrorHandler.validateNumeric(id, 'documentId', 1);
        ServiceErrorHandler.validateRequired(userId, 'userId');
        ServiceErrorHandler.validateString(userId, 'userId', 1, 255);
        
        // First verify the document exists and user owns it
        const existingDocument = await this.documentRepository.getDocumentById(id);
        ServiceErrorHandler.checkExists(existingDocument, 'Document', id);
        ServiceErrorHandler.checkOwnership(
          existingDocument!.user_id, 
          userId, 
          'Document', 
          id,
          { 
            operation: 'delete_document',
            filename: existingDocument!.filename,
            file_path: existingDocument!.file_path 
          }
        );
        
        // TODO: Add file cleanup logic here
        // This would involve deleting the actual file from storage (local or S3)
        // For now, we'll just delete the database record
        // Future implementation might include:
        // - await this.storageService.deleteFile(existingDocument.file_path);
        
        // Delete document from repository
        await this.documentRepository.deleteDocument(id);
        
        // No return value needed for delete operation
      },
      {
        serviceName: 'DocumentService',
        operation: 'deleteDocument',
        userId,
        context: { 
          resourceId: id,
          operation: 'delete_document' 
        }
      }
    );
  }

  transformDocumentForAPI(document: DocumentRow): DocumentResponse {
    // Format file size in human-readable format
    const formatFileSize = (bytes: number): string => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Generate download URL (placeholder - would be implemented based on storage provider)
    const generateDownloadUrl = (document: DocumentRow): string | undefined => {
      // This would be implemented based on the storage provider (local/S3)
      // For now, return a placeholder
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
      // Computed fields
      formatted_size: formatFileSize(document.file_size),
      download_url: generateDownloadUrl(document)
    };
  }

  transformDocumentsForAPI(documents: DocumentRow[]): DocumentResponse[] {
    return documents.map(document => this.transformDocumentForAPI(document));
  }
}

// Export a singleton instance for convenience
export const documentService = new DocumentService();