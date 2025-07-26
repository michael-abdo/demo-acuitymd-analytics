/**
 * Comparison Repository Implementation
 * 
 * Extends BaseRepository with comparison-specific operations.
 * Consolidates ~150 lines of comparison-specific database code.
 */

import { BaseRepository } from './base';
import { NDAComparisonRow } from '../types';
import { ComparisonStatus } from '@/types/nda';

// Extended comparison type that includes all database fields
export interface NDAComparisonExtended {
  id: number;
  document1_id: number;
  document2_id: number;
  comparison_result_s3_url: string | null;
  comparison_summary: string | null;
  similarity_score: number | null;
  key_differences: any[] | null;
  ai_suggestions: any[] | null;
  created_date: Date;
  user_id: string;
  status: ComparisonStatus;
  error_message: string | null;
  processing_time_ms: number | null;
  created_at?: Date;
  updated_at?: Date;
}

// Access to in-memory store
declare global {
  var _ndaMemoryStore: {
    documents: Map<number, any>;
    comparisons: Map<number, NDAComparisonExtended>;
    exports: Map<number, any>;
    queue: Map<number, any>;
    nextId: {
      documents: number;
      comparisons: number;
      exports: number;
      queue: number;
    };
  } | undefined;
}

/**
 * Convert database row to domain model
 */
function rowToComparison(row: NDAComparisonRow): NDAComparisonExtended {
  return {
    ...row,
    document1_id: row.document1_id,
    document2_id: row.document2_id,
    similarity_score: row.similarity_score ? parseFloat(row.similarity_score) : null,
    key_differences: row.key_differences ? JSON.parse(row.key_differences) : null,
    ai_suggestions: row.ai_suggestions ? JSON.parse(row.ai_suggestions) : null
  };
}

/**
 * Comparison-specific repository interface
 */
export interface IComparisonRepository {
  findByDocuments(doc1Id: number, doc2Id: number): Promise<NDAComparisonExtended | null>;
  findByStatus(status: ComparisonStatus, userId?: string): Promise<NDAComparisonExtended[]>;
  updateStatus(id: number, status: ComparisonStatus, errorMessage?: string): Promise<boolean>;
}

/**
 * Comparison repository implementation
 */
export class ComparisonRepository 
  extends BaseRepository<
    NDAComparisonExtended,
    NDAComparisonRow,
    Omit<NDAComparisonExtended, 'id' | 'created_at' | 'updated_at' | 'created_date'>
  > 
  implements IComparisonRepository {
  
  constructor() {
    // Initialize memory store if not exists
    if (!global._ndaMemoryStore) {
      global._ndaMemoryStore = {
        documents: new Map(),
        comparisons: new Map<number, NDAComparisonExtended>(),
        exports: new Map(),
        queue: new Map(),
        nextId: {
          documents: 1,
          comparisons: 1,
          exports: 1,
          queue: 1
        }
      };
    }
    
    super({
      tableName: 'nda_comparisons',
      entityName: 'comparison',
      rowConverter: rowToComparison,
      memoryStore: global._ndaMemoryStore.comparisons as Map<number, NDAComparisonExtended>,
      nextId: () => global._ndaMemoryStore!.nextId.comparisons++
    });
  }
  
  /**
   * Find comparison by document IDs
   */
  async findByDocuments(doc1Id: number, doc2Id: number): Promise<NDAComparisonExtended | null> {
    const HAS_DB_ACCESS = (global as any)._ndaMemoryStore ? false : true;
    
    if (HAS_DB_ACCESS) {
      const rows = await this.executeCustomQuery<NDAComparisonRow[]>(
        `SELECT * FROM nda_comparisons 
         WHERE (document1_id = ? AND document2_id = ?) 
            OR (document1_id = ? AND document2_id = ?)
         LIMIT 1`,
        [doc1Id, doc2Id, doc2Id, doc1Id],
        'findByDocuments'
      );
      return rows.length > 0 ? rowToComparison(rows[0]) : null;
    } else {
      // In-memory search
      for (const comp of this.config.memoryStore.values()) {
        if ((comp.document1_id === doc1Id && comp.document2_id === doc2Id) ||
            (comp.document1_id === doc2Id && comp.document2_id === doc1Id)) {
          return comp;
        }
      }
      return null;
    }
  }
  
  /**
   * Find comparisons by status
   */
  async findByStatus(status: ComparisonStatus, userId?: string): Promise<NDAComparisonExtended[]> {
    const HAS_DB_ACCESS = (global as any)._ndaMemoryStore ? false : true;
    
    if (HAS_DB_ACCESS) {
      let query = 'SELECT * FROM nda_comparisons WHERE status = ?';
      const values: any[] = [status];
      
      if (userId) {
        query += ' AND user_id = ?';
        values.push(userId);
      }
      
      const rows = await this.executeCustomQuery<NDAComparisonRow[]>(
        query,
        values,
        'findByStatus',
        userId
      );
      return rows.map(rowToComparison);
    } else {
      // In-memory filter
      let comparisons = Array.from(this.config.memoryStore.values())
        .filter(comp => comp.status === status);
      
      if (userId) {
        comparisons = comparisons.filter(comp => comp.user_id === userId);
      }
      
      return comparisons;
    }
  }
  
  /**
   * Update comparison status
   */
  async updateStatus(id: number, status: ComparisonStatus, errorMessage?: string): Promise<boolean> {
    const updateData: Partial<NDAComparisonExtended> = { status };
    if (errorMessage) {
      updateData.error_message = errorMessage;
    }
    
    return this.update(id, updateData);
  }
  
  /**
   * Override create to set default values
   */
  async create(data: Omit<NDAComparisonExtended, 'id' | 'created_at' | 'updated_at' | 'created_date'>): Promise<NDAComparisonExtended> {
    const now = new Date();
    const comparisonData = {
      ...data,
      created_date: now,
      status: data.status || ComparisonStatus.PENDING,
      similarity_score: data.similarity_score || null,
      key_differences: data.key_differences || null,
      ai_suggestions: data.ai_suggestions || null,
      error_message: data.error_message || null,
      processing_time_ms: data.processing_time_ms || null
    };
    
    return super.create(comparisonData);
  }
}