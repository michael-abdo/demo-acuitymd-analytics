/**
 * Database Abstraction Layer
 * 
 * This module provides a database abstraction that can work with both
 * in-memory storage (for development without DB access) and MySQL.
 * This allows seamless transition when database access is granted.
 */

import { executeQuery } from '@/lib/db';
import { 
  NDADocument, 
  NDAComparison, 
  NDAExport, 
  ProcessingQueueItem,
  DocumentStatus,
  ComparisonStatus,
  ExportType,
  TaskType,
  QueueStatus
} from '@/types/nda';
import {
  NDADocumentRow,
  NDAComparisonRow,
  NDAExportRow,
  ProcessingQueueRow,
  InsertResult,
  UpdateResult,
  DeleteResult,
  QueryOptions
} from './types';

// Check if we have database access
const HAS_DB_ACCESS = process.env.DB_CREATE_ACCESS === 'true';

// In-memory storage for development
// Use global to persist across hot reloads in development
declare global {
  var _ndaMemoryStore: {
    documents: Map<number, NDADocument>;
    comparisons: Map<number, NDAComparison>;
    exports: Map<number, NDAExport>;
    queue: Map<number, ProcessingQueueItem>;
    nextId: {
      documents: number;
      comparisons: number;
      exports: number;
      queue: number;
    };
  } | undefined;
}

// Initialize or reuse existing store
if (!global._ndaMemoryStore) {
  global._ndaMemoryStore = {
    documents: new Map<number, NDADocument>(),
    comparisons: new Map<number, NDAComparison>(),
    exports: new Map<number, NDAExport>(),
    queue: new Map<number, ProcessingQueueItem>(),
    nextId: {
      documents: 1,
      comparisons: 1,
      exports: 1,
      queue: 1
    }
  };
}

// Always use the global store
const memoryStore = global._ndaMemoryStore;

/**
 * Convert database row to domain model
 */
function rowToDocument(row: NDADocumentRow): NDADocument {
  return {
    ...row,
    file_size: Number(row.file_size),
    metadata: row.metadata ? JSON.parse(row.metadata) : null
  };
}

function rowToComparison(row: NDAComparisonRow): NDAComparison {
  return {
    ...row,
    similarity_score: row.similarity_score ? parseFloat(row.similarity_score) : null,
    key_differences: row.key_differences ? JSON.parse(row.key_differences) : null,
    ai_suggestions: row.ai_suggestions ? JSON.parse(row.ai_suggestions) : null
  };
}

function rowToExport(row: NDAExportRow): NDAExport {
  return {
    ...row,
    file_size: Number(row.file_size),
    metadata: row.metadata ? JSON.parse(row.metadata) : null
  };
}

function rowToQueueItem(row: ProcessingQueueRow): ProcessingQueueItem {
  return {
    ...row,
    result: row.result ? JSON.parse(row.result) : null
  };
}

/**
 * Wraps database operations with consistent error handling
 */
async function withDbErrorHandling<T>(
  operation: () => Promise<T>,
  errorMessage: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.error(errorMessage, error);
    throw new Error(errorMessage);
  }
}

/**
 * Database operations for NDA Documents
 */
