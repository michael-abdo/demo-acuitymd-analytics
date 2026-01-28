/**
 * Database Connection (Fail Fast)
 * MySQL connection only - no fallbacks
 */

import mysql from 'mysql2/promise';
// import { logger } from '../pino-logger';

const pool = mysql.createPool({
  uri: process.env.DATABASE_URL!,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Store globally for safe shutdown
if (typeof global !== 'undefined') {
  (global as any).dbPool = pool;
}

// SECURITY: Only log queries in development to prevent data leakage
const isDev = process.env.NODE_ENV === 'development';
const enableQueryLogging = isDev && process.env.LOG_QUERIES === 'true';

export async function executeQuery(sql: string, params: any[] = []) {
  const queryId = crypto.randomUUID().slice(0, 8);
  const startTime = performance.now();

  // SECURITY: Never log full queries in production (may contain sensitive data)
  if (enableQueryLogging) {
    console.log(`[DB] Query ${queryId}: ${sql.slice(0, 100)}${sql.length > 100 ? '...' : ''}`);
  }

  try {
    const [rows, _fields] = await pool.execute(sql, params);

    const duration = performance.now() - startTime;
    if (enableQueryLogging) {
      console.log(`[DB] Query ${queryId} completed in ${Math.round(duration)}ms`);
    }

    return rows;

  } catch (error) {
    // SECURITY: Log error without full query in production
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (isDev) {
      console.error(`[DB] Query ${queryId} failed: ${sql}`);
      console.error(`[DB] Error: ${errorMessage}`);
    } else {
      console.error(`[DB] Query ${queryId} failed: ${errorMessage}`);
    }

    throw error;
  }
}

export async function testDatabaseConnection() {
  await executeQuery('SELECT 1 as test');
  console.log('Database connectivity test passed');
}

export default pool;