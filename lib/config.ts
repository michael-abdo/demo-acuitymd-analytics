// Environment variables and constants
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const IS_DEVELOPMENT = NODE_ENV === 'development';
export const IS_PRODUCTION = NODE_ENV === 'production';
export const QUEUE_SYSTEM_TOKEN = process.env.QUEUE_SYSTEM_TOKEN || 'development-queue-token';
export const FEATURES = {
  DEV_BYPASS: process.env.FEATURE_DEV_BYPASS !== 'false',
  devBypass: process.env.FEATURE_DEV_BYPASS !== 'false'
};

export const config = {
  auth: {
    providers: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      },
      azure: {
        clientId: process.env.AZURE_AD_CLIENT_ID || '',
        clientSecret: process.env.AZURE_AD_CLIENT_SECRET || '',
        tenantId: process.env.AZURE_AD_TENANT_ID || '',
      }
    }
  },
  app: {
    name: process.env.PROJECT_NAME || 'vvg-app',
    basePath: process.env.BASE_PATH || '',
    email: process.env.SES_FROM_EMAIL || 'noreply@example.com',
  },
  
  template: {
    name: process.env.PROJECT_NAME || 'vvg-template',
    displayName: process.env.PROJECT_DISPLAY_NAME || 'Template App',
    basePath: process.env.BASE_PATH || '',
    domain: process.env.APP_DOMAIN || 'localhost:3000',
    
    paths: {
      nextAuthUrl: process.env.NEXTAUTH_URL || `http://localhost:3000`,
      s3Prefix: `${process.env.PROJECT_NAME || 'vvg-template'}/`,
    }
  },
  
  storage: {
    provider: process.env.STORAGE_PROVIDER as 'local' | 's3' || 'local',
    local: {
      uploadDir: process.env.LOCAL_UPLOAD_DIR || './uploads',
    },
    s3: {
      bucket: process.env.S3_BUCKET_NAME || '',
      region: process.env.AWS_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      folderPrefix: process.env.S3_FOLDER_PREFIX || `${process.env.PROJECT_NAME || 'vvg-app'}/`,
    }
  },
  
  database: {
    url: process.env.DATABASE_URL || '',
  },
  
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
  
  // Database configuration
  MYSQL_HOST: process.env.MYSQL_HOST || 'localhost',
  MYSQL_PORT: process.env.MYSQL_PORT || '3306',
  MYSQL_USER: process.env.MYSQL_USER || 'root',
  MYSQL_PASSWORD: process.env.MYSQL_PASSWORD || '',
  MYSQL_DATABASE: process.env.MYSQL_DATABASE || 'vvg_template',
  
  // S3 configuration
  S3_BUCKET_NAME: process.env.S3_BUCKET_NAME || '',
  
  // Additional properties
  NODE_ENV,
  IS_DEVELOPMENT,
  IS_PRODUCTION,
  QUEUE_SYSTEM_TOKEN,
  FEATURES,
  S3_FOLDER_PREFIX: process.env.S3_FOLDER_PREFIX || `${process.env.PROJECT_NAME || 'vvg-app'}/`,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL || `http://localhost:3000`,
  
  // Test user configuration
  TEST_USER_EMAIL: process.env.TEST_USER_EMAIL || 'test@example.com',

  // Storage configuration properties (for lib/storage/index.ts)
  STORAGE_PROVIDER: process.env.STORAGE_PROVIDER as 'local' | 's3' || 'local',
  S3_ACCESS: process.env.S3_ACCESS === 'true' || false,
  AWS_REGION: process.env.AWS_REGION || 'us-east-1',
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || '',
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || '',
  S3_ENDPOINT: process.env.S3_ENDPOINT || '',
  LOCAL_STORAGE_PATH: process.env.LOCAL_STORAGE_PATH || './storage'
};

