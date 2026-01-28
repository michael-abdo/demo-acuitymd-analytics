/**
 * Azure AD Integration (Fail Fast)
 * Azure AD only - no other providers
 */

import AzureADProvider from 'next-auth/providers/azure-ad';

export function createAzureADProvider() {
  const clientId = process.env.AZURE_AD_CLIENT_ID;
  const clientSecret = process.env.AZURE_AD_CLIENT_SECRET;
  const tenantId = process.env.AZURE_AD_TENANT_ID;
  
  if (!clientId || !clientSecret || !tenantId) {
    console.error('❌ FATAL: Azure AD configuration incomplete');
    console.error('💡 Required: AZURE_AD_CLIENT_ID, AZURE_AD_CLIENT_SECRET, AZURE_AD_TENANT_ID');
    console.error('💡 Add these to your .env file');
    process.exit(1);
  }
  
  return AzureADProvider({
    clientId,
    clientSecret,
    tenantId,
    authorization: {
      params: {
        scope: 'openid profile email offline_access User.Read'
      }
    }
  });
}

export function validateAzureADConfig() {
  const config = {
    clientId: process.env.AZURE_AD_CLIENT_ID,
    clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
    tenantId: process.env.AZURE_AD_TENANT_ID
  };
  
  // Validate format
  if (config.clientId && config.clientId.length < 32) {
    throw new Error(
      'AZURE_AD_CLIENT_ID is invalid (must be at least 32 characters).\n' +
      'To get this value:\n' +
      '1. Go to Azure Portal > Azure Active Directory > App Registrations\n' +
      '2. Select your app (or create a new one)\n' +
      '3. Copy "Application (client) ID" from the Overview page\n' +
      'See README.md "Azure AD Setup" section for detailed steps.'
    );
  }

  if (config.clientSecret && config.clientSecret.length < 32) {
    throw new Error(
      'AZURE_AD_CLIENT_SECRET is invalid (must be at least 32 characters).\n' +
      'To get this value:\n' +
      '1. Go to Azure Portal > App Registrations > Your App\n' +
      '2. Go to "Certificates & secrets" > "New client secret"\n' +
      '3. Copy the secret VALUE (not the ID) immediately after creation\n' +
      'Note: You can only see the value once - create a new one if needed.'
    );
  }

  if (config.tenantId && config.tenantId.length < 32) {
    throw new Error(
      'AZURE_AD_TENANT_ID is invalid (must be at least 32 characters).\n' +
      'To get this value:\n' +
      '1. Go to Azure Portal > Azure Active Directory > Overview\n' +
      '2. Copy the "Tenant ID" (also called Directory ID)\n' +
      'Or find it in App Registrations > Your App > Overview > "Directory (tenant) ID"'
    );
  }
  
  return true;
}