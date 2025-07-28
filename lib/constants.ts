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

// Database and template types
export type { DocumentStatus, TaskType, QueueStatus } from './template';
export { 
  documentDb, 
  // queueDb, // TODO: Create when needed
  executeQuery,
  getConnection
} from './template';

// Storage
export { storage, templatePaths } from './storage';

// Services
export { Logger } from './services/logger';
export { RequestParser } from './services/request-parser';
// export { DocumentService } from './services/document-service'; // Temporarily commented out

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
export type { TemplateDocumentRow } from './template/types';