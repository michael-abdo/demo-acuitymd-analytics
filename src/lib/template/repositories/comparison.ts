/**
 * Comparison Repository Implementation (Template Placeholder)
 * 
 * This is a placeholder repository for document comparisons.
 * In the generalized template, this can be used for any type of document comparison.
 */

import { BaseRepository } from './base';
import { TemplateComparison, ComparisonStatus } from '@/types/template';
import { TemplateComparisonRow } from '../types';

/**
 * Convert database row to domain model
 */
function rowToComparison(row: TemplateComparisonRow): TemplateComparison {
  return {
    ...row,
    similarity_score: row.similarity_score ? parseFloat(row.similarity_score) : null,
    key_differences: row.key_differences ? JSON.parse(row.key_differences) : [],
    ai_suggestions: row.ai_suggestions ? JSON.parse(row.ai_suggestions) : []
  };
}

/**
 * Comparison repository implementation
 */
export class ComparisonRepository 
  extends BaseRepository<
    TemplateComparison,
    TemplateComparisonRow,
    Omit<TemplateComparison, 'id' | 'created_at' | 'updated_at'>
  > {
  
  constructor() {
    // Initialize memory store if not exists
    if (!global._templateMemoryStore) {
      global._templateMemoryStore = {
        documents: new Map<number, any>(),
        comparisons: new Map<number, TemplateComparison>(),
        exports: new Map<number, any>(),
        queue: new Map<number, any>(),
        nextId: {
          documents: 1,
          comparisons: 1,
          exports: 1,
          queue: 1
        }
      };
    }
    
    super({
      tableName: 'comparisons', // Generic table name - customize per project
      entityName: 'comparison',
      rowConverter: rowToComparison,
      memoryStore: global._templateMemoryStore.comparisons,
      nextId: () => global._templateMemoryStore!.nextId.comparisons++
    });
  }
  
  /**
   * Find comparisons by status
   */
  async findByStatus(status: ComparisonStatus, userId?: string): Promise<TemplateComparison[]> {
    const conditions: Record<string, any> = { status };
    if (userId) {
      conditions.user_id = userId;
    }
    
    return this.findByFields(
      conditions,
      (comparison) => {
        const matchesStatus = comparison.status === status;
        const matchesUser = !userId || comparison.user_id === userId;
        return matchesStatus && matchesUser;
      },
      'findByStatus'
    );
  }
  
  /**
   * Find comparison by document IDs
   */
  async findByDocuments(doc1Id: number, doc2Id: number, userId?: string): Promise<TemplateComparison | null> {
    return this.findFirstByField(
      'document1_id',
      doc1Id,
      (comparison) => {
        const matchesDocs = (comparison.document1_id === doc1Id && comparison.document2_id === doc2Id) ||
                           (comparison.document1_id === doc2Id && comparison.document2_id === doc1Id);
        const matchesUser = !userId || comparison.user_id === userId;
        return matchesDocs && matchesUser;
      },
      'findByDocuments'
    );
  }
}