/**
 * Centralized Document Service
 * 
 * Consolidates document database access patterns used across API routes to follow DRY principle.
 * Provides higher-level operations that combine multiple database calls and add business logic.
 */

import { documentDb } from '@/lib/template/database';
// Import type from template index 
import type { TemplateDocument } from '@/lib/template';
import { Logger } from './logger';
// import { logFileOperation, logError } from '../logger';
// import { NDADocument, TaskType, DocumentStatus, QueueStatus } from '@/lib/nda'; // Removed NDA-specific imports

// Use TemplateDocument type directly instead of custom Document type
type Document = TemplateDocument;

// enum TaskType {
//   EXTRACT_TEXT = 'extract_text'
// }

enum DocumentStatus {
  UPLOADED = 'uploaded',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}
// import { processUploadedFile, ProcessFileOptions, ProcessFileResult } from '@/lib/text-extraction';
import { APP_CONSTANTS } from '@/lib/config';
import { storage } from '@/lib/storage';
import { withDatabaseErrorHandling, withStorageErrorHandling, withValidationErrorHandling } from '@/lib/decorators/error-handler';

// Define types locally for template
interface ProcessFileOptions {
  file?: File;
  buffer?: Buffer;
  userEmail: string;
  isStandard?: boolean;
}

interface ProcessFileResult {
  success: boolean;
  document?: Document;
  error?: string;
  metadata?: Record<string, any>;
}

export interface StorageMetadata {
  size?: number;
  contentType?: string;
  uploadDate?: Date;
  etag?: string;
  bucket?: string;
  key?: string;
}

export interface DocumentWithMetadata extends Document {
  fileType: string;
  hasExtractedText: boolean;
  extractedTextLength: number;
  relatedComparisons: number;
}

export interface DocumentValidationResult {
  isValid: boolean;
  error?: string;
  document?: Document;
}

export interface DocumentDeletionValidation {
  canDelete: boolean;
  blockers: string[];
  relatedComparisons: number;
}

export interface DocumentEnhanced extends DocumentWithMetadata {
  canCompare: boolean;
  canSetAsStandard: boolean;
  sizeMB: string | null;
  downloadUrl: string | null;
  storageMetadata: StorageMetadata | null;
}

export interface DocumentOperations {
  processDocument(options: ProcessFileOptions): Promise<ProcessFileResult>;
  updateDocumentStatus(documentId: number, status: DocumentStatus, metadata?: Record<string, unknown>): Promise<boolean>;
  queueExtractionTask(documentId: number, priority?: number): Promise<{ taskId: number; queued: boolean }>;
}

