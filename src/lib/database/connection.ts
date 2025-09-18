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

export async function executeQuery(sql: string, params: any[] = []) {
  const queryId = crypto.randomUUID();
  const startTime = performance.now();
  
  console.log(`Executing query ${queryId}: ${sql}`);
  
  try {
    const [rows, _fields] = await pool.execute(sql, params);
    
    const duration = performance.now() - startTime;
    console.log(`Query ${queryId} completed in ${Math.round(duration)}ms`);
    
    return rows;
    
  } catch (error) {
    console.error('❌ FATAL: Database operation failed');
    console.error(`💡 Query: ${sql}`);
    console.error(`💡 Error: ${error instanceof Error ? error.message : String(error)}`);
    console.error('💡 Check database connection and query syntax');
    
    // No fallback - exit immediately
    process.exit(1);
  }
}

export async function testDatabaseConnection() {
  await executeQuery('SELECT 1 as test');
  console.log('Database connectivity test passed');
}

export default pool;