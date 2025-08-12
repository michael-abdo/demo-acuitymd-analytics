/**
 * Main Configuration Hub - Comprehensive Validation Layer
 * 
 * Environment Loading Call Stack:
 * 1. .env.{environment} → Next.js loads environment variables
 * 2. next.config.mjs → BASE_PATH resolution with fallbacks
 * 3. lib/basepath-config.ts → Path normalization and validation
 * 4. THIS FILE → Comprehensive validation and config hub
 * 5. Application components import from here
 * 
 * This acts as the singleton configuration processor with fail-fast validation.
 */

import { BASEPATH_CONFIG } from './basepath-config';

// Core application configuration - Industry Standard Approach
export const config = {
  // Authentication (Essential)
  AZURE_AD_CLIENT_ID: process.env.AZURE_AD_CLIENT_ID || '',
  AZURE_AD_CLIENT_SECRET: process.env.AZURE_AD_CLIENT_SECRET || '',
  AZURE_AD_TENANT_ID: process.env.AZURE_AD_TENANT_ID || '',
  NEXTAUTH_URL: process.env.NEXTAUTH_URL || `http://localhost:${process.env.PORT}`,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'fallback-secret-for-build',
  BASE_PATH: BASEPATH_CONFIG.resolved,
  // Table prefix for shared database isolation
  DB_TABLE_PREFIX: process.env.DB_TABLE_PREFIX || '',
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
  
  // Storage configuration (shared resources)
  STORAGE_PROVIDER: process.env.STORAGE_PROVIDER || 'local',
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || '',
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || '',
  AWS_REGION: process.env.AWS_REGION || 'us-west-2',
  S3_BUCKET_NAME: process.env.S3_BUCKET_NAME || 'vvg-template-shared-bucket',
  S3_FOLDER_PREFIX: process.env.S3_FOLDER_PREFIX || 'documents/',
  S3_ACCESS: process.env.S3_ACCESS === 'true',
  
  // Application properties
  app: {
    name: process.env.PROJECT_NAME || 'vvg-template',
    email: process.env.SES_FROM_EMAIL || 'noreply@example.com',
  },
  
  // Email configuration (commonly used)
  email: {
    smtp: {
      host: process.env.AWS_SES_SMTP_HOST || `email-smtp.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com`,
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

/**
 * Comprehensive Configuration Validation Functions
 */
export const ConfigValidation = {
  /**
   * Validates essential authentication configuration
   */
  validateAuth: () => {
    const errors: string[] = [];
    
    if (!config.AZURE_AD_CLIENT_ID) errors.push('AZURE_AD_CLIENT_ID is required');
    if (!config.AZURE_AD_CLIENT_SECRET) errors.push('AZURE_AD_CLIENT_SECRET is required');
    if (!config.AZURE_AD_TENANT_ID) errors.push('AZURE_AD_TENANT_ID is required');
    if (!config.NEXTAUTH_SECRET || config.NEXTAUTH_SECRET === 'fallback-secret-for-build') {
      errors.push('NEXTAUTH_SECRET must be set for production');
    }
    
    if (errors.length > 0) {
      throw new Error(`Authentication configuration errors: ${errors.join(', ')}`);
    }
  },
  
  /**
   * Validates database configuration
   */
  validateDatabase: () => {
    const errors: string[] = [];
    
    if (!config.DATABASE_URL && !config.MYSQL_HOST) {
      errors.push('Either DATABASE_URL or MYSQL_HOST must be provided');
    }
    
    if (!config.DATABASE_URL && !config.MYSQL_DATABASE) {
      errors.push('MYSQL_DATABASE is required when using individual MySQL settings');
    }
    
    // Validate table prefix format
    if (config.DB_TABLE_PREFIX && !/^[a-zA-Z_][a-zA-Z0-9_]*_?$/.test(config.DB_TABLE_PREFIX)) {
      errors.push('DB_TABLE_PREFIX must contain only letters, numbers, underscores');
    }
    
    if (errors.length > 0) {
      throw new Error(`Database configuration errors: ${errors.join(', ')}`);
    }
  },
  
  /**
   * Validates storage configuration
   */
  validateStorage: () => {
    const errors: string[] = [];
    
    if (config.STORAGE_PROVIDER === 's3' || config.S3_ACCESS) {
      if (!config.AWS_ACCESS_KEY_ID) errors.push('AWS_ACCESS_KEY_ID is required for S3');
      if (!config.AWS_SECRET_ACCESS_KEY) errors.push('AWS_SECRET_ACCESS_KEY is required for S3');
      if (!config.S3_BUCKET_NAME) errors.push('S3_BUCKET_NAME is required for S3');
      if (!config.AWS_REGION) errors.push('AWS_REGION is required for S3');
    }
    
    // Validate S3 folder prefix format
    if (config.S3_FOLDER_PREFIX && !config.S3_FOLDER_PREFIX.endsWith('/')) {
      console.warn('S3_FOLDER_PREFIX should end with "/" for proper folder structure');
    }
    
    if (errors.length > 0) {
      throw new Error(`Storage configuration errors: ${errors.join(', ')}`);
    }
  },
  
  /**
   * Validates environment-specific settings
   */
  validateEnvironment: () => {
    const errors: string[] = [];
    const env = config.NODE_ENV;
    
    // Production-specific validations
    if (env === 'production') {
      if (!config.NEXTAUTH_URL || config.NEXTAUTH_URL.includes('localhost')) {
        errors.push('NEXTAUTH_URL must be set to production domain');
      }
      
      if (config.FEATURES.DEV_BYPASS) {
        console.warn('⚠️ DEV_BYPASS is enabled in production - security risk!');
      }
    }
    
    // Staging-specific validations
    if (env === 'staging') {
      if (!config.DB_TABLE_PREFIX) {
        console.warn('⚠️ No DB_TABLE_PREFIX set for staging - using production tables');
      }
      
      if (!config.S3_FOLDER_PREFIX || !config.S3_FOLDER_PREFIX.includes('staging')) {
        console.warn('⚠️ S3_FOLDER_PREFIX should include "staging" for isolation');
      }
    }
    
    if (errors.length > 0) {
      throw new Error(`Environment configuration errors: ${errors.join(', ')}`);
    }
  },
  
  /**
   * Runs all validations - call this on app startup
   */
  validateAll: () => {
    try {
      ConfigValidation.validateAuth();
      ConfigValidation.validateDatabase();
      ConfigValidation.validateStorage();
      ConfigValidation.validateEnvironment();
      
      console.log(`✅ [Config] All validations passed for ${config.NODE_ENV} environment`);
    } catch (error) {
      console.error(`❌ [Config] Validation failed:`, error);
      if (config.NODE_ENV === 'production') {
        throw error; // Fail fast in production
      }
    }
  }
};

// Extended config with FEATURES and validation utilities
export const extendedConfig = {
  ...config,
  FEATURES,
  validation: ConfigValidation,
  basePath: {
    resolved: BASEPATH_CONFIG.resolved,
    utilities: BASEPATH_CONFIG.utilities
  }
};

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