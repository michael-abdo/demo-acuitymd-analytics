/**
 * Database with Caching
 * Example of minimal cache integration
 */

import { executeQuery } from '@/lib/template/repositories/base';
import { cache } from './redis/cache';

/**
 * Get user documents with caching (5 minutes)
 */
export async function getUserDocuments(userId: string) {
  return cache.remember(
    `documents:user:${userId}`,
    300, // 5 minutes
    async () => {
      console.log('Cache miss - querying database');
      return executeQuery(
        'SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC',
        [userId]
      );
    }
  );
}

/**
 * Get document by ID with caching (10 minutes)
 */
export async function getDocument(id: number) {
  return cache.remember(
    `document:${id}`,
    600, // 10 minutes
    async () => {
      console.log(`Cache miss - querying document ${id}`);
      const results = await executeQuery(
        'SELECT * FROM documents WHERE id = ?',
        [id]
      );
      return results[0] || null;
    }
  );
}

/**
 * Clear cache when document is updated
 */
export async function clearDocumentCache(id: number, userId: string) {
  const { getRedis } = await import('./redis/connection');
  const redis = getRedis();
  
  try {
    // Clear specific document cache
    await redis.del(`document:${id}`);
    // Clear user documents list cache
    await redis.del(`documents:user:${userId}`);
    console.log(`Cache cleared for document ${id} and user ${userId}`);
  } catch (error) {
    console.warn('Failed to clear cache:', error.message);
  }
}