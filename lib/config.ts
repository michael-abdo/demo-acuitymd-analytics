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
  NEXTAUTH_URL: process.env.NEXTAUTH_URL || `http://localhost:${process.env.PORT || 3000}`,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'fallback-secret-for-build',
  BASE_PATH: process.env.BASE_PATH || '',
  NODE_ENV: process.env.NODE_ENV || 'development' as 'development' | 'production' | 'test' | 'staging',
  
  // Commonly used properties (backward compatibility)
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  QUEUE_SYSTEM_TOKEN: process.env.QUEUE_SYSTEM_TOKEN || 'development-queue-token',
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  
  // Database configuration
  MYSQL_HOST: process.env.MYSQL_HOST || 'localhost',
  MYSQL_PORT: process.env.MYSQL_PORT || '3306',
  MYSQL_USER: process.env.MYSQL_USER || 'root',
  MYSQL_PASSWORD: process.env.MYSQL_PASSWORD || '',
  MYSQL_DATABASE: process.env.MYSQL_DATABASE || 'vvg_template',
  DATABASE_URL: process.env.DATABASE_URL || '',
  
  // Storage configuration
  STORAGE_PROVIDER: process.env.STORAGE_PROVIDER || 'local',
  AWS_REGION: process.env.AWS_REGION || 'us-east-1',
  S3_BUCKET_NAME: process.env.S3_BUCKET_NAME || '',
  S3_FOLDER_PREFIX: process.env.S3_FOLDER_PREFIX || 'documents/',
  
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
    
  hasDbAccess: () => !!(config.DATABASE_URL || (config.MYSQL_HOST && config.MYSQL_DATABASE)),
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
  },
  FILE_LIMITS: {
    ALLOWED_MIME_TYPES: [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'text/csv'
    ],
    ALLOWED_EXTENSIONS: ['.pdf', '.docx', '.doc', '.txt', '.csv'],
    MAX_SIZE: 10 * 1024 * 1024, // 10MB
  },
  QUEUE: {
    DEFAULT_PRIORITY: 5,
    MAX_ATTEMPTS: 3,
  },
  MESSAGES: {
    UNAUTHORIZED: 'Authentication required',
    FORBIDDEN: 'Access denied',
    NOT_FOUND: 'Resource not found',
    VALIDATION_ERROR: 'Validation failed',
    INTERNAL_ERROR: 'Internal server error'
  },
  RATE_LIMIT: {
    WINDOW_SIZE: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 100
  }
};

// Legacy exports for backward compatibility - will be removed after migration
export const NODE_ENV = config.NODE_ENV;
export const IS_DEVELOPMENT = EnvironmentHelpers.isDevelopment();
export const IS_PRODUCTION = EnvironmentHelpers.isProduction();
export const QUEUE_SYSTEM_TOKEN = process.env.QUEUE_SYSTEM_TOKEN || 'development-queue-token';