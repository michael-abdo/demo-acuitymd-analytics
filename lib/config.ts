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
    MYSQL_HOST: process.env.MYSQL_HOST || '127.0.0.1',
    MYSQL_PORT: parseInt(process.env.MYSQL_PORT || '10003', 10),
    MYSQL_USER: process.env.MYSQL_USER || 'michael',
    MYSQL_DATABASE: process.env.MYSQL_DATABASE || 'truck_scrape',
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
    TEST_USER_EMAIL: 'michaelabdo@vvgtruck.com',
    QUEUE_SYSTEM_TOKEN: process.env.QUEUE_SYSTEM_TOKEN || 'dev-system-token'
  };

  // Validate required variables in production
  if (isProduction) {
    const requiredInProd: Array<keyof Config> = [
      'MYSQL_HOST',
      'MYSQL_USER',
      'MYSQL_DATABASE',
      'MYSQL_PASSWORD',
      'NEXTAUTH_SECRET',
      'NEXTAUTH_URL'
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