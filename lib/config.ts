/**
 * Centralized Environment Configuration
 * 
 * This module consolidates all environment variable access into a single, 
 * type-safe configuration object. This follows the DRY principle by eliminating
 * scattered process.env access throughout the codebase.
 */

interface DatabaseConfig {
  MYSQL_HOST: string;
  MYSQL_PORT: number;
  MYSQL_USER: string;
  MYSQL_DATABASE: string;
  MYSQL_PASSWORD: string;
  DB_CREATE_ACCESS: boolean;
}

interface StorageConfig {
  STORAGE_PROVIDER: 'local' | 's3';
  LOCAL_STORAGE_PATH?: string;
  S3_BUCKET_NAME?: string;
  S3_ACCESS: boolean;
  AWS_REGION?: string;
  AWS_ACCESS_KEY_ID?: string;
  AWS_SECRET_ACCESS_KEY?: string;
  S3_ENDPOINT?: string;
  S3_FOLDER_PREFIX: string;
}

interface AuthConfig {
  NEXTAUTH_URL?: string;
  NEXTAUTH_SECRET?: string;
  AZURE_AD_CLIENT_ID?: string;
  AZURE_AD_CLIENT_SECRET?: string;
  AZURE_AD_TENANT_ID?: string;
}

interface AppConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  IS_DEVELOPMENT: boolean;
  IS_PRODUCTION: boolean;
  TEST_USER_EMAIL: string;
  QUEUE_SYSTEM_TOKEN: string;
  OPENAI_API_KEY: string;
  DEV_SEED_USER: string;
  DEV_BYPASS_ENABLED: boolean;
}

export interface Config extends DatabaseConfig, StorageConfig, AuthConfig, AppConfig {}

/**
 * Parse and validate environment variables
 */
