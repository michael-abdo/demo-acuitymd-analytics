/**
 * Tag Repository Interface
 * Defines data access operations for tags and document-tag relationships
 */

export interface TagRow {
  id: number;
  name: string;
  user_id: string;
  created_at: Date;
}

export interface DocumentTagRow {
  document_id: number;
  tag_id: number;
  created_at: Date;
}

export interface CreateTagData {
  name: string;
  user_id: string;
}

export interface ITagRepository {
  // Tag CRUD
  createTag(data: CreateTagData): Promise<{ insertId: number }>;
  getTagById(id: number): Promise<TagRow | null>;
  getTagByName(name: string, userId: string): Promise<TagRow | null>;
  getUserTags(userId: string): Promise<TagRow[]>;
  deleteTag(id: number): Promise<{ affectedRows: number }>;

  // Document-Tag relationships
  addTagToDocument(documentId: number, tagId: number): Promise<void>;
  removeTagFromDocument(documentId: number, tagId: number): Promise<void>;
  getDocumentTags(documentId: number): Promise<TagRow[]>;
  getDocumentsByTagId(tagId: number, userId: string): Promise<number[]>;
}
