/**
 * Tag Service
 *
 * Business logic for tag management and document-tag relationships.
 *
 * SECURITY:
 * - All operations are user-scoped (users can only see/modify their own tags)
 * - Document ownership is verified before tag operations
 * - Authorization checks at service layer (not just repository)
 */

import {
  TagRow,
  ITagRepository,
} from '../repositories/interfaces/tag.repository.interface';
import { tagRepository as defaultTagRepository } from '../repositories/tag.repository';
import { documentRepository } from '../repositories/document.repository';
import {
  NotFoundError,
  AuthorizationError,
  ValidationError,
  ConflictError,
} from './errors/service-errors';

export interface TagResponse {
  id: number;
  name: string;
  createdAt: string;
}

export interface DocumentTagsResponse {
  documentId: number;
  tags: TagResponse[];
}

export class TagService {
  private readonly tagRepository: ITagRepository;

  constructor(tagRepository?: ITagRepository) {
    this.tagRepository = tagRepository ?? defaultTagRepository;
  }

  /**
   * Create a new tag for the user
   */
  async createTag(name: string, userId: string): Promise<TagResponse> {
    // Input validation
    if (!name || typeof name !== 'string') {
      throw new ValidationError('Tag name is required', 'name');
    }

    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      throw new ValidationError('Tag name cannot be empty', 'name');
    }
    if (trimmedName.length > 50) {
      throw new ValidationError('Tag name cannot exceed 50 characters', 'name');
    }

    // Check for duplicate
    const existing = await this.tagRepository.getTagByName(trimmedName, userId);
    if (existing) {
      throw new ConflictError(
        `Tag "${trimmedName}" already exists`,
        'tag',
        'name'
      );
    }

    // Create tag
    const result = await this.tagRepository.createTag({
      name: trimmedName,
      user_id: userId,
    });

    const tag = await this.tagRepository.getTagById(result.insertId);
    if (!tag) {
      throw new Error('Failed to retrieve created tag');
    }

    return this.transformTag(tag);
  }

  /**
   * Get all tags for the user
   */
  async getUserTags(userId: string): Promise<TagResponse[]> {
    const tags = await this.tagRepository.getUserTags(userId);
    return tags.map((tag) => this.transformTag(tag));
  }

  /**
   * Delete a tag
   * SECURITY: Only the owner can delete their tags
   */
  async deleteTag(tagId: number, userId: string): Promise<void> {
    const tag = await this.tagRepository.getTagById(tagId);

    if (!tag) {
      throw new NotFoundError('Tag not found', 'tag', tagId);
    }

    if (tag.user_id !== userId) {
      throw new AuthorizationError('Access denied', userId, tagId);
    }

    await this.tagRepository.deleteTag(tagId);
  }

  /**
   * Add a tag to a document
   * SECURITY: Verifies both document and tag belong to user
   */
  async addTagToDocument(
    documentId: number,
    tagId: number,
    userId: string
  ): Promise<DocumentTagsResponse> {
    // Verify document exists and belongs to user
    const document = await documentRepository.getDocumentById(documentId);
    if (!document) {
      throw new NotFoundError('Document not found', 'document', documentId);
    }
    if (document.user_id !== userId) {
      throw new AuthorizationError('Access denied to document', userId, documentId);
    }

    // Verify tag exists and belongs to user
    const tag = await this.tagRepository.getTagById(tagId);
    if (!tag) {
      throw new NotFoundError('Tag not found', 'tag', tagId);
    }
    if (tag.user_id !== userId) {
      throw new AuthorizationError('Access denied to tag', userId, tagId);
    }

    // Add relationship
    await this.tagRepository.addTagToDocument(documentId, tagId);

    // Return updated tags
    return this.getDocumentTags(documentId, userId);
  }

  /**
   * Add tag by name (creates if doesn't exist)
   * Convenience method for frontend
   */
  async addTagToDocumentByName(
    documentId: number,
    tagName: string,
    userId: string
  ): Promise<DocumentTagsResponse> {
    // Verify document exists and belongs to user
    const document = await documentRepository.getDocumentById(documentId);
    if (!document) {
      throw new NotFoundError('Document not found', 'document', documentId);
    }
    if (document.user_id !== userId) {
      throw new AuthorizationError('Access denied to document', userId, documentId);
    }

    // Get or create tag
    let tag = await this.tagRepository.getTagByName(tagName.trim(), userId);
    if (!tag) {
      const result = await this.tagRepository.createTag({
        name: tagName.trim(),
        user_id: userId,
      });
      tag = await this.tagRepository.getTagById(result.insertId);
      if (!tag) {
        throw new Error('Failed to create tag');
      }
    }

    // Add relationship
    await this.tagRepository.addTagToDocument(documentId, tag.id);

    // Return updated tags
    return this.getDocumentTags(documentId, userId);
  }

  /**
   * Remove a tag from a document
   * SECURITY: Verifies document belongs to user
   */
  async removeTagFromDocument(
    documentId: number,
    tagId: number,
    userId: string
  ): Promise<DocumentTagsResponse> {
    // Verify document exists and belongs to user
    const document = await documentRepository.getDocumentById(documentId);
    if (!document) {
      throw new NotFoundError('Document not found', 'document', documentId);
    }
    if (document.user_id !== userId) {
      throw new AuthorizationError('Access denied', userId, documentId);
    }

    // Remove relationship
    await this.tagRepository.removeTagFromDocument(documentId, tagId);

    // Return updated tags
    return this.getDocumentTags(documentId, userId);
  }

  /**
   * Get all tags for a document
   * SECURITY: Verifies document belongs to user
   */
  async getDocumentTags(documentId: number, userId: string): Promise<DocumentTagsResponse> {
    // Verify document exists and belongs to user
    const document = await documentRepository.getDocumentById(documentId);
    if (!document) {
      throw new NotFoundError('Document not found', 'document', documentId);
    }
    if (document.user_id !== userId) {
      throw new AuthorizationError('Access denied', userId, documentId);
    }

    const tags = await this.tagRepository.getDocumentTags(documentId);

    return {
      documentId,
      tags: tags.map((tag) => this.transformTag(tag)),
    };
  }

  /**
   * Transform database row to API response
   */
  private transformTag(tag: TagRow): TagResponse {
    return {
      id: tag.id,
      name: tag.name,
      createdAt: tag.created_at.toISOString(),
    };
  }
}

// Export singleton instance
export const tagService = new TagService();
