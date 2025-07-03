/**
 * NDA Analyzer Type Definitions
 * 
 * This file contains all TypeScript type definitions for the NDA Analyzer.
 * These types mirror the database schema for type safety.
 */

// Document status enum matching database
export enum DocumentStatus {
  UPLOADED = 'uploaded',
  PROCESSING = 'processing',
  PROCESSED = 'processed',
  ERROR = 'error'
}

// Comparison status enum matching database
export enum ComparisonStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  ERROR = 'error'
}

// Export type enum matching database
export enum ExportType {
  PDF = 'pdf',
  DOCX = 'docx'
}

// Task type enum for processing queue
export enum TaskType {
  EXTRACT_TEXT = 'extract_text',
  COMPARE = 'compare',
  EXPORT = 'export'
}

// Queue status enum
export enum QueueStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

/**
 * NDA Document type matching nda_documents table
 */
export interface NDADocument {
  id: number;
  filename: string;
  original_name: string;
  file_hash: string;
  s3_url: string;
  file_size: number;
  upload_date: Date;
  user_id: string;
  status: DocumentStatus;
  extracted_text?: string | null;
  is_standard: boolean;
  metadata?: Record<string, any> | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * NDA Comparison type matching nda_comparisons table
 */
export interface NDAComparison {
  id: number;
  document1_id: number;
  document2_id: number;
  comparison_result_s3_url?: string | null;
  comparison_summary?: string | null;
  similarity_score?: number | null;
  key_differences?: Array<KeyDifference> | null;
  ai_suggestions?: Array<AISuggestion> | null;
  created_date: Date;
  user_id: string;
  status: ComparisonStatus;
  error_message?: string | null;
  processing_time_ms?: number | null;
  created_at: Date;
  updated_at: Date;
  // Relations
  document1?: NDADocument;
  document2?: NDADocument;
}

/**
 * NDA Export type matching nda_exports table
 */
export interface NDAExport {
  id: number;
  comparison_id: number;
  export_type: ExportType;
  export_s3_url: string;
  file_size: number;
  created_date: Date;
  user_id: string;
  download_count: number;
  last_downloaded_at?: Date | null;
  metadata?: ExportMetadata | null;
  created_at: Date;
  updated_at: Date;
  // Relations
  comparison?: NDAComparison;
}

/**
 * Processing Queue type matching nda_processing_queue table
 */
export interface ProcessingQueueItem {
  id: number;
  document_id: number;
  task_type: TaskType;
  priority: number;
  status: QueueStatus;
  attempts: number;
  max_attempts: number;
  scheduled_at?: Date | null;
  started_at?: Date | null;
  completed_at?: Date | null;
  error_message?: string | null;
  result?: any | null;
  created_at: Date;
  updated_at: Date;
  // Relations
  document?: NDADocument;
}

/**
 * Key Difference structure for comparison results
 */
export interface KeyDifference {
  section: string;
  type: 'missing' | 'different' | 'additional';
  importance: 'high' | 'medium' | 'low';
  standard_text?: string;
  compared_text?: string;
  explanation: string;
}

/**
 * AI Suggestion structure
 */
export interface AISuggestion {
  section: string;
  type: 'addition' | 'modification' | 'removal';
  priority: 'critical' | 'recommended' | 'optional';
  suggestion: string;
  rationale: string;
  example?: string;
}

/**
 * Export metadata structure
 */
export interface ExportMetadata {
  include_original_text: boolean;
  include_ai_suggestions: boolean;
  include_risk_assessment: boolean;
  custom_branding?: boolean;
  generated_by: string;
  template_version: string;
}

/**
 * Document upload request type
 */
export interface DocumentUploadRequest {
  file: File;
  is_standard?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Document upload response type
 */
export interface DocumentUploadResponse {
  success: boolean;
  document?: NDADocument;
  error?: string;
  duplicate?: boolean;
  existing_document_id?: number;
}

/**
 * Comparison request type
 */
export interface ComparisonRequest {
  standard_document_id: number;
  compare_document_id: number;
  options?: ComparisonOptions;
}

/**
 * Comparison options
 */
export interface ComparisonOptions {
  detailed_analysis?: boolean;
  focus_areas?: string[];
  ignore_sections?: string[];
  ai_model?: 'gpt-4' | 'gpt-3.5-turbo';
}

/**
 * Comparison response type
 */
export interface ComparisonResponse {
  success: boolean;
  comparison?: NDAComparison;
  error?: string;
}

/**
 * Export request type
 */
export interface ExportRequest {
  comparison_id: number;
  export_type: ExportType;
  options?: ExportOptions;
}

/**
 * Export options
 */
export interface ExportOptions {
  include_original_text?: boolean;
  include_ai_suggestions?: boolean;
  include_risk_assessment?: boolean;
  custom_branding?: boolean;
  watermark?: boolean;
}

/**
 * Export response type
 */
export interface ExportResponse {
  success: boolean;
  export?: NDAExport;
  download_url?: string;
  error?: string;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

/**
 * API Error response
 */
export interface APIError {
  error: string;
  message: string;
  status_code: number;
  details?: any;
}