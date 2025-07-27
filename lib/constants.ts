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
export { ApiResponse } from './auth-utils';

// Database and NDA types
export { 
  documentDb, 
  comparisonDb, 
  queueDb, 
  DocumentStatus,
  ComparisonStatus,
  TaskType,
  QueueStatus,
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

// Request parsing utilities (consolidated to avoid duplication)
export { RequestParser } from './services/request-parser';

// Text extraction
export { 
  extractText,
  extractTextFromPDF,
  extractTextFromDOCX,
  extractTextFromTXT,
  compareDocuments,
  processTextExtraction
} from './text-extraction';