/**
 * Document Repository Implementation
 * Implements IDocumentRepository interface with MySQL database operations
 */

import { executeQuery } from '../database/connection';
import { 
  IDocumentRepository, 
  CreateDocumentData, 
  UpdateDocumentData, 
  DocumentRow 
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
      const result = await executeQuery(
        'INSERT INTO documents (filename, file_path, file_size, user_id, created_at) VALUES (?, ?, ?, ?, NOW())',
        [data.filename, data.file_path, data.file_size, data.user_id]
      );
      return result;
    }, 'createDocument');
  }

  async getUserDocuments(userId: string): Promise<DocumentRow[]> {
    return this.withErrorHandling(async () => {
      return executeQuery(
        'SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC',
        [userId]
      ) as Promise<DocumentRow[]>;
    }, 'getUserDocuments');
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
}

// Export a singleton instance for convenience
export const documentRepository = new DocumentRepository();