export const APP_CONSTANTS = {
  MESSAGES: {
    ERROR: {
      UNAUTHORIZED: 'Authentication required',
      SERVER_ERROR: 'Internal server error',
      NOT_FOUND: 'Resource not found',
      VALIDATION_FAILED: 'Validation failed',
      RATE_LIMIT: 'Rate limit exceeded',
      CONFIGURATION: 'Configuration error'
    },
    SUCCESS: {
      UPLOAD_COMPLETE: 'File uploaded successfully',
      EXTRACTION_COMPLETE: 'Text extraction completed'
    },
    UPLOAD: {
      STARTED: 'File upload started',
      COMPLETED: 'File upload completed',
      FAILED: 'File upload failed',
      INVALID_TYPE: 'Invalid file type',
      TOO_LARGE: 'File too large'
    }
  },
  
  FILE_LIMITS: {
    MAX_SIZE: 10 * 1024 * 1024, // 10MB
    MAX_SIZE_MB: 10,
    ALLOWED_TYPES: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
    ALLOWED_MIME_TYPES: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
    ALLOWED_EXTENSIONS: ['.pdf', '.docx', '.txt'],
    MIME_TYPE_MAP: {
      'pdf': 'application/pdf',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'txt': 'text/plain'
    }
  },
  
  VALIDATION: {
    STARTED: 'Validation started',
    COMPLETED: 'Validation completed',
    FAILED: 'Validation failed',
    INVALID_TYPE: 'Invalid file type',
    TOO_LARGE: 'File too large'
  },

  
  RATE_LIMITS: {
    COMPARE: {
      MAX_REQUESTS: 10,
      WINDOW_MINUTES: 1
    },
    UPLOAD: {
      MAX_REQUESTS: 20,
      WINDOW_MINUTES: 1
    },
    CLEANUP_THRESHOLD: 1000
  },
  
  QUEUE: {
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
    PROCESSING_TIMEOUT: 300000, // 5 minutes
    BATCH_SIZE: 10,
    DEFAULT_PRIORITY: 5,
    MAX_ATTEMPTS: 3
  },
  
  HEADERS: {
    DEV_BYPASS: 'X-Dev-Bypass',
    API_KEY: 'X-API-Key',
    SYSTEM_TOKEN: 'X-System-Token',
    RATE_LIMIT: {
      LIMIT: 'X-RateLimit-Limit',
      REMAINING: 'X-RateLimit-Remaining',
      RESET: 'X-RateLimit-Reset'
    }
  }
};

/**
 * Environment Helpers
 */
export const EnvironmentHelpers = {
  isDevelopment: () => NODE_ENV === 'development',
  isProduction: () => NODE_ENV === 'production',
  isTest: () => NODE_ENV === 'test',
  
  getProjectName: () => process.env.PROJECT_NAME || 'vvg-template',
  getDisplayName: () => process.env.PROJECT_DISPLAY_NAME || 'Template App',
  getDomain: () => process.env.APP_DOMAIN || 'localhost:3000',
  
  requireDevelopment: () => {
    if (EnvironmentHelpers.isProduction()) {
      throw new Error('Development-only feature accessed in production');
    }
  },
  
  devOnlyResponse: () => EnvironmentHelpers.isProduction() 
    ? new Response(null, { status: 404 })
    : null,
    
  getEnvOrThrow: (key: string, message?: string) => {
    const value = process.env[key];
    if (!value) {
      throw new Error(message || `Required environment variable ${key} is not set`);
    }
    return value;
  },
  
  getEnvOrDefault: (key: string, defaultValue: string) => {
    return process.env[key] || defaultValue;
  },
  
  getEnvBoolean: (key: string, defaultValue: boolean = false) => {
    const value = process.env[key];
    if (value === undefined) return defaultValue;
    return value.toLowerCase() === 'true' || value === '1';
  },

  hasDbAccess: () => {
    return !!process.env.DATABASE_URL || !!process.env.MYSQL_HOST;
  }
};

export const DB_CREATE_ACCESS = process.env.DB_CREATE_ACCESS === 'true' || process.env.DB_CREATE_ACCESS === '1';