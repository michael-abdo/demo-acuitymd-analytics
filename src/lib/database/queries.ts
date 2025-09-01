/**
 * Database Queries (Fail Fast)
 * Direct SQL queries - no ORM complexity
 */

import { executeQuery } from './connection';

// Document CRUD operations
export async function createDocument(data: {
  filename: string;
  file_path: string;
  file_size: number;
  user_id: string;
}) {
  const result = await executeQuery(
    'INSERT INTO documents (filename, file_path, file_size, user_id, created_at) VALUES (?, ?, ?, ?, NOW())',
    [data.filename, data.file_path, data.file_size, data.user_id]
  );
  return result;
}

export async function getUserDocuments(userId: string) {
  return executeQuery(
    'SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC',
    [userId]
  );
}

export async function getDocumentById(id: number) {
  const results = await executeQuery(
    'SELECT * FROM documents WHERE id = ?',
    [id]
  );
  return Array.isArray(results) ? results[0] : null;
}

export async function updateDocument(id: number, updates: Partial<{
  filename: string;
  status: string;
}>) {
  const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
  const values = [...Object.values(updates), id];
  
  return executeQuery(
    `UPDATE documents SET ${setClause}, updated_at = NOW() WHERE id = ?`,
    values
  );
}

export async function deleteDocument(id: number) {
  return executeQuery(
    'DELETE FROM documents WHERE id = ?',
    [id]
  );
}