/**
 * Document Repository Implementation
 * 
 * Extends BaseRepository with document-specific operations.
 * Consolidates ~150 lines of document-specific database code.
 */

import { BaseRepository } from './base';
import { NDADocument, DocumentStatus } from '@/types/nda';
import { NDADocumentRow } from '../types';
import { JsonUtils } from '@/lib/utils';

// Access config DB_CREATE_ACCESS
const HAS_DB_ACCESS = (global as any)._ndaMemoryStore ? false : true;

// Access to in-memory store
declare global {
  var _ndaMemoryStore: {
    documents: Map<number, NDADocument>;
    comparisons: Map<number, any>;
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
function rowToDocument(row: NDADocumentRow): NDADocument {
  return {
    ...row,
    file_size: Number(row.file_size),
    metadata: JsonUtils.safeParse(row.metadata, null)
  };
}

/**
 * Document-specific repository interface
 */
export interface IDocumentRepository {
  findByHash(hash: string): Promise<NDADocument | null>;
  getStandardDocument(userId: string): Promise<NDADocument | null>;
  findByStatus(status: DocumentStatus, userId?: string): Promise<NDADocument[]>;
}

/**
 * Document repository implementation
 */
export class DocumentRepository 
  extends BaseRepository<
    NDADocument,
    NDADocumentRow,
    Omit<NDADocument, 'id' | 'created_at' | 'updated_at'>
  > 
  implements IDocumentRepository {
  
  constructor() {
    // Initialize memory store if not exists
    if (!global._ndaMemoryStore) {
      global._ndaMemoryStore = {
        documents: new Map<number, NDADocument>(),
        comparisons: new Map<number, any>(),
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
      tableName: 'nda_documents',
      entityName: 'document',
      rowConverter: rowToDocument,
      memoryStore: global._ndaMemoryStore.documents,
      nextId: () => global._ndaMemoryStore!.nextId.documents++
    });
  }
  
  /**
   * Find document by file hash
   */
  async findByHash(hash: string): Promise<NDADocument | null> {
    return this.findByField(
      'file_hash',
      hash,
      (doc) => doc.file_hash === hash,
      'findByHash'
    );
  }
  
  /**
   * Get the standard document for a user
   */
  async getStandardDocument(userId: string): Promise<NDADocument | null> {
    return this.findFirstByField(
      'user_id',
      userId,
      (doc) => doc.user_id === userId && doc.is_standard,
      'getStandardDocument'
    );
  }
  
  /**
   * Find documents by status
   */
  async findByStatus(status: DocumentStatus, userId?: string): Promise<NDADocument[]> {
    const conditions: Record<string, any> = { status };
    if (userId) {
      conditions.user_id = userId;
    }
    
    return this.findByFields(
      conditions,
      (doc) => {
        const matchesStatus = doc.status === status;
        const matchesUser = !userId || doc.user_id === userId;
        return matchesStatus && matchesUser;
      },
      'findByStatus'
    );
  }
  
  /**
   * Override create to handle document-specific fields
   */
  async create(data: Omit<NDADocument, 'id' | 'created_at' | 'updated_at'>): Promise<NDADocument> {
    // Ensure required fields have defaults
    const documentData = {
      ...data,
      status: data.status || DocumentStatus.UPLOADED,
      is_standard: data.is_standard || false,
      extracted_text: data.extracted_text || null,
      metadata: data.metadata || null
    };
    
    return super.create(documentData);
  }
}