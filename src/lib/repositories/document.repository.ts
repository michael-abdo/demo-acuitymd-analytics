/**
 * Document Repository Implementation
 * Implements IDocumentRepository interface with MySQL database operations
 */

import { executeQuery } from '../database/connection';
import { 
  IDocumentRepository, 
  CreateDocumentData, 
  UpdateDocumentData, 
  DocumentRow,
  DocumentQueryOptions,
  PaginatedDocumentsResult
} from './interfaces/document.repository.interface';

export class DocumentRepository implements IDocumentRepository {
  
  // Error handling wrapper for database operations
  private async withErrorHandling<T>(operation: () => Promise<T>, operationName: string): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      console.error(`Repository error in ${operationName}:`, error);
      throw new Error(`Database operation failed: ${operationName}`);
    }
  }

  async createDocument(data: CreateDocumentData): Promise<any> {
    return this.withErrorHandling(async () => {
      const hasStatus = !!data.status;
      const columns = ['filename', 'file_path', 'file_size', 'user_id'];
      const placeholders = ['?', '?', '?', '?'];
      const values: any[] = [data.filename, data.file_path, data.file_size, data.user_id];

      if (hasStatus) {
        columns.push('status');
        placeholders.push('?');
        values.push(data.status);
      }

      // created_at is managed here to preserve parity with legacy behavior
      columns.push('created_at');
      placeholders.push('NOW()');

      const sql = `INSERT INTO documents (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;

      const result = await executeQuery(sql, values);
      return result;
    }, 'createDocument');
  }

  async getUserDocuments(userId: string): Promise<DocumentRow[]> {
    const { documents } = await this.getUserDocumentsWithFilters(userId, {
      page: 1,
      pageSize: 100,
      sortBy: 'created_at',
      sortOrder: 'desc'
    });
    return documents;
  }

  async getDocumentById(id: number): Promise<DocumentRow | null> {
    return this.withErrorHandling(async () => {
      const results = await executeQuery(
        'SELECT * FROM documents WHERE id = ?',
        [id]
      ) as DocumentRow[];
      return Array.isArray(results) && results.length > 0 ? results[0] : null;
    }, 'getDocumentById');
  }

  async updateDocument(id: number, updates: UpdateDocumentData): Promise<any> {
    return this.withErrorHandling(async () => {
      const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
      const values = [...Object.values(updates), id];
      
      return executeQuery(
        `UPDATE documents SET ${setClause}, updated_at = NOW() WHERE id = ?`,
        values
      );
    }, 'updateDocument');
  }

  async deleteDocument(id: number): Promise<any> {
    return this.withErrorHandling(async () => {
      return executeQuery(
        'DELETE FROM documents WHERE id = ?',
        [id]
      );
    }, 'deleteDocument');
  }

  async getUserDocumentsWithFilters(
    userId: string,
    options: DocumentQueryOptions
  ): Promise<PaginatedDocumentsResult> {
    return this.withErrorHandling(async () => {
      const {
        status,
        search,
        page = 1,
        pageSize = 25,
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = options;

      const normalizedPage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
      const normalizedPageSize = Number.isFinite(pageSize) && pageSize > 0 ? Math.floor(pageSize) : 25;
      const offset = (normalizedPage - 1) * normalizedPageSize;

      const conditions: string[] = ['user_id = ?'];
      const args: any[] = [userId];

      if (status) {
        conditions.push('status = ?');
        args.push(status);
      }

      if (search) {
        conditions.push('(filename LIKE ? OR file_path LIKE ?)');
        const likeQuery = `%${search}%`;
        args.push(likeQuery, likeQuery);
      }

      const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const allowedSortColumns = new Set(['created_at', 'filename']);
      const orderColumn = allowedSortColumns.has(sortBy ?? '') ? sortBy : 'created_at';
      const orderDirection = sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      // Note: LIMIT and OFFSET are interpolated directly because mysql2 prepared statements
      // have issues with these as placeholders. Values are already validated integers.
      const documents = await executeQuery(
        `SELECT * FROM documents ${whereClause} ORDER BY ${orderColumn} ${orderDirection} LIMIT ${normalizedPageSize} OFFSET ${offset}`,
        args
      ) as DocumentRow[];

      const countResult = await executeQuery(
        `SELECT COUNT(*) as total FROM documents ${whereClause}`,
        args
      ) as Array<{ total: number }>;

      const total = countResult?.[0]?.total ?? 0;

      return {
        documents,
        total,
        page: normalizedPage,
        pageSize: normalizedPageSize
      };
    }, 'getUserDocumentsWithFilters');
  }
}

// Export a singleton instance for convenience
export const documentRepository = new DocumentRepository();
