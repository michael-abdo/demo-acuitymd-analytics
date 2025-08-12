/**
 * Standalone Database Connection Test
 * Tests MySQL connection without the full Next.js app
 */

const mysql = require('mysql2/promise');

async function testDatabaseConnection() {
  console.log('🧪 Testing Database Connection...\n');
  
  // Show current environment
  console.log('📋 Environment Variables:');
  console.log(`MYSQL_HOST: ${process.env.MYSQL_HOST || 'not set'}`);
  console.log(`MYSQL_PORT: ${process.env.MYSQL_PORT || 'not set (default: 3306)'}`);
  console.log(`MYSQL_USER: ${process.env.MYSQL_USER || 'not set'}`);
  console.log(`MYSQL_PASSWORD: ${process.env.MYSQL_PASSWORD ? '***set***' : 'not set'}`);
  console.log(`MYSQL_DATABASE: ${process.env.MYSQL_DATABASE || 'not set'}\n`);
  
  // Check if database variables are configured
  const hasDbConfig = !!(
    process.env.MYSQL_HOST && 
    process.env.MYSQL_USER && 
    process.env.MYSQL_PASSWORD && 
    process.env.MYSQL_DATABASE
  );

  if (!hasDbConfig) {
    console.log('⚠️  Database not configured - using default in-memory storage');
    console.log('📝 To test with MySQL, set these environment variables:');
    console.log('   MYSQL_HOST=your-mysql-host');
    console.log('   MYSQL_USER=your-username');
    console.log('   MYSQL_PASSWORD=your-password');
    console.log('   MYSQL_DATABASE=vvg_template');
    console.log('\n✅ Application will work with in-memory storage for now');
    return { success: false, reason: 'not_configured' };
  }

  // Try connecting to MySQL
  console.log('🔌 Attempting MySQL connection...');
  
  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE
    });

    console.log('✅ MySQL connection successful!');
    
    // Test a simple query
    console.log('📊 Testing database query...');
    const [rows] = await connection.execute('SELECT 1 as test, NOW() as current_time');
    console.log('✅ Query successful:', rows[0]);
    
    // Check if tables exist
    console.log('\n🔍 Checking for existing tables...');
    const [tables] = await connection.execute('SHOW TABLES');
    
    if (tables.length === 0) {
      console.log('📝 No tables found - database is empty');
      console.log('💡 Run "npm run db:migrate" to create tables');
    } else {
      console.log(`📊 Found ${tables.length} tables:`);
      tables.forEach((table, index) => {
        const tableName = Object.values(table)[0];
        console.log(`   ${index + 1}. ${tableName}`);
      });
    }
    
    await connection.end();
    console.log('\n🎉 Database test completed successfully!');
    return { success: true, tables: tables.length };
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('\n🔧 Common solutions:');
    console.log('1. Check if MySQL server is running');
    console.log('2. Verify host, port, username, and password');
    console.log('3. Ensure database exists: CREATE DATABASE vvg_template;');
    console.log('4. Check network connectivity and firewall settings');
    return { success: false, reason: 'connection_failed', error: error.message };
  }
}

// Export for use in other tests
module.exports = { testDatabaseConnection };

// Run the test if called directly
if (require.main === module) {
  testDatabaseConnection().catch(console.error);
}