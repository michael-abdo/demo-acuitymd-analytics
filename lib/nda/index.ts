/**
 * NDA Library Exports
 * 
 * Central export point for all NDA-related functionality
 */

// Export all types
export * from '@/types/nda';
export * from './types';

// Export database operations
export { 
  documentDb, 
  comparisonDb, 
  queueDb, 
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
} from '@/types/nda';

// Re-export types for convenience (excluding enums which are values)
export type {
  NDADocument,
  NDAComparison,
  NDAExport,
  ProcessingQueueItem,
  KeyDifference,
  AISuggestion,
  DocumentUploadRequest,
  DocumentUploadResponse,
  ComparisonRequest,
  ComparisonResponse,
  ExportRequest,
  ExportResponse
} from '@/types/nda';