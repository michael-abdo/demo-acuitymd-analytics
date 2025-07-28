/**
 * Template Library Exports
 * 
 * Central export point for all template-related functionality
 */

// Export all types
export * from '@/types/template';
export * from './types';

// Export database operations
export { 
  documentDb, 
  comparisonDb,
  // queueDb, // TODO: Create when needed
  initializeDatabase,
  executeQuery,
  getConnection
} from './database';

// Re-export enums explicitly
export { 
  DocumentStatus,
  ComparisonStatus,
  ExportType,
  TaskType,
  QueueStatus
} from '@/types/template';

// Re-export types for convenience (excluding enums which are values)
export type {
  TemplateDocument,
  TemplateComparison,
  TemplateExport,
  ProcessingQueueItem,
  KeyDifference,
  AISuggestion,
  DocumentUploadRequest,
  DocumentUploadResponse,
  ComparisonRequest,
  ComparisonResponse,
  ExportRequest,
  ExportResponse
} from '@/types/template';