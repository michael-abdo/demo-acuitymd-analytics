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
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`Repository error in ${operationName}:`, error);

      // Provide beginner-friendly error messages based on the error type
      let helpMessage = `Database error during "${operationName}".\n`;

      if (errorMsg.includes('ECONNREFUSED')) {
        helpMessage += 'MySQL server is not running. Start it with: brew services start mysql (macOS) or sudo systemctl start mysql (Linux)';
      } else if (errorMsg.includes("doesn't exist") || errorMsg.includes('Unknown table')) {
        helpMessage += 'Database table is missing. Run: npm run db:setup';
      } else if (errorMsg.includes('Duplicate entry')) {
        helpMessage += 'A document with this data already exists.';
      } else if (errorMsg.includes('Data too long')) {
        helpMessage += 'Input data exceeds maximum length. Filename must be under 255 characters.';
      } else if (errorMsg.includes('Access denied')) {
        helpMessage += 'Database credentials are incorrect. Check DATABASE_URL in .env';
      } else {
        helpMessage += `Technical details: ${errorMsg}`;
      }

      throw new Error(helpMessage);
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

      // SECURITY: Explicit integer sanitization with bounds to prevent SQL injection
      const MAX_PAGE_SIZE = 100;
      const normalizedPage = Math.max(1, Math.floor(Math.abs(Number(page) || 1)));
      const normalizedPageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(Math.abs(Number(pageSize) || 25))));
      const offset = Math.max(0, (normalizedPage - 1) * normalizedPageSize);

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

      // SECURITY: LIMIT and OFFSET are interpolated because mysql2 has issues with placeholders.
      // Values are sanitized above: bounded integers only (page 1+, pageSize 1-100, offset 0+).
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
