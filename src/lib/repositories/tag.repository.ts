/**
 * Tag Repository Implementation
 *
 * Demonstrates:
 * - Many-to-many relationships (documents <-> tags)
 * - Foreign key constraints with cascading deletes
 * - User-scoped data access
 * - Parameterized queries (SQL injection prevention)
 */

import { executeQuery } from '../database/connection';
import {
  ITagRepository,
  TagRow,
  CreateTagData,
} from './interfaces/tag.repository.interface';

export class TagRepository implements ITagRepository {
  /**
   * Create a new tag for a user
   * SECURITY: Parameterized query prevents SQL injection
   */
  async createTag(data: CreateTagData): Promise<{ insertId: number }> {
    const result = (await executeQuery(
      'INSERT INTO tags (name, user_id) VALUES (?, ?)',
      [data.name, data.user_id]
    )) as { insertId: number };

    return { insertId: result.insertId };
  }

  /**
   * Get a tag by ID
   */
  async getTagById(id: number): Promise<TagRow | null> {
    const results = (await executeQuery('SELECT * FROM tags WHERE id = ?', [id])) as TagRow[];
    return Array.isArray(results) && results.length > 0 ? results[0] : null;
  }

  /**
   * Get a tag by name for a specific user
   * Tags are user-scoped (same name can exist for different users)
   */
  async getTagByName(name: string, userId: string): Promise<TagRow | null> {
    const results = (await executeQuery(
      'SELECT * FROM tags WHERE name = ? AND user_id = ?',
      [name, userId]
    )) as TagRow[];
    return Array.isArray(results) && results.length > 0 ? results[0] : null;
  }

  /**
   * Get all tags for a user
   */
  async getUserTags(userId: string): Promise<TagRow[]> {
    const results = (await executeQuery(
      'SELECT * FROM tags WHERE user_id = ? ORDER BY name ASC',
      [userId]
    )) as TagRow[];
    return Array.isArray(results) ? results : [];
  }

  /**
   * Delete a tag
   * SECURITY: Cascading delete in schema removes document_tags entries
   */
  async deleteTag(id: number): Promise<{ affectedRows: number }> {
    const result = (await executeQuery('DELETE FROM tags WHERE id = ?', [id])) as {
      affectedRows: number;
    };
    return { affectedRows: result?.affectedRows ?? 0 };
  }

  /**
   * Add a tag to a document (create relationship)
   * SECURITY: Uses INSERT IGNORE to handle duplicate gracefully
   */
  async addTagToDocument(documentId: number, tagId: number): Promise<void> {
    await executeQuery(
      'INSERT IGNORE INTO document_tags (document_id, tag_id) VALUES (?, ?)',
      [documentId, tagId]
    );
  }

  /**
   * Remove a tag from a document
   */
  async removeTagFromDocument(documentId: number, tagId: number): Promise<void> {
    await executeQuery(
      'DELETE FROM document_tags WHERE document_id = ? AND tag_id = ?',
      [documentId, tagId]
    );
  }

  /**
   * Get all tags for a document
   * SECURITY: JOIN ensures we only return tags, not document data
   */
  async getDocumentTags(documentId: number): Promise<TagRow[]> {
    const results = (await executeQuery(
      `SELECT t.* FROM tags t
       INNER JOIN document_tags dt ON t.id = dt.tag_id
       WHERE dt.document_id = ?
       ORDER BY t.name ASC`,
      [documentId]
    )) as TagRow[];
    return Array.isArray(results) ? results : [];
  }

  /**
   * Get all document IDs that have a specific tag
   * SECURITY: Filters by user_id to ensure data isolation
   */
  async getDocumentsByTagId(tagId: number, userId: string): Promise<number[]> {
    const results = (await executeQuery(
      `SELECT dt.document_id FROM document_tags dt
       INNER JOIN documents d ON dt.document_id = d.id
       WHERE dt.tag_id = ? AND d.user_id = ?`,
      [tagId, userId]
    )) as Array<{ document_id: number }>;

    return Array.isArray(results) ? results.map((r) => r.document_id) : [];
  }
}

// Export singleton instance
export const tagRepository = new TagRepository();