export const documentDb = {
  async create(data: Omit<NDADocument, 'id' | 'created_at' | 'updated_at'>): Promise<NDADocument> {
    if (HAS_DB_ACCESS) {
      const result = await executeQuery<InsertResult>({
        query: `
          INSERT INTO nda_documents (
            filename, original_name, file_hash, s3_url, file_size,
            user_id, status, extracted_text, is_standard, metadata
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        values: [
          data.filename,
          data.original_name,
          data.file_hash,
          data.s3_url,
          data.file_size,
          data.user_id,
          data.status,
          data.extracted_text || null,
          data.is_standard,
          data.metadata ? JSON.stringify(data.metadata) : null
        ]
      });
      
      const created = await this.findById(result.insertId);
      if (!created) {
        throw new Error('Failed to retrieve created record');
      }
      return created;
    } else {
      // In-memory implementation
      const id = memoryStore.nextId.documents++;
      const now = new Date();
      const document: NDADocument = {
        ...data,
        id,
        created_at: now,
        updated_at: now
      };
      memoryStore.documents.set(id, document);
      return document;
    }
  },

  async findById(id: number): Promise<NDADocument | null> {
    if (HAS_DB_ACCESS) {
      const rows = await executeQuery<NDADocumentRow[]>({
        query: 'SELECT * FROM nda_documents WHERE id = ?',
        values: [id]
      });
      return rows.length > 0 ? rowToDocument(rows[0]) : null;
    } else {
      return memoryStore.documents.get(id) || null;
    }
  },

  async findByHash(hash: string): Promise<NDADocument | null> {
    if (HAS_DB_ACCESS) {
      const rows = await executeQuery<NDADocumentRow[]>({
        query: 'SELECT * FROM nda_documents WHERE file_hash = ?',
        values: [hash]
      });
      return rows.length > 0 ? rowToDocument(rows[0]) : null;
    } else {
      for (const doc of memoryStore.documents.values()) {
        if (doc.file_hash === hash) return doc;
      }
      return null;
    }
  },

  async findByUser(userId: string, options?: QueryOptions): Promise<NDADocument[]> {
    if (HAS_DB_ACCESS) {
      let query = 'SELECT * FROM nda_documents WHERE user_id = ?';
      const values: any[] = [userId];
      
      if (options?.orderBy) {
        query += ' ORDER BY ' + options.orderBy
          .map(o => `${o.column} ${o.order}`)
          .join(', ');
      }
      
      if (options?.limit) {
        query += ' LIMIT ?';
        values.push(options.limit);
        if (options.offset) {
          query += ' OFFSET ?';
          values.push(options.offset);
        }
      }
      
      const rows = await executeQuery<NDADocumentRow[]>({ query, values });
      return rows.map(rowToDocument);
    } else {
      let documents = Array.from(memoryStore.documents.values())
        .filter(doc => doc.user_id === userId);
      
      if (options?.orderBy) {
        // Simple in-memory sorting
        documents.sort((a, b) => {
          const order = options.orderBy![0];
          const aVal = (a as any)[order.column];
          const bVal = (b as any)[order.column];
          return order.order === 'ASC' ? 
            (aVal > bVal ? 1 : -1) : 
            (aVal < bVal ? 1 : -1);
        });
      }
      
      if (options?.limit) {
        const start = options.offset || 0;
        documents = documents.slice(start, start + options.limit);
      }
      
      return documents;
    }
  },

  async update(id: number, data: Partial<NDADocument>): Promise<boolean> {
    if (HAS_DB_ACCESS) {
      const fields = Object.keys(data).filter(k => k !== 'id');
      const values = fields.map(k => {
        const val = (data as any)[k];
        return (k === 'metadata' && val) ? JSON.stringify(val) : val;
      });
      values.push(id);
      
      const query = `
        UPDATE nda_documents 
        SET ${fields.map(f => `${f} = ?`).join(', ')}
        WHERE id = ?
      `;
      
      const result = await executeQuery<UpdateResult>({ query, values });
      return result.affectedRows > 0;
    } else {
      const doc = memoryStore.documents.get(id);
      if (!doc) return false;
      
      Object.assign(doc, data, { updated_at: new Date() });
      return true;
    }
  },

  async delete(id: number): Promise<boolean> {
    if (HAS_DB_ACCESS) {
      const result = await executeQuery<DeleteResult>({
        query: 'DELETE FROM nda_documents WHERE id = ?',
        values: [id]
      });
      return result.affectedRows > 0;
    } else {
      return memoryStore.documents.delete(id);
    }
  },

  async getStandardDocument(userId: string): Promise<NDADocument | null> {
    if (HAS_DB_ACCESS) {
      const rows = await executeQuery<NDADocumentRow[]>({
        query: 'SELECT * FROM nda_documents WHERE user_id = ? AND is_standard = TRUE LIMIT 1',
        values: [userId]
      });
      return rows.length > 0 ? rowToDocument(rows[0]) : null;
    } else {
      for (const doc of memoryStore.documents.values()) {
        if (doc.user_id === userId && doc.is_standard) return doc;
      }
      return null;
    }
  }
};

/**
 * Database operations for NDA Comparisons
 */
export const comparisonDb = {
  async create(data: Omit<NDAComparison, 'id' | 'created_at' | 'updated_at'>): Promise<NDAComparison> {
    if (HAS_DB_ACCESS) {
      const result = await executeQuery<InsertResult>({
        query: `
          INSERT INTO nda_comparisons (
            document1_id, document2_id, comparison_result_s3_url,
            comparison_summary, similarity_score, key_differences,
            ai_suggestions, user_id, status, error_message,
            processing_time_ms
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        values: [
          data.document1_id,
          data.document2_id,
          data.comparison_result_s3_url || null,
          data.comparison_summary || null,
          data.similarity_score || null,
          data.key_differences ? JSON.stringify(data.key_differences) : null,
          data.ai_suggestions ? JSON.stringify(data.ai_suggestions) : null,
          data.user_id,
          data.status,
          data.error_message || null,
          data.processing_time_ms || null
        ]
      });
      
      const created = await this.findById(result.insertId);
      if (!created) {
        throw new Error('Failed to retrieve created record');
      }
      return created;
    } else {
      const id = memoryStore.nextId.comparisons++;
      const now = new Date();
      const comparison: NDAComparison = {
        ...data,
        id,
        created_date: now,
        created_at: now,
        updated_at: now
      };
      memoryStore.comparisons.set(id, comparison);
      return comparison;
    }
  },

  async findById(id: number): Promise<NDAComparison | null> {
    if (HAS_DB_ACCESS) {
      const rows = await executeQuery<NDAComparisonRow[]>({
        query: 'SELECT * FROM nda_comparisons WHERE id = ?',
        values: [id]
      });
      return rows.length > 0 ? rowToComparison(rows[0]) : null;
    } else {
      return memoryStore.comparisons.get(id) || null;
    }
  },

  async findByUser(userId: string, options?: QueryOptions): Promise<NDAComparison[]> {
    if (HAS_DB_ACCESS) {
      let query = 'SELECT * FROM nda_comparisons WHERE user_id = ?';
      const values: any[] = [userId];
      
      if (options?.orderBy) {
        query += ' ORDER BY ' + options.orderBy
          .map(o => `${o.column} ${o.order}`)
          .join(', ');
      } else {
        query += ' ORDER BY created_date DESC';
      }
      
      if (options?.limit) {
        query += ' LIMIT ?';
        values.push(options.limit);
        if (options.offset) {
          query += ' OFFSET ?';
          values.push(options.offset);
        }
      }
      
      const rows = await executeQuery<NDAComparisonRow[]>({ query, values });
      return rows.map(rowToComparison);
    } else {
      let comparisons = Array.from(memoryStore.comparisons.values())
        .filter(comp => comp.user_id === userId);
      
      comparisons.sort((a, b) => 
        b.created_date.getTime() - a.created_date.getTime()
      );
      
      if (options?.limit) {
        const start = options.offset || 0;
        comparisons = comparisons.slice(start, start + options.limit);
      }
      
      return comparisons;
    }
  },

  async update(id: number, data: Partial<NDAComparison>): Promise<boolean> {
    if (HAS_DB_ACCESS) {
      const fields = Object.keys(data).filter(k => k !== 'id');
      const values = fields.map(k => {
        const val = (data as any)[k];
        if (k === 'key_differences' || k === 'ai_suggestions') {
          return val ? JSON.stringify(val) : null;
        }
        return val;
      });
      values.push(id);
      
      const query = `
        UPDATE nda_comparisons 
        SET ${fields.map(f => `${f} = ?`).join(', ')}
        WHERE id = ?
      `;
      
      const result = await executeQuery<UpdateResult>({ query, values });
      return result.affectedRows > 0;
    } else {
      const comp = memoryStore.comparisons.get(id);
      if (!comp) return false;
      
      Object.assign(comp, data, { updated_at: new Date() });
      return true;
    }
  }
};

/**
 * Database operations for Processing Queue
 */
export const queueDb = {
  async enqueue(data: Omit<ProcessingQueueItem, 'id' | 'created_at' | 'updated_at' | 'attempts' | 'status'>): Promise<ProcessingQueueItem> {
    if (HAS_DB_ACCESS) {
      const result = await executeQuery<InsertResult>({
        query: `
          INSERT INTO nda_processing_queue (
            document_id, task_type, priority, status,
            max_attempts, scheduled_at
          ) VALUES (?, ?, ?, ?, ?, ?)
        `,
        values: [
          data.document_id,
          data.task_type,
          data.priority || 5,
          QueueStatus.QUEUED,
          data.max_attempts || 3,
          data.scheduled_at || null
        ]
      });
      
      const created = await this.findById(result.insertId);
      if (!created) {
        throw new Error('Failed to retrieve created record');
      }
      return created;
    } else {
      const id = memoryStore.nextId.queue++;
      const now = new Date();
      const item: ProcessingQueueItem = {
        ...data,
        id,
        status: QueueStatus.QUEUED,
        attempts: 0,
        created_at: now,
        updated_at: now
      };
      memoryStore.queue.set(id, item);
      return item;
    }
  },

  async findById(id: number): Promise<ProcessingQueueItem | null> {
    if (HAS_DB_ACCESS) {
      const rows = await executeQuery<ProcessingQueueRow[]>({
        query: 'SELECT * FROM nda_processing_queue WHERE id = ?',
        values: [id]
      });
      return rows.length > 0 ? rowToQueueItem(rows[0]) : null;
    } else {
      return memoryStore.queue.get(id) || null;
    }
  },

  async getNext(): Promise<ProcessingQueueItem | null> {
    if (HAS_DB_ACCESS) {
      const rows = await executeQuery<ProcessingQueueRow[]>({
        query: `
          SELECT * FROM nda_processing_queue 
          WHERE status = ? 
          AND (scheduled_at IS NULL OR scheduled_at <= NOW())
          ORDER BY priority ASC, created_at ASC
          LIMIT 1
        `,
        values: [QueueStatus.QUEUED]
      });
      return rows.length > 0 ? rowToQueueItem(rows[0]) : null;
    } else {
      const now = new Date();
      let nextItem: ProcessingQueueItem | null = null;
      let lowestPriority = Infinity;
      
      for (const item of memoryStore.queue.values()) {
        if (item.status === QueueStatus.QUEUED &&
            (!item.scheduled_at || item.scheduled_at <= now) &&
            item.priority < lowestPriority) {
          nextItem = item;
          lowestPriority = item.priority;
        }
      }
      
      return nextItem;
    }
  }
};

/**
 * Initialize database tables (only if we have CREATE access)
 */
export async function initializeDatabase(): Promise<void> {
  if (!HAS_DB_ACCESS) {
    console.log('Running in memory-only mode (no database CREATE access)');
    return;
  }
  
  try {
    // Read and execute migration SQL
    const fs = await import('fs/promises');
    const path = await import('path');
    const migrationPath = path.join(process.cwd(), 'database/migrations/001_create_nda_tables.sql');
    const sql = await fs.readFile(migrationPath, 'utf-8');
    
    // Split by semicolon and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      await executeQuery({ query: statement });
    }
    
    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}