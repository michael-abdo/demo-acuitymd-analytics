/**
 * Document Repository Implementation
 * 
 * Extends BaseRepository with document-specific operations.
 * Consolidates ~150 lines of document-specific database code.
 */

import { BaseRepository } from './base';
import { NDADocument, DocumentStatus } from '@/types/nda';
import { NDADocumentRow } from '../types';

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
    metadata: row.metadata ? JSON.parse(row.metadata) : null
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
    if (HAS_DB_ACCESS) {
      const rows = await this.executeCustomQuery<NDADocumentRow[]>(
        'SELECT * FROM nda_documents WHERE file_hash = ?',
        [hash],
        'findByHash'
      );
      return rows.length > 0 ? rowToDocument(rows[0]) : null;
    } else {
      // In-memory search
      for (const doc of this.config.memoryStore.values()) {
        if ((doc as NDADocument).file_hash === hash) return doc as NDADocument;
      }
      return null;
    }
  }
  
  /**
   * Get the standard document for a user
   */
  async getStandardDocument(userId: string): Promise<NDADocument | null> {
    if (HAS_DB_ACCESS) {
      const rows = await this.executeCustomQuery<NDADocumentRow[]>(
        'SELECT * FROM nda_documents WHERE user_id = ? AND is_standard = TRUE LIMIT 1',
        [userId],
        'getStandardDocument',
        userId
      );
      return rows.length > 0 ? rowToDocument(rows[0]) : null;
    } else {
      // In-memory search
      for (const doc of this.config.memoryStore.values()) {
        if ((doc as NDADocument).user_id === userId && (doc as NDADocument).is_standard) return doc as NDADocument;
      }
      return null;
    }
  }
  
  /**
   * Find documents by status
   */
  async findByStatus(status: DocumentStatus, userId?: string): Promise<NDADocument[]> {
    if (HAS_DB_ACCESS) {
      let query = 'SELECT * FROM nda_documents WHERE status = ?';
      const values: any[] = [status];
      
      if (userId) {
        query += ' AND user_id = ?';
        values.push(userId);
      }
      
      const rows = await this.executeCustomQuery<NDADocumentRow[]>(
        query,
        values,
        'findByStatus',
        userId
      );
      return rows.map(rowToDocument);
    } else {
      // In-memory filter
      let documents = Array.from(this.config.memoryStore.values())
        .filter(doc => (doc as NDADocument).status === status) as NDADocument[];
      
      if (userId) {
        documents = documents.filter(doc => doc.user_id === userId);
      }
      
      return documents;
    }
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