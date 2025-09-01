/**
 * Production Ready Test (Fail Fast)
 */

const { testDatabaseConnection } = require('../integration/database-connection.test.js');
const { testS3Access } = require('../integration/s3-access.test.js');
const { testAuthFlow } = require('../integration/auth-flow.test.js');

async function testProductionReadiness() {
  console.log('🚀 Testing production readiness (Fail Fast Mode)');
  
  try {
    // Test all critical systems
    await testAuthFlow();
    await testDatabaseConnection();  
    await testS3Access();
    
    // Test Redis if configured
    if (process.env.REDIS_URL) {
      console.log('🔴 Testing Redis connectivity...');
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      
      try {
        await execAsync('npm run test:redis');
        console.log('✅ Redis connectivity test passed');
      } catch (error) {
        console.error('❌ FATAL: Redis test failed');
        console.error(`💡 Error: ${error.message}`);
        process.exit(1);
      }
    }
    
    // Test PM2 configuration exists
    const fs = require('fs');
    if (!fs.existsSync('ecosystem.config.js')) {
      console.error('❌ FATAL: ecosystem.config.js missing');
      console.error('💡 PM2 configuration required for production');
      process.exit(1);
    }
    console.log('✅ PM2 configuration found');
    
    console.log('🎉 All production readiness tests passed!');
    console.log('✅ System is ready for deployment');
    
  } catch (error) {
    console.error('❌ FATAL: Production readiness test failed');
    console.error(`💡 Error: ${error.message}`);
    process.exit(1);
  }
}

// Run test if called directly
if (require.main === module) {
  testProductionReadiness();
}

module.exports = { testProductionReadiness };