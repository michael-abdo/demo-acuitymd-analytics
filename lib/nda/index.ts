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
  initializeDatabase 
} from './database';

// Re-export for convenience
export type {
  NDADocument,
  NDAComparison,
  NDAExport,
  ProcessingQueueItem,
  DocumentStatus,
  ComparisonStatus,
  ExportType,
  TaskType,
  QueueStatus,
  KeyDifference,
  AISuggestion,
  DocumentUploadRequest,
  DocumentUploadResponse,
  ComparisonRequest,
  ComparisonResponse,
  ExportRequest,
  ExportResponse
} from '@/types/nda';