function parseEnvConfig(): Config {
  const nodeEnv = (process.env.NODE_ENV || 'development') as Config['NODE_ENV'];
  const isDevelopment = nodeEnv !== 'production';
  const isProduction = nodeEnv === 'production';

  const config: Config = {
    // Database configuration
    MYSQL_HOST: process.env.MYSQL_HOST || (isDevelopment ? '127.0.0.1' : ''),
    MYSQL_PORT: parseInt(process.env.MYSQL_PORT || (isDevelopment ? '10003' : '0'), 10),
    MYSQL_USER: process.env.MYSQL_USER || (isDevelopment ? 'michael' : ''),
    MYSQL_DATABASE: process.env.MYSQL_DATABASE || (isDevelopment ? 'truck_scrape' : ''),
    MYSQL_PASSWORD: process.env.MYSQL_PASSWORD || '',
    DB_CREATE_ACCESS: process.env.DB_CREATE_ACCESS === 'true',
    
    // Storage configuration
    STORAGE_PROVIDER: (process.env.STORAGE_PROVIDER as 'local' | 's3') || 'local',
    LOCAL_STORAGE_PATH: process.env.LOCAL_STORAGE_PATH,
    S3_BUCKET_NAME: process.env.S3_BUCKET_NAME || 'vvg-cloud-storage',
    S3_ACCESS: process.env.S3_ACCESS === 'true',
    AWS_REGION: process.env.AWS_REGION || 'us-west-2',
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    S3_ENDPOINT: process.env.S3_ENDPOINT,
    S3_FOLDER_PREFIX: process.env.S3_FOLDER_PREFIX || 'nda-analyzer/',
    
    // Auth configuration
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    AZURE_AD_CLIENT_ID: process.env.AZURE_AD_CLIENT_ID,
    AZURE_AD_CLIENT_SECRET: process.env.AZURE_AD_CLIENT_SECRET,
    AZURE_AD_TENANT_ID: process.env.AZURE_AD_TENANT_ID,
    
    // Application configuration
    NODE_ENV: nodeEnv,
    IS_DEVELOPMENT: isDevelopment,
    IS_PRODUCTION: isProduction,
    TEST_USER_EMAIL: process.env.TEST_USER_EMAIL || (isDevelopment ? 'michaelabdo@vvgtruck.com' : ''),
    QUEUE_SYSTEM_TOKEN: process.env.QUEUE_SYSTEM_TOKEN || (isDevelopment ? 'dev-system-token' : ''),
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
    DEV_SEED_USER: process.env.DEV_SEED_USER || (isDevelopment ? 'michaelabdo@vvgtruck.com' : ''),
    DEV_BYPASS_ENABLED: process.env.DEV_BYPASS_ENABLED === 'true' && isDevelopment
  };

  // Validate required variables in production
  if (isProduction) {
    const requiredInProd: Array<keyof Config> = [
      'MYSQL_HOST',
      'MYSQL_USER',
      'MYSQL_DATABASE',
      'MYSQL_PASSWORD',
      'NEXTAUTH_SECRET',
      'NEXTAUTH_URL',
      'QUEUE_SYSTEM_TOKEN',
      'OPENAI_API_KEY'
    ];

    const missing = requiredInProd.filter(key => !config[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables in production: ${missing.join(', ')}`);
    }

    // Validate S3 config if S3 is the storage provider
    if (config.STORAGE_PROVIDER === 's3') {
      const s3Required: Array<keyof Config> = [
        'S3_BUCKET_NAME',
        'AWS_REGION',
        'AWS_ACCESS_KEY_ID',
        'AWS_SECRET_ACCESS_KEY'
      ];
      
      const s3Missing = s3Required.filter(key => !config[key]);
      
      if (s3Missing.length > 0) {
        throw new Error(`Missing required S3 configuration: ${s3Missing.join(', ')}`);
      }
    }
  }

  return config;
}

/**
 * Singleton configuration instance
 * Frozen to prevent accidental mutation
 */
export const config: Readonly<Config> = Object.freeze(parseEnvConfig());

/**
 * Helper function to get database connection URL
 */
export function getDatabaseUrl(): string {
  const { MYSQL_USER, MYSQL_PASSWORD, MYSQL_HOST, MYSQL_PORT, MYSQL_DATABASE } = config;
  const auth = MYSQL_PASSWORD ? `${MYSQL_USER}:${MYSQL_PASSWORD}` : MYSQL_USER;
  return `mysql://${auth}@${MYSQL_HOST}:${MYSQL_PORT}/${MYSQL_DATABASE}`;
}

/**
 * Helper to check if we should use test data
 */
export function isTestMode(): boolean {
  return config.IS_DEVELOPMENT || config.NODE_ENV === 'test';
}

/**
 * Log configuration (non-sensitive values only)
 */
export function logConfig(): void {
  console.log('Configuration loaded:', {
    NODE_ENV: config.NODE_ENV,
    IS_DEVELOPMENT: config.IS_DEVELOPMENT,
    STORAGE_PROVIDER: config.STORAGE_PROVIDER,
    DB_HOST: config.MYSQL_HOST,
    DB_NAME: config.MYSQL_DATABASE,
    HAS_S3_ACCESS: config.S3_ACCESS,
    HAS_DB_CREATE_ACCESS: config.DB_CREATE_ACCESS
  });
}

/**
 * Application Constants
 * 
 * Centralized constants to eliminate magic numbers and repeated strings
 * throughout the codebase. Following DRY principle.
 */
export const APP_CONSTANTS = {
  // File handling limits
  FILE_LIMITS: {
    MAX_SIZE: 10 * 1024 * 1024, // 10MB
    MAX_SIZE_MB: 10,
    ALLOWED_EXTENSIONS: ['pdf', 'docx', 'doc', 'txt'] as const,
    ALLOWED_MIME_TYPES: [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword', // .doc
      'text/plain' // .txt
    ] as const,
    MIME_TYPE_MAP: {
      'pdf': 'application/pdf',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'doc': 'application/msword',
      'txt': 'text/plain'
    } as const
  },

  // Rate limiting
  RATE_LIMITS: {
    COMPARE: {
      MAX_REQUESTS: 10,
      WINDOW_MINUTES: 60
    },
    UPLOAD: {
      MAX_REQUESTS: 50,
      WINDOW_MINUTES: 60
    },
    CLEANUP_THRESHOLD: 1000 // Clean up rate limiter entries when exceeding this count
  },

  // Processing timeouts and retries
  PROCESSING: {
    EXTRACTION_TIMEOUT_MS: 300000, // 5 minutes
    MAX_EXTRACTION_RETRIES: 3,
    EXTRACTION_PRIORITY: 5, // Default priority for extraction tasks
    DEFAULT_CONFIDENCE: 0.95, // Default confidence score for extracted text
    MIN_TEXT_LENGTH: 10, // Minimum valid extracted text length
    AVERAGE_WORDS_PER_PAGE: 500,
    AVERAGE_CHARS_PER_WORD: 5
  },

  // Queue system
  QUEUE: {
    DEFAULT_PRIORITY: 5,
    MAX_ATTEMPTS: 3,
    SYSTEM_TOKEN_HEADER: 'Authorization'
  },

  // UI Messages
  MESSAGES: {
    UPLOAD: {
      SUCCESS: 'Document uploaded successfully',
      DUPLICATE: 'Document already exists',
      INVALID_TYPE: 'Invalid file type. Only PDF, DOCX, DOC, and TXT files are allowed',
      TOO_LARGE: 'File too large. Maximum size is 10MB',
      NO_FILE: 'No file provided'
    },
    EXTRACTION: {
      PENDING: 'Text extraction is in progress. Please wait...',
      TRIGGERED: 'Text extraction has been triggered. Please wait a moment and try again.',
      FAILED: 'Failed to extract text from document',
      SUCCESS: 'Text extraction completed successfully'
    },
    COMPARISON: {
      PROCESSING: 'Comparing documents...',
      SUCCESS: 'NDA comparison completed',
      FAILED: 'Comparison failed',
      MISSING_DOCS: 'One or both documents not found',
      MISSING_TEXT: 'Text extraction not completed'
    },
    ERROR: {
      UNAUTHORIZED: 'Unauthorized',
      NOT_FOUND: 'Resource not found',
      RATE_LIMIT: 'Too many requests. Please try again later.',
      SERVER_ERROR: 'An unexpected error occurred',
      CONFIGURATION: 'Required configuration is missing'
    }
  },

  // HTTP Headers
  HEADERS: {
    RATE_LIMIT: {
      LIMIT: 'X-RateLimit-Limit',
      REMAINING: 'X-RateLimit-Remaining',
      RESET: 'X-RateLimit-Reset',
      RETRY_AFTER: 'Retry-After'
    },
    DEV_BYPASS: 'x-dev-bypass'
  },

  // Storage settings
  STORAGE: {
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000, // 1 second base delay
    TIMEOUT: 30000, // 30 seconds
    SIGNED_URL_EXPIRES: 3600 // 1 hour
  }
} as const;