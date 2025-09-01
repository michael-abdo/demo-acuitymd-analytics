/**
 * Minimal Caching Layer
 * Simple get/set with fallback if Redis fails
 */

import { getRedis } from './connection';

export const cache = {
  /**
   * Get cached value with automatic fallback
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const redis = getRedis();
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.warn(`Cache get failed for key ${key}:`, error instanceof Error ? error.message : String(error));
      return null; // Fail gracefully
    }
  },

  /**
   * Set cached value with TTL (default 5 minutes)
   */
  async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    try {
      const redis = getRedis();
      await redis.setex(key, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      console.warn(`Cache set failed for key ${key}:`, error instanceof Error ? error.message : String(error));
      // Continue without caching
    }
  },

  /**
   * Cache-or-compute pattern
   */
  async remember<T>(key: string, ttlSeconds: number, compute: () => Promise<T>): Promise<T> {
    // Try cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Compute and cache
    const value = await compute();
    await this.set(key, value, ttlSeconds);
    return value;
  }
};