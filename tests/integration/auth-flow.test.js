/**
 * Authentication Flow Test (Fail Fast)
 */

async function testAuthFlow() {
  console.log('🔐 Testing authentication configuration...');
  
  const requiredEnvs = [
    'NEXTAUTH_SECRET', 
    'NEXTAUTH_URL',
    'AZURE_AD_CLIENT_ID', 
    'AZURE_AD_CLIENT_SECRET', 
    'AZURE_AD_TENANT_ID'
  ];
  
  for (const env of requiredEnvs) {
    if (!process.env[env]) {
      console.error(`❌ FATAL: ${env} not configured`);
      process.exit(1);
    }
  }
  
  // Validate format
  if (process.env.NEXTAUTH_SECRET.length < 32) {
    console.error('❌ FATAL: NEXTAUTH_SECRET too short (minimum 32 characters)');
    console.error('💡 Generate with: openssl rand -base64 32');
    process.exit(1);
  }
  
  try {
    new URL(process.env.NEXTAUTH_URL);
    console.log('✅ NEXTAUTH_URL format valid');
  } catch {
    console.error('❌ FATAL: Invalid NEXTAUTH_URL format');
    process.exit(1);
  }
  
  // Basic Azure AD config validation
  if (process.env.AZURE_AD_CLIENT_ID.length < 32) {
    console.error('❌ FATAL: AZURE_AD_CLIENT_ID appears invalid');
    process.exit(1);
  }
  
  console.log('✅ Azure AD configuration appears valid');
  console.log('✅ Authentication flow test passed');
}

// Run test if called directly
if (require.main === module) {
  testAuthFlow();
}

module.exports = { testAuthFlow };