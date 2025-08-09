/**
 * Simplified Configuration - Industry Standard Approach
 * 
 * Following 2024 best practices for NextAuth.js and Azure AD configuration.
 * Minimal, clean configuration with only essential properties.
 */

// Core application configuration - Industry Standard Approach
export const config = {
  // Authentication (Essential)
  AZURE_AD_CLIENT_ID: process.env.AZURE_AD_CLIENT_ID || '',
  AZURE_AD_CLIENT_SECRET: process.env.AZURE_AD_CLIENT_SECRET || '',
  AZURE_AD_TENANT_ID: process.env.AZURE_AD_TENANT_ID || '',
  NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'fallback-secret-for-build',
  BASE_PATH: process.env.BASE_PATH || '',
  NODE_ENV: process.env.NODE_ENV || 'development' as 'development' | 'production' | 'test' | 'staging',
  
  // Commonly used properties (backward compatibility)
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  QUEUE_SYSTEM_TOKEN: process.env.QUEUE_SYSTEM_TOKEN || 'development-queue-token',
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  
  // Application properties
  app: {
    name: process.env.PROJECT_NAME || 'vvg-template',
    email: process.env.SES_FROM_EMAIL || 'noreply@example.com',
  },
  
  // Email configuration (commonly used)
  email: {
    smtp: {
      host: process.env.AWS_SES_SMTP_HOST || 'email-smtp.us-west-2.amazonaws.com',
      port: parseInt(process.env.AWS_SES_SMTP_PORT || '587', 10),
      username: process.env.AWS_SES_SMTP_USERNAME || '',
      password: process.env.AWS_SES_SMTP_PASSWORD || '',
    },
    from: process.env.SES_FROM_EMAIL || 'noreply@example.com',
    testRecipient: process.env.SES_TEST_RECIPIENT || '',
    adminEmail: process.env.ADMIN_EMAIL || '',
    enableInDev: process.env.ENABLE_EMAIL_IN_DEV === 'true',
  },
};

// Environment helpers
export const EnvironmentHelpers = {
  isDevelopment: () => config.NODE_ENV === 'development',
  isProduction: () => config.NODE_ENV === 'production',
  isTest: () => config.NODE_ENV === 'test',
  
  requireDevelopment: () => {
    if (EnvironmentHelpers.isProduction()) {
      throw new Error('Development-only feature accessed in production');
    }
  },
  
  devOnlyResponse: () => EnvironmentHelpers.isProduction() 
    ? new Response(null, { status: 404 })
    : null,
};

// Development features
export const FEATURES = {
  DEV_BYPASS: process.env.FEATURE_DEV_BYPASS !== 'false',
  devBypass: process.env.FEATURE_DEV_BYPASS !== 'false'
};

// Add FEATURES to main config for backward compatibility
config.FEATURES = FEATURES;

// Essential constants only
export const APP_CONSTANTS = {
  HEADERS: {
    DEV_BYPASS: 'X-Dev-Bypass',
  }
};

// Legacy exports for backward compatibility - will be removed after migration
export const NODE_ENV = config.NODE_ENV;
export const IS_DEVELOPMENT = EnvironmentHelpers.isDevelopment();
export const IS_PRODUCTION = EnvironmentHelpers.isProduction();
export const QUEUE_SYSTEM_TOKEN = process.env.QUEUE_SYSTEM_TOKEN || 'development-queue-token';