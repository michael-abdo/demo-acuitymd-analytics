/**
 * Row Converter Utility
 * 
 * Provides utilities for converting database rows to application objects
 */

import { JsonUtils } from '@/lib/utils';

export interface BaseRow {
  id: number;
  created_at: string | Date;
  updated_at: string | Date;
}

export interface DocumentRow extends BaseRow {
  user_id: string;
  filename: string;
  content_type: string;
  file_size: number;
  file_hash: string;
  storage_path: string;
  extracted_text: string;
  processing_status: string;
  metadata: string | null;
  is_standard: boolean;
}

export interface ComparisonRow extends BaseRow {
  user_id: string;
  document_id: number;
  standard_id: number | null;
  comparison_text: string;
  risk_score: number;
  risk_level: string;
  differences: string;
  metadata: string | null;
}

export interface ExportRow extends BaseRow {
  user_id: string;
  comparison_id: number;
  format: string;
  status: string;
  file_path: string | null;
  metadata: string | null;
}

export interface QueueRow extends BaseRow {
  document_id: number;
  task_type: string;
  priority: number;
  status: string;
  attempts: number;
  max_attempts: number;
  scheduled_at: string | Date | null;
  started_at: string | Date | null;
  completed_at: string | Date | null;
  failed_at: string | Date | null;
  error_message: string | null;
  metadata: string | null;
}

/**
 * Row Converter Class
 */
export class RowConverter {
  /**
   * Convert database row to consistent format
   */
  static convertBaseRow<T extends BaseRow>(row: T): T {
    return {
      ...row,
      created_at: typeof row.created_at === 'string' ? new Date(row.created_at) : row.created_at,
      updated_at: typeof row.updated_at === 'string' ? new Date(row.updated_at) : row.updated_at
    };
  }
  
  /**
   * Convert document row
   */
  static convertDocument(row: DocumentRow) {
    const converted = RowConverter.convertBaseRow(row);
    return {
      ...converted,
      metadata: JsonUtils.parseMetadata(row.metadata),
      file_size: Number(row.file_size),
      is_standard: Boolean(row.is_standard)
    };
  }
  
  /**
   * Convert comparison row
   */
  static convertComparison(row: ComparisonRow) {
    const converted = RowConverter.convertBaseRow(row);
    return {
      ...converted,
      metadata: JsonUtils.parseMetadata(row.metadata),
      differences: JsonUtils.parseMetadata(row.differences),
      risk_score: Number(row.risk_score),
      document_id: Number(row.document_id),
      standard_id: row.standard_id ? Number(row.standard_id) : null
    };
  }
  
  /**
   * Convert export row
   */
  static convertExport(row: ExportRow) {
    const converted = RowConverter.convertBaseRow(row);
    return {
      ...converted,
      metadata: JsonUtils.parseMetadata(row.metadata),
      comparison_id: Number(row.comparison_id)
    };
  }
  
  /**
   * Convert queue row
   */
  static convertQueue(row: QueueRow) {
    const converted = RowConverter.convertBaseRow(row);
    return {
      ...converted,
      metadata: JsonUtils.parseMetadata(row.metadata),
      document_id: Number(row.document_id),
      priority: Number(row.priority),
      attempts: Number(row.attempts),
      max_attempts: Number(row.max_attempts),
      scheduled_at: row.scheduled_at ? (typeof row.scheduled_at === 'string' ? new Date(row.scheduled_at) : row.scheduled_at) : null,
      started_at: row.started_at ? (typeof row.started_at === 'string' ? new Date(row.started_at) : row.started_at) : null,
      completed_at: row.completed_at ? (typeof row.completed_at === 'string' ? new Date(row.completed_at) : row.completed_at) : null,
      failed_at: row.failed_at ? (typeof row.failed_at === 'string' ? new Date(row.failed_at) : row.failed_at) : null
    };
  }
}

/**
 * Common Converters
 */
export const CommonConverters = {
  /**
   * Document converter
   */
  document: RowConverter.convertDocument,
  
  /**
   * Comparison converter  
   */
  comparison: RowConverter.convertComparison,
  
  /**
   * Export converter
   */
  export: RowConverter.convertExport,
  
  /**
   * Queue item converter
   */
  queueItem: RowConverter.convertQueue,
  
  /**
   * Generic row converter with metadata parsing
   */
  withMetadata: <T extends BaseRow & { metadata?: string | null }>(row: T) => {
    const converted = RowConverter.convertBaseRow(row);
    return {
      ...converted,
      metadata: JsonUtils.parseMetadata(row.metadata)
    };
  },
  
  /**
   * Convert array of rows
   */
  array: <T extends BaseRow>(rows: T[], converter: (row: T) => any) => {
    return rows.map(converter);
  }
};

/**
 * Row converter instance
 */
export const rowConverter = RowConverter;