/**
 * Database Connection Test (Fail Fast)
 */

const mysql = require('mysql2/promise');

async function testDatabaseConnection() {
  console.log('📊 Testing database connectivity...');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ FATAL: DATABASE_URL not configured');
    process.exit(1);
  }
  
  try {
    const connection = await mysql.createConnection(process.env.DATABASE_URL);
    
    // Test basic query
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('✅ Database query successful:', rows[0]);
    
    // Test documents table
    await connection.execute('SELECT COUNT(*) as count FROM documents');
    console.log('✅ Documents table accessible');
    
    await connection.end();
    console.log('✅ Database connection test passed');
    
  } catch (error) {
    console.error('❌ FATAL: Database connection test failed');
    console.error(`💡 Error: ${error.message}`);
    console.error('💡 Check DATABASE_URL and ensure MySQL is running');
    process.exit(1);
  }
}

// Run test if called directly
if (require.main === module) {
  testDatabaseConnection();
}

module.exports = { testDatabaseConnection };