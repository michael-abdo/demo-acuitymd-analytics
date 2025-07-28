/**
 * Document Repository Implementation
 * 
 * Extends BaseRepository with document-specific operations.
 * Consolidates ~150 lines of document-specific database code.
 */

import { BaseRepository } from './base';
import { TemplateDocument, DocumentStatus } from '@/types/template';
import { TemplateDocumentRow } from '../types';
import { JsonUtils } from '@/lib/utils';

// Access config DB_CREATE_ACCESS
const HAS_DB_ACCESS = (global as any)._templateMemoryStore ? false : true;

// Access to in-memory store
declare global {
  // eslint-disable-next-line no-var
  var _templateMemoryStore: {
    documents: Map<number, TemplateDocument>;
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
function rowToDocument(row: TemplateDocumentRow): TemplateDocument {
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
  findByHash(hash: string): Promise<TemplateDocument | null>;
  getStandardDocument(userId: string): Promise<TemplateDocument | null>;
  findByStatus(status: DocumentStatus, userId?: string): Promise<TemplateDocument[]>;
}

/**
 * Document repository implementation
 */
export class DocumentRepository 
  extends BaseRepository<
    TemplateDocument,
    TemplateDocumentRow,
    Omit<TemplateDocument, 'id' | 'created_at' | 'updated_at'>
  > 
  implements IDocumentRepository {
  
  constructor() {
    // Initialize memory store if not exists
    if (!global._templateMemoryStore) {
      global._templateMemoryStore = {
        documents: new Map<number, TemplateDocument>(),
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
      tableName: 'template_documents',
      entityName: 'document',
      rowConverter: rowToDocument,
      memoryStore: global._templateMemoryStore.documents,
      nextId: () => global._templateMemoryStore!.nextId.documents++
    });
  }
  
  /**
   * Find document by file hash
   */
  async findByHash(hash: string): Promise<TemplateDocument | null> {
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
  async getStandardDocument(userId: string): Promise<TemplateDocument | null> {
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
  async findByStatus(status: DocumentStatus, userId?: string): Promise<TemplateDocument[]> {
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
  async create(data: Omit<TemplateDocument, 'id' | 'created_at' | 'updated_at'>): Promise<TemplateDocument> {
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