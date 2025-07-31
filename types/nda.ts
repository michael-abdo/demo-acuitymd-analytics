// Enum definitions
export enum DocumentStatus {
  UPLOADED = 'UPLOADED',
  PROCESSING = 'PROCESSING',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED'
}

export enum ComparisonStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export enum ExportType {
  PDF = 'PDF',
  CSV = 'CSV',
  DOCX = 'DOCX'
}

export enum TaskType {
  EXTRACT_TEXT = 'EXTRACT_TEXT',
  COMPARE_DOCUMENTS = 'COMPARE_DOCUMENTS',
  GENERATE_EXPORT = 'GENERATE_EXPORT'
}

export enum QueueStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

// Type definitions
export interface NDADocument {
  id: number;
  filename: string;
  original_name: string;
  file_hash: string;
  s3_url: string;
  file_size: number;
  user_id: string;
  status: DocumentStatus;
  is_standard: boolean;
  upload_date: Date;
  extracted_text?: string | null;
  metadata?: Record<string, any> | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface NDAComparison {
  id: number;
  doc1_id: number;
  doc2_id: number;
  user_id: string;
  status: ComparisonStatus;
  result?: Record<string, any> | null;
  created_at: Date;
  updated_at?: Date;
}

export interface NDAExport {
  id: number;
  comparison_id: number;
  user_id: string;
  export_type: ExportType;
  file_path?: string | null;
  status: ComparisonStatus;
  created_at: Date;
}

export interface ProcessingQueueItem {
  id: number;
  task_type: TaskType;
  document_id?: number | null;
  comparison_id?: number | null;
  export_id?: number | null;
  user_id: string;
  status: QueueStatus;
  priority: number;
  attempts: number;
  max_attempts: number;
  error_message?: string | null;
  metadata?: Record<string, any> | null;
  created_at: Date;
  scheduled_at?: Date | null;
  started_at?: Date | null;
  completed_at?: Date | null;
}

export interface KeyDifference {
  section: string;
  type: 'added' | 'removed' | 'modified';
  originalText?: string;
  modifiedText?: string;
  importance: 'high' | 'medium' | 'low';
}

export interface AISuggestion {
  text: string;
  reasoning: string;
  importance: 'high' | 'medium' | 'low';
}

// Request/Response types
export interface DocumentUploadRequest {
  file: File;
  isStandard?: boolean;
}

export interface DocumentUploadResponse {
  document: NDADocument;
  message: string;
}

export interface ComparisonRequest {
  doc1Id: number;
  doc2Id: number;
}

export interface ComparisonResponse {
  comparison: NDAComparison;
  differences: KeyDifference[];
  suggestions: AISuggestion[];
}

export interface ExportRequest {
  comparisonId: number;
  exportType: ExportType;
  includeHighlights?: boolean;
  includeSuggestions?: boolean;
}

export interface ExportResponse {
  export: NDAExport;
  downloadUrl: string;
  expiresAt: Date;
}