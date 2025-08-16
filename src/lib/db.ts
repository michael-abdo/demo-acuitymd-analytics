import mysql from 'mysql2/promise'
import { config } from './config'
import { logError } from './logger'
import { dbLogger } from './pino-logger'

// Create a connection pool using centralized config
const pool = mysql.createPool({
  host: config.MYSQL_HOST,
  port: parseInt(config.MYSQL_PORT),
  user: config.MYSQL_USER,
  password: config.MYSQL_PASSWORD,
  database: config.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
})

// Log connection pool creation (non-sensitive values only)
if (config.MYSQL_HOST && config.MYSQL_DATABASE) {
  dbLogger.connection('created', {
    host: config.MYSQL_HOST,
    port: config.MYSQL_PORT,
    user: config.MYSQL_USER,
    database: config.MYSQL_DATABASE,
    connectionLimit: 10
  });
}

// Helper function to execute queries
export async function executeQuery<T>({ query, values = [] }: { query: string; values?: any[] }): Promise<T> {
  const start = Date.now()
  const operation = query.split(' ')[0].toUpperCase() // Extract operation type
  const table = extractTableName(query)
  
  try {
    let results: any
    
    // Try using query() instead of execute() for some queries
    if (query.includes('LIMIT ?')) {
      // For pagination queries, use connection.query with simple interpolation
      const conn = await pool.getConnection()
      try {
        const [queryResults] = await conn.query(query, values)
        results = queryResults
      } finally {
        conn.release()
      }
    } else {
      const [queryResults] = await pool.execute(query, values)
      results = queryResults
    }
    
    const duration = Date.now() - start
    const rowCount = Array.isArray(results) ? results.length : 
                    results.affectedRows !== undefined ? results.affectedRows : 0
    
    // Log successful database operation (only if enabled)
    dbLogger.query(
      `${operation} ${table}`,
      duration,
      rowCount
    )
    
    return results as T
  } catch (error) {
    // Always log database errors
    if (error instanceof Error) {
      dbLogger.error(error, `${operation} ${table}`)
    }
    
    throw error
  }
}

// Helper function to extract table name from query
function extractTableName(query: string): string {
  const patterns = [
    /FROM\s+`?(\w+)`?/i,
    /INSERT\s+INTO\s+`?(\w+)`?/i,
    /UPDATE\s+`?(\w+)`?/i,
    /DELETE\s+FROM\s+`?(\w+)`?/i
  ]
  
  for (const pattern of patterns) {
    const match = query.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }
  
  return 'unknown'
}

// Helper function to handle binary(1) boolean conversion
export function convertBinaryToBoolean(value: Buffer | null | undefined): boolean {
  if (!value) return false;
  return value[0] === 1;
}

// Export an async function to check the database connection
export async function testDatabaseConnection() {
  const start = Date.now()
  
  try {
    const conn = await pool.getConnection();
    conn.release();
    const duration = Date.now() - start
    
    dbLogger.connection('success', {
      duration,
      message: 'Connected to database'
    })
    
    console.log('Successfully connected to MySQL database');
    return { success: true, message: 'Connected to database' };
  } catch (error) {
    const duration = Date.now() - start
    
    dbLogger.connection('failed', {
      duration,
      errorMessage: error instanceof Error ? error.message : String(error)
    })
    
    if (error instanceof Error) {
      logError(error, {
        type: 'database-connection',
        host: config.MYSQL_HOST,
        database: config.MYSQL_DATABASE
      })
    }
    
    console.error('Failed to connect to MySQL database:', error);
    return { 
      success: false, 
      message: 'Failed to connect to database',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Get a connection from the pool
export async function getConnection() {
  return pool.getConnection();
}

export { pool } 