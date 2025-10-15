/**
 * Minimal Redis Connection
 * Single Redis client for cache operations
 */

import Redis from 'ioredis';

// Single Redis instance for everything
let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    redis = new Redis(redisUrl, {
      // Minimal config
      maxRetriesPerRequest: 3,
      // Fail gracefully if Redis is down
      lazyConnect: true,
    });

    redis.on('error', (err) => {
      console.error('Redis connection error:', err.message);
      // Don't crash app if Redis fails
    });
  }
  
  return redis;
}

// Graceful shutdown
export async function closeRedis() {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}
