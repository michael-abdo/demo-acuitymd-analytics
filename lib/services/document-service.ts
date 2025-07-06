/**
 * Centralized Document Service
 * 
 * Consolidates document database access patterns used across API routes to follow DRY principle.
 * Provides higher-level operations that combine multiple database calls and add business logic.
 */

import { documentDb, comparisonDb, queueDb } from '@/lib/nda/database';
import { Logger } from './logger';
import { NDADocument, TaskType, DocumentStatus, QueueStatus } from '@/lib/nda';
import { processUploadedFile, ProcessFileOptions, ProcessFileResult } from '@/lib/text-extraction';
import { APP_CONSTANTS } from '@/lib/config';

export interface DocumentWithMetadata extends NDADocument {
  fileType: string;
  hasExtractedText: boolean;
  extractedTextLength: number;
  relatedComparisons: number;
}

export interface DocumentValidationResult {
  isValid: boolean;
  error?: string;
  document?: NDADocument;
}

export interface DocumentOperations {
  processDocument(options: ProcessFileOptions): Promise<ProcessFileResult>;
  updateDocumentStatus(documentId: number, status: DocumentStatus, metadata?: any): Promise<boolean>;
  queueExtractionTask(documentId: number, priority?: number): Promise<{ taskId: number; queued: boolean }>;
}

export const DocumentService = {
  /**
   * Get all documents for a user with enhanced metadata
   */
  async getUserDocuments(userEmail: string): Promise<NDADocument[]> {
    Logger.db.operation(`Fetching documents for user: ${userEmail}`);
    
    const documents = await documentDb.findByUser(userEmail);
    
    Logger.db.found('documents', documents.length, { userEmail });
    return documents;
  },

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

    if (options.type) {
      filteredDocuments = filteredDocuments.filter(doc => {
        if (options.type === 'standard') return doc.is_standard;
        if (options.type === 'third_party') return !doc.is_standard;
        return true;
      });
    }

    if (options.search) {
      const searchLower = options.search.toLowerCase();
      filteredDocuments = filteredDocuments.filter(doc => 
        doc.filename.toLowerCase().includes(searchLower) ||
        doc.original_name.toLowerCase().includes(searchLower)
      );
    }

    // Sort by created_at descending
    filteredDocuments.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Apply pagination
    const offset = (options.page - 1) * options.pageSize;
    const paginatedDocuments = filteredDocuments.slice(offset, offset + options.pageSize);

    // Get comparisons count for each document
    const allComparisons = await comparisonDb.findByUser(userEmail);
    
    // Enhance with metadata
    const documentsWithMetadata: DocumentWithMetadata[] = paginatedDocuments.map(doc => ({
      ...doc,
      fileType: doc.filename.split('.').pop()?.toLowerCase() || 'unknown',
      hasExtractedText: !!doc.extracted_text,
      extractedTextLength: doc.extracted_text ? doc.extracted_text.length : 0,
      relatedComparisons: allComparisons.filter(comp => 
        comp.document1_id === doc.id || comp.document2_id === doc.id
      ).length
    }));

    const total = filteredDocuments.length;
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
    const document = userDocuments.find(doc => doc.id === documentId);
    
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
  ): Promise<{ documents: NDADocument[]; errors: string[] }> {
    Logger.db.operation(`Fetching documents [${documentIds.join(', ')}] for user: ${userEmail}`);
    
    const userDocuments = await this.getUserDocuments(userEmail);
    const documents: NDADocument[] = [];
    const errors: string[] = [];

    documentIds.forEach(id => {
      const document = userDocuments.find(doc => doc.id === id);
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
    standardDoc?: NDADocument;
    thirdPartyDoc?: NDADocument;
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
  async getUserStandardDocument(userEmail: string): Promise<NDADocument | null> {
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
    for (const doc of userDocuments) {
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
    
    // Get comparisons count
    const allComparisons = await comparisonDb.findByUser(userEmail);
    const relatedComparisons = allComparisons.filter(comp => 
      comp.document1_id === document.id || comp.document2_id === document.id
    );

    return {
      ...document,
      fileType: document.filename.split('.').pop()?.toLowerCase() || 'unknown',
      hasExtractedText: !!document.extracted_text,
      extractedTextLength: document.extracted_text ? document.extracted_text.length : 0,
      relatedComparisons: relatedComparisons.length
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
  async processDocument(options: ProcessFileOptions): Promise<ProcessFileResult> {
    Logger.api.step('DOCUMENT', 'Processing document upload', {
      filename: options.filename,
      userEmail: options.userEmail,
      isStandard: options.isStandard
    });

    try {
      // Use the existing processUploadedFile which handles:
      // 1. File validation
      // 2. Hash generation
      // 3. Duplicate detection
      // 4. Storage upload
      // 5. Database record creation
      // 6. Queue task creation
      const result = await processUploadedFile(options);

      Logger.api.success('DOCUMENT', 'Document processed successfully', {
        documentId: result.document.id,
        duplicate: result.duplicate,
        queued: result.queued
      });

      return result;
    } catch (error) {
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
        const document = await documentDb.findById(documentId);
        if (document) {
          updateData.metadata = {
            ...document.metadata,
            ...metadata,
            lastStatusUpdate: new Date().toISOString()
          };
        }
      }

      const success = await documentDb.update(documentId, updateData);

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
      // Check if task already exists
      const existingTasks = await queueDb.findByDocument?.(documentId) || [];
      const pendingTask = existingTasks.find(task => 
        task.task_type === TaskType.EXTRACT_TEXT && 
        (task.status === 'queued' || task.status === 'processing')
      );

      if (pendingTask) {
        Logger.api.warn('DOCUMENT', `Extraction already queued for document ${documentId}`, {
          existingTaskId: pendingTask.id,
          status: pendingTask.status
        });
        return { taskId: pendingTask.id, queued: false };
      }

      // Create new task
      const task = await queueDb.enqueue({
        document_id: documentId,
        task_type: TaskType.EXTRACT_TEXT,
        priority: taskPriority,
        max_attempts: APP_CONSTANTS.QUEUE.MAX_ATTEMPTS,
        scheduled_at: new Date()
      });

      Logger.api.success('DOCUMENT', `Extraction queued for document ${documentId}`, {
        taskId: task.id,
        priority: taskPriority
      });

      return { taskId: task.id, queued: true };
    } catch (error) {
      Logger.api.error('DOCUMENT', `Failed to queue extraction for document ${documentId}`, error as Error);
      throw error;
    }
  }
};