export const DocumentService = {
  /**
   * Get all documents for a user with enhanced metadata
   * Uses error handling decorator for consistent database error handling
   */
  getUserDocuments: withDatabaseErrorHandling(async (userEmail: string): Promise<Document[]> => {
    Logger.db.operation(`Fetching documents for user: ${userEmail}`);
    
    const documents = await documentDb.findByUser(userEmail);
    
    Logger.db.found('documents', documents.length, { userEmail });
    return documents || [];
  }, 'GET_USER_DOCUMENTS'),

  /**
   * Get documents with pagination and filtering
   */
  async getUserDocumentsPaginated(
    userEmail: string, 
    options: {
      page: number;
      pageSize: number;
      type?: 'standard' | 'third_party';
      search?: string;
    }
  ): Promise<{ documents: DocumentWithMetadata[]; total: number; pages: number }> {
    const allDocuments = await this.getUserDocuments(userEmail);
    
    // Apply filters
    let filteredDocuments = allDocuments;

    if (options.type && filteredDocuments) {
      filteredDocuments = filteredDocuments.filter(doc => {
        if (options.type === 'standard') return doc.is_standard;
        if (options.type === 'third_party') return !doc.is_standard;
        return true;
      });
    }

    if (options.search && filteredDocuments) {
      const searchLower = options.search.toLowerCase();
      filteredDocuments = filteredDocuments.filter(doc => 
        doc.filename.toLowerCase().includes(searchLower) ||
        doc.original_name.toLowerCase().includes(searchLower)
      );
    }

    // Sort by created_at descending
    if (filteredDocuments) {
      filteredDocuments.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }

    // Apply pagination
    const offset = (options.page - 1) * options.pageSize;
    const paginatedDocuments = filteredDocuments ? filteredDocuments.slice(offset, offset + options.pageSize) : [];

    // TODO: Get comparisons count for each document
    // const allComparisons = await comparisonDb.findByUser(userEmail);
    
    // Enhance with metadata
    const documentsWithMetadata: DocumentWithMetadata[] = paginatedDocuments.map(doc => ({
      ...doc,
      fileType: doc.filename.split('.').pop()?.toLowerCase() || 'unknown',
      hasExtractedText: !!doc.extracted_text,
      extractedTextLength: doc.extracted_text ? doc.extracted_text.length : 0,
      relatedComparisons: 0 // TODO: Implement comparison counting
    }));

    const total = filteredDocuments ? filteredDocuments.length : 0;
    const pages = Math.ceil(total / options.pageSize);

    Logger.db.operation(`Paginated documents`, { 
      userEmail, 
      page: options.page, 
      pageSize: options.pageSize,
      returned: documentsWithMetadata.length,
      total,
      pages
    });

    return { documents: documentsWithMetadata, total, pages };
  },

  /**
   * Get a single document by ID with validation that user owns it
   */
  async getUserDocumentById(userEmail: string, documentId: number): Promise<DocumentValidationResult> {
    Logger.db.operation(`Fetching document ${documentId} for user: ${userEmail}`);
    
    const userDocuments = await this.getUserDocuments(userEmail);
    const document = userDocuments?.find(doc => doc.id === documentId);
    
    if (!document) {
      Logger.db.missing(`Document ${documentId}`, { userEmail });
      return {
        isValid: false,
        error: `Document ${documentId} not found or not accessible by user ${userEmail}`
      };
    }

    Logger.api.success('DOCUMENT', `Document ${documentId} found`, { userEmail });
    return { isValid: true, document };
  },

  /**
   * Get multiple documents by IDs with validation
   */
  async getUserDocumentsByIds(
    userEmail: string, 
    ...documentIds: number[]
  ): Promise<{ documents: Document[]; errors: string[] }> {
    Logger.db.operation(`Fetching documents [${documentIds.join(', ')}] for user: ${userEmail}`);
    
    const userDocuments = await this.getUserDocuments(userEmail);
    const documents: Document[] = [];
    const errors: string[] = [];

    documentIds.forEach(id => {
      const document = userDocuments?.find(doc => doc.id === id);
      if (document) {
        documents.push(document);
      } else {
        errors.push(`Document ${id} not found or not accessible`);
      }
    });

    Logger.db.operation(`Document fetch result`, {
      userEmail,
      requested: documentIds.length,
      found: documents.length,
      errors: errors.length
    });

    return { documents, errors };
  },

  /**
   * Check if documents have extracted text
   */
  async validateDocumentsForComparison(
    userEmail: string,
    standardDocId: number,
    thirdPartyDocId: number
  ): Promise<{
    isValid: boolean;
    standardDoc?: Document;
    thirdPartyDoc?: Document;
    missingExtraction: string[];
    errors: string[];
  }> {
    Logger.api.step('COMPARE', `Validating documents for comparison`);
    
    const { documents, errors } = await this.getUserDocumentsByIds(
      userEmail, 
      standardDocId, 
      thirdPartyDocId
    );

    if (errors.length > 0) {
      return {
        isValid: false,
        missingExtraction: [],
        errors
      };
    }

    const [standardDoc, thirdPartyDoc] = documents;
    const missingExtraction: string[] = [];

    if (!standardDoc.extracted_text) {
      missingExtraction.push(`Standard document (ID: ${standardDocId})`);
    }
    if (!thirdPartyDoc.extracted_text) {
      missingExtraction.push(`Third-party document (ID: ${thirdPartyDocId})`);
    }

    Logger.api.step('COMPARE', `Document validation complete`, {
      standardDoc: !!standardDoc,
      thirdPartyDoc: !!thirdPartyDoc,
      standardHasText: !!standardDoc?.extracted_text,
      thirdPartyHasText: !!thirdPartyDoc?.extracted_text,
      missingExtraction: missingExtraction.length
    });

    return {
      isValid: errors.length === 0 && missingExtraction.length === 0,
      standardDoc,
      thirdPartyDoc,
      missingExtraction,
      errors
    };
  },

  /**
   * Get user's standard document (designated as template)
   */
  async getUserStandardDocument(userEmail: string): Promise<Document | null> {
    Logger.db.operation(`Fetching standard document for user: ${userEmail}`);
    
    const document = await documentDb.getStandardDocument(userEmail);
    
    if (document) {
      Logger.db.found('standard document', 1, { userEmail });
    } else {
      Logger.db.missing('standard document', { userEmail });
    }
    
    return document;
  },

  /**
   * Set a document as the user's standard template
   */
  async setUserStandardDocument(userEmail: string, documentId: number): Promise<boolean> {
    Logger.api.step('DOCUMENT', `Setting document ${documentId} as standard for user: ${userEmail}`);
    
    const validation = await this.getUserDocumentById(userEmail, documentId);
    if (!validation.isValid || !validation.document) {
      Logger.api.error('DOCUMENT', `Cannot set standard: ${validation.error}`);
      return false;
    }

    // First, unset any existing standard documents for this user
    const userDocuments = await this.getUserDocuments(userEmail);
    for (const doc of userDocuments || []) {
      if (doc.is_standard) {
        await documentDb.update(doc.id, { is_standard: false });
      }
    }

    // Set the new standard document
    const success = await documentDb.update(documentId, { is_standard: true });
    
    if (success) {
      Logger.api.success('DOCUMENT', `Document ${documentId} set as standard`);
    } else {
      Logger.api.error('DOCUMENT', `Failed to set document ${documentId} as standard`);
    }

    return success;
  },

  /**
   * Get enhanced document details with storage metadata
   */
  async getDocumentDetails(userEmail: string, documentId: number): Promise<DocumentWithMetadata | null> {
    const validation = await this.getUserDocumentById(userEmail, documentId);
    if (!validation.isValid || !validation.document) {
      return null;
    }

    const document = validation.document;
    
    // TODO: Get comparisons count from generic database  
    // const allComparisons = await comparisonDb.findByUser(userEmail);
    // const relatedComparisons = []; // Temporary empty array - commented out unused

    return {
      ...document,
      fileType: document.filename.split('.').pop()?.toLowerCase() || 'unknown',
      hasExtractedText: !!document.extracted_text,
      extractedTextLength: document.extracted_text ? document.extracted_text.length : 0,
      relatedComparisons: 0 // TODO: Calculate from comparison database
    };
  },

  /**
   * Check if user owns a document (utility for authorization)
   */
  async checkDocumentOwnership(userEmail: string, documentId: number): Promise<boolean> {
    const validation = await this.getUserDocumentById(userEmail, documentId);
    return validation.isValid;
  },

  /**
   * Process a document upload (DRY: consolidates upload/validate/store/queue pattern)
   * Used by upload, seed-dev, and any future document ingestion routes
   */
  async processDocument(_options: ProcessFileOptions): Promise<ProcessFileResult> {
    // logFileOperation('process-started', 'document', 0, {
    //   userEmail: options.userEmail,
    //   isStandard: options.isStandard
    // });
    
    console.log('Processing document upload'); // Simple logging for template

    try {
      // Use the existing processUploadedFile which handles:
      // 1. File validation
      // 2. Hash generation
      // 3. Duplicate detection
      // 4. Storage upload
      // 5. Database record creation
      // 6. Queue task creation
      // const result = await processUploadedFile(options); // TODO: Implement for template
      throw new Error('Document processing not implemented in template');
      
      // Unreachable code below - commented out for template
      // logFileOperation('process-completed', options.filename, options.buffer?.length || 0, {
      //   documentId: result.document.id,
      //   duplicate: result.duplicate,
      //   queued: result.queued
      // });

      // Logger.api.success('DOCUMENT', 'Document processed successfully', {
      //   documentId: result.document.id,
      //   duplicate: result.duplicate,
      //   queued: result.queued
      // });

      // return result;
    } catch (error) {
      // logFileOperation('process-failed', options.filename, options.buffer?.length || 0, {
      //   error: error instanceof Error ? error.message : String(error)
      // });
      
      // logError(error as Error, {
      //   type: 'document-processing',
      //   filename: options.filename,
      //   userEmail: options.userEmail
      // });
      
      Logger.api.error('DOCUMENT', 'Document processing failed', error as Error);
      throw error;
    }
  },

  /**
   * Update document status with consistent logging (DRY: centralized status updates)
   */
  async updateDocumentStatus(
    documentId: number, 
    status: DocumentStatus, 
    metadata?: any
  ): Promise<boolean> {
    Logger.api.step('DOCUMENT', `Updating document ${documentId} status to ${status}`, metadata);

    try {
      const updateData: any = { status };
      
      // Merge metadata if provided
      if (metadata) {
        // TODO: Implement generic document lookup
        // const document = await documentDb.findById(documentId);
        // For now, just set the metadata directly without merging
        updateData.metadata = {
          ...metadata,
          lastStatusUpdate: new Date().toISOString()
        };
      }

      // TODO: Implement generic document update
      // const success = await documentDb.update(documentId, updateData);
      const success = false; // Temporary return

      if (success) {
        Logger.api.success('DOCUMENT', `Document ${documentId} status updated to ${status}`);
      } else {
        Logger.api.error('DOCUMENT', `Failed to update document ${documentId} status`);
      }

      return success;
    } catch (error) {
      Logger.api.error('DOCUMENT', `Error updating document ${documentId} status`, error as Error);
      return false;
    }
  },

  /**
   * Queue extraction task with consistent settings (DRY: standardize extraction queuing)
   */
  async queueExtractionTask(
    documentId: number, 
    priority?: number
  ): Promise<{ taskId: number; queued: boolean }> {
    const taskPriority = priority ?? APP_CONSTANTS.QUEUE.DEFAULT_PRIORITY;
    
    Logger.api.step('DOCUMENT', `Queueing extraction for document ${documentId}`, { priority: taskPriority });

    try {
      // TODO: Check if task already exists in generic queue
      /*
      const existingTasks = await queueDb.findByDocument?.(documentId) || [];
      const pendingTask = existingTasks.find(task => 
        task.task_type === TaskType.EXTRACT_TEXT && 
        (task.status === 'queued' || task.status === 'processing')
      );
      */
      const pendingTask: any = null;

      if (pendingTask) {
        Logger.api.warn('DOCUMENT', `Extraction already queued for document ${documentId}`, {
          existingTaskId: pendingTask.id,
          status: pendingTask.status
        });
        return { taskId: pendingTask.id, queued: false };
      }

      // TODO: Create new task in generic queue
      /*
      const task = await queueDb.enqueue({
        document_id: documentId,
        task_type: TaskType.EXTRACT_TEXT,
        priority: taskPriority,
        max_attempts: APP_CONSTANTS.QUEUE.MAX_ATTEMPTS,
        scheduled_at: new Date()
      });
      */
      const task = { id: Date.now() }; // Temporary mock

      Logger.api.success('DOCUMENT', `Extraction queued for document ${documentId}`, {
        taskId: task.id,
        priority: taskPriority
      });

      return { taskId: task.id, queued: true };
    } catch (error) {
      Logger.api.error('DOCUMENT', `Failed to queue extraction for document ${documentId}`, error as Error);
      throw error;
    }
  },

  /**
   * Get document URLs including signed URL for download (DRY: centralize URL generation)
   * Uses storage error handling decorator for consistent error handling
   */
  getDocumentUrls: withStorageErrorHandling(async (
    document: Document
  ): Promise<{ downloadUrl: string | null; storageMetadata: any }> => {
    let downloadUrl = null;
    let storageMetadata = null;
    
    Logger.api.step('DOCUMENT', `Getting URLs for document ${document.id}`);
    
    const exists = await storage.exists(document.filename);
    
    if (exists) {
      // Get metadata
      storageMetadata = await storage.head(document.filename);
      
      // Generate signed URL for download
      if (storage.isS3?.()) {
        downloadUrl = await storage.getSignedUrl(document.filename, 'get', { expires: 3600 });
        Logger.api.step('DOCUMENT', 'Generated S3 signed URL');
      } else {
        // For local storage, use download endpoint
        downloadUrl = `/api/documents/${document.id}/download`;
        Logger.api.step('DOCUMENT', 'Generated local download URL');
      }
    } else {
      Logger.api.warn('DOCUMENT', `Storage file not found: ${document.filename}`);
    }
    
    return { downloadUrl, storageMetadata };
  }, 'GET_DOCUMENT_URLS'),

  /**
   * Validate if a document can be deleted (DRY: centralize deletion validation)
   */
  async validateDocumentDeletion(
    _userEmail: string,
    documentId: number
  ): Promise<DocumentDeletionValidation> {
    Logger.api.step('DOCUMENT', `Validating deletion for document ${documentId}`);
    
    const blockers: string[] = [];
    
    // TODO: Check if document is used in any comparisons
    // const allComparisons = await comparisonDb.findByUser(userEmail);
    const relatedComparisons: any[] = []; // Temporary empty array

    if (relatedComparisons.length > 0) {
      blockers.push(`Document is used in ${relatedComparisons.length} comparison(s)`);
    }

    const canDelete = blockers.length === 0;
    
    Logger.api.step('DOCUMENT', `Deletion validation result`, {
      documentId,
      canDelete,
      blockers: blockers.length,
      relatedComparisons: 0 // TODO: Calculate from comparison database
    });

    return {
      canDelete,
      blockers,
      relatedComparisons: 0 // TODO: Calculate from comparison database
    };
  },

  /**
   * Delete document with complete cleanup (DRY: centralize deletion logic)
   */
  async deleteDocument(
    userEmail: string,
    documentId: number
  ): Promise<{ deleted: boolean; error?: string }> {
    Logger.api.step('DOCUMENT', `Starting deletion for document ${documentId}`);
    
    // Validate document ownership
    const validation = await this.getUserDocumentById(userEmail, documentId);
    if (!validation.isValid || !validation.document) {
      return { deleted: false, error: validation.error };
    }

    const document = validation.document;

    // Validate deletion is allowed
    const deletionValidation = await this.validateDocumentDeletion(userEmail, documentId);
    if (!deletionValidation.canDelete) {
      return { 
        deleted: false, 
        error: `Cannot delete document: ${deletionValidation.blockers.join(', ')}` 
      };
    }

    try {
      // Delete from storage first
      const exists = await storage.exists(document.filename);
      if (exists) {
        await storage.delete(document.filename);
        Logger.api.step('DOCUMENT', `Storage file deleted: ${document.filename}`);
      }

      // TODO: Delete from generic document database
      // const deleted = await documentDb.delete(documentId);
      const deleted = false; // Temporary return
      if (!deleted) {
        Logger.api.error('DOCUMENT', `Failed to delete document ${documentId} from database`);
        return { deleted: false, error: 'Failed to delete document from database' };
      }

      Logger.api.success('DOCUMENT', `Document ${documentId} deleted successfully`);
      return { deleted: true };

    } catch (error) {
      Logger.api.error('DOCUMENT', `Error deleting document ${documentId}`, error as Error);
      return { deleted: false, error: `Deletion failed: ${(error as Error).message}` };
    }
  },

  /**
   * Get enhanced document with all metadata (DRY: centralize document enrichment)
   */
  async getEnhancedDocument(
    userEmail: string,
    documentId: number
  ): Promise<DocumentEnhanced | null> {
    const validation = await this.getUserDocumentById(userEmail, documentId);
    if (!validation.isValid || !validation.document) {
      return null;
    }

    const document = validation.document;
    
    // Get URLs and storage metadata
    const urlResult = await this.getDocumentUrls(document);
    const { downloadUrl, storageMetadata } = urlResult.success 
      ? urlResult.data || { downloadUrl: null, storageMetadata: null }
      : { downloadUrl: null, storageMetadata: null };
    
    // TODO: Get comparisons count from generic database  
    // const allComparisons = await comparisonDb.findByUser(userEmail);
    // const relatedComparisons = []; // Temporary empty array - commented out unused

    // Calculate enhanced properties
    const fileType = document.filename.split('.').pop()?.toLowerCase() || 'unknown';
    const sizeMB = document.file_size ? (document.file_size / 1024 / 1024).toFixed(2) : null;
    const hasExtractedText = !!document.extracted_text;
    const extractedTextLength = document.extracted_text ? document.extracted_text.length : 0;

    return {
      ...document,
      fileType,
      hasExtractedText,
      extractedTextLength,
      relatedComparisons: 0, // TODO: Calculate from comparison database
      canCompare: !document.is_standard, // Can compare if it's not a standard doc
      canSetAsStandard: !document.is_standard, // Can set as standard if not already
      sizeMB,
      downloadUrl,
      storageMetadata
    };
  },

  /**
   * File validation using centralized validation logic (DRY: consolidate file checks)
   * Uses validation error handling decorator for consistent validation error handling
   */
  validateFile: withValidationErrorHandling(async (file: File): Promise<boolean> => {
    Logger.api.step('DOCUMENT', 'Validating uploaded file', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    // Import FileValidation dynamically to avoid circular dependencies
    const { FileValidation } = await import('@/lib/utils');
    
    // Use validateFile directly which throws appropriate errors
    try {
      FileValidation.validateFile(file);
    } catch (error: any) {
      throw new Error(error.message || 'File validation failed');
    }

    Logger.api.step('DOCUMENT', 'File validation passed');
    return true;
  }, 'VALIDATE_FILE')
};