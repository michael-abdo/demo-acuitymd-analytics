import mysql from 'mysql2/promise'

// Create a connection pool
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
})

// Log connection pool creation
console.log('MySQL connection pool created with config:', {
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  database: process.env.MYSQL_DATABASE,
  connectionLimit: 10
});

// Helper function to execute queries
export async function executeQuery<T>({ query, values = [] }: { query: string; values?: any[] }): Promise<T> {
  try {
    // For troubleshooting, log the query and values
    console.log("Executing query:", query)
    console.log("With values:", values)
    
    // Try using query() instead of execute() for some queries
    if (query.includes('LIMIT ?')) {
      // For pagination queries, use connection.query with simple interpolation
      const conn = await pool.getConnection()
      try {
        const [results] = await conn.query(query, values)
        console.log("Query executed successfully:", {
          rowCount: Array.isArray(results) ? results.length : 'unknown'
        });
        return results as T
      } finally {
        conn.release()
      }
    } else {
      const [results] = await pool.execute(query, values)
      console.log("Query executed successfully:", {
        rowCount: Array.isArray(results) ? results.length : 'unknown'
      });
      return results as T
    }
  } catch (error) {
    console.error('Database query error:', error)
    // Log more details about the error
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    throw error
  }
}

// Helper function to handle binary(1) boolean conversion
export function convertBinaryToBoolean(value: Buffer | null | undefined): boolean {
  if (!value) return false;
  return value[0] === 1;
}

// Export an async function to check the database connection
export async function testDatabaseConnection() {
  try {
    const conn = await pool.getConnection();
    conn.release();
    console.log('Successfully connected to MySQL database');
    return { success: true, message: 'Connected to database' };
  } catch (error) {
    console.error('Failed to connect to MySQL database:', error);
    return { 
      success: false, 
      message: 'Failed to connect to database',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export { pool } 