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

// SECURITY: Whitelist of allowed columns for updates to prevent SQL injection
const ALLOWED_UPDATE_COLUMNS = new Set(['filename', 'status', 'file_path', 'file_size']);

export async function updateDocument(id: number, updates: Partial<{
  filename: string;
  status: string;
}>) {
  // SECURITY: Filter to only allowed columns
  const safeUpdates = Object.entries(updates).filter(([key]) => ALLOWED_UPDATE_COLUMNS.has(key));

  if (safeUpdates.length === 0) {
    const providedFields = Object.keys(updates).join(', ') || 'none';
    throw new Error(
      `No valid update fields provided.\n` +
      `Allowed fields: ${Array.from(ALLOWED_UPDATE_COLUMNS).join(', ')}\n` +
      `You provided: ${providedFields}`
    );
  }

  const setClause = safeUpdates.map(([key]) => `${key} = ?`).join(', ');
  const values = [...safeUpdates.map(([, value]) => value), id];

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