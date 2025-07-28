/**
 * Centralized Constants Re-export
 * 
 * Consolidates all commonly used constants and utilities into a single import
 * to reduce duplication and make imports more consistent across the codebase.
 */

// Core configuration and constants
export { config, APP_CONSTANTS } from './config';

// API utilities
export { ApiErrors, FileValidation } from './utils';
export { ApiResponseHelpers } from './auth-utils';

// Database and NDA types
export type { DocumentStatus, TaskType, QueueStatus } from './nda';
export { 
  documentDb, 
  queueDb, 
  executeQuery,
  getConnection
} from './nda';

// Storage
export { storage, ndaPaths } from './storage';

// Services
export { Logger } from './services/logger';
export { RequestParser } from './services/request-parser';
export { DocumentService } from './services/document-service';

// Authentication wrappers
export { 
  withAuth, 
  withAuthDynamic, 
  withDocumentAccess,
  withErrorHandler,
  withStorage
} from './auth-utils';

// Utility functions
export { 
  isDocumentOwner, 
  getFilenameFromPath,
  cn
} from './utils';

// Text extraction (simplified)
export { 
  extractTextFromPDF,
  extractTextFromWord,
  processUploadedFile,
  processTextExtraction
} from './text-extraction';

// Types
export type { DocumentContent, ProcessFileOptions, ProcessFileResult } from './text-extraction';
export type { NDADocumentRow } from './nda/types';