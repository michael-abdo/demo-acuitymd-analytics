/**
 * NDA Library Type Definitions
 * 
 * This file contains internal types used by the NDA library functions.
 * These types are for internal use and may include database row types,
 * query builders, and utility types.
 */

import { 
  DocumentStatus, 
  ComparisonStatus, 
  ExportType, 
  TaskType, 
  QueueStatus 
} from '@/types/nda';

/**
 * Database row types (raw from MySQL)
 * These match the exact database schema including snake_case
 */
export interface NDADocumentRow {
  id: number;
  filename: string;
  original_name: string;
  file_hash: string;
  s3_url: string;
  file_size: bigint;
  upload_date: Date;
  user_id: string;
  status: DocumentStatus;
  extracted_text: string | null;
  is_standard: boolean;
  metadata: string | null; // JSON string from DB
  created_at: Date;
  updated_at: Date;
}

export interface NDAComparisonRow {
  id: number;
  document1_id: number;
  document2_id: number;
  comparison_result_s3_url: string | null;
  comparison_summary: string | null;
  similarity_score: string | null; // DECIMAL from DB
  key_differences: string | null; // JSON string from DB
  ai_suggestions: string | null; // JSON string from DB
  created_date: Date;
  user_id: string;
  status: ComparisonStatus;
  error_message: string | null;
  processing_time_ms: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface NDAExportRow {
  id: number;
  comparison_id: number;
  export_type: ExportType;
  export_s3_url: string;
  file_size: bigint;
  created_date: Date;
  user_id: string;
  download_count: number;
  last_downloaded_at: Date | null;
  metadata: string | null; // JSON string from DB
  created_at: Date;
  updated_at: Date;
}

export interface ProcessingQueueRow {
  id: number;
  document_id: number;
  task_type: TaskType;
  priority: number;
  status: QueueStatus;
  attempts: number;
  max_attempts: number;
  scheduled_at: Date | null;
  started_at: Date | null;
  completed_at: Date | null;
  error_message: string | null;
  result: string | null; // JSON string from DB
  created_at: Date;
  updated_at: Date;
}

/**
 * Query builder types
 */
export interface QueryOptions {
  where?: Record<string, any>;
  orderBy?: { column: string; order: 'ASC' | 'DESC' }[];
  limit?: number;
  offset?: number;
  include?: string[];
}

export interface InsertResult {
  insertId: number;
  affectedRows: number;
}

export interface UpdateResult {
  affectedRows: number;
  changedRows: number;
}

export interface DeleteResult {
  affectedRows: number;
}

/**
 * Transaction types
 */
export interface Transaction {
  query: (query: string, values?: any[]) => Promise<any>;
  commit: () => Promise<void>;
  rollback: () => Promise<void>;
}

/**
 * S3 operation types
 */
export interface S3UploadOptions {
  bucket?: string;
  key: string;
  body: Buffer | Uint8Array | string;
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface S3DownloadOptions {
  bucket?: string;
  key: string;
}

export interface S3DeleteOptions {
  bucket?: string;
  key: string;
}

export interface S3UploadResult {
  url: string;
  key: string;
  etag?: string;
}

/**
 * Text extraction types
 */
export interface TextExtractionOptions {
  ocrEnabled?: boolean;
  language?: string;
  preserveFormatting?: boolean;
  extractMetadata?: boolean;
}

export interface TextExtractionResult {
  text: string;
  metadata?: DocumentMetadata;
  pages?: number;
  wordCount?: number;
  language?: string;
}

export interface DocumentMetadata {
  title?: string;
  author?: string;
  created?: Date;
  modified?: Date;
  keywords?: string[];
}

/**
 * OpenAI integration types
 */
export interface ComparisonPromptOptions {
  model?: 'gpt-4' | 'gpt-3.5-turbo';
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface ComparisonPromptResult {
  summary: string;
  similarity_score: number;
  key_differences: Array<{
    section: string;
    type: string;
    importance: string;
    explanation: string;
  }>;
  suggestions: Array<{
    section: string;
    type: string;
    priority: string;
    suggestion: string;
    rationale: string;
  }>;
  raw_response?: any;
}

/**
 * Validation types
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Cache types (for future implementation)
 */
export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  key: string;
  value: any;
}

export interface CacheResult<T> {
  hit: boolean;
  value?: T;
  expired?: boolean;
}

/**
 * Job queue types (for async processing)
 */
export interface JobOptions {
  priority?: number;
  delay?: number; // Delay in milliseconds
  attempts?: number;
  backoff?: {
    type: 'fixed' | 'exponential';
    delay: number;
  };
}

export interface JobResult {
  id: number;
  status: QueueStatus;
  result?: any;
  error?: string;
}

/**
 * Utility types
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Nullable<T> = T | null;

export type AsyncFunction<T = any> = (...args: any[]) => Promise<T>;

export type ErrorHandler = (error: Error, context?: any) => void;

/**
 * Database connection types
 */
export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectionLimit?: number;
  enableKeepAlive?: boolean;
  keepAliveInitialDelay?: number;
}

export interface DatabaseConnection {
  query: (sql: string, values?: any[]) => Promise<any>;
  beginTransaction: () => Promise<Transaction>;
  end: () => Promise<void>;
}