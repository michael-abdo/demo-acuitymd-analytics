/**
 * Configuration Validator (Fail Fast)
 * No defaults - everything must be explicitly set
 */

interface RequiredConfig {
  // Authentication (no guest mode)
  NEXTAUTH_SECRET: string;
  NEXTAUTH_URL: string;
  AZURE_AD_CLIENT_ID: string;
  AZURE_AD_CLIENT_SECRET: string;
  AZURE_AD_TENANT_ID: string;
  
  // Database (no in-memory fallback)
  DATABASE_URL: string;
  
  // Storage (no local fallback)
  AWS_REGION: string;
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  S3_BUCKET_NAME: string;
  
  // Redis (optional but recommended for performance)
  REDIS_URL?: string;
  
  // Application (strict values)
  NODE_ENV: 'development' | 'staging' | 'production';
  PORT: string;
  
  // Logging (no console fallback)
  LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
}

export function validateConfig(): RequiredConfig {
  const errors: string[] = [];
  const config = {} as RequiredConfig;
  
  // Check every required variable
  const requiredVars = [
    'NEXTAUTH_SECRET', 'NEXTAUTH_URL',
    'AZURE_AD_CLIENT_ID', 'AZURE_AD_CLIENT_SECRET', 'AZURE_AD_TENANT_ID',
    'DATABASE_URL',
    'AWS_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'S3_BUCKET_NAME',
    'NODE_ENV', 'PORT', 'LOG_LEVEL'
  ];
  
  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (!value) {
      errors.push(`Missing required: ${varName}`);
    } else {
      config[varName as keyof RequiredConfig] = value as any;
    }
  }
  
  // Optional Redis
  if (process.env.REDIS_URL) {
    config.REDIS_URL = process.env.REDIS_URL;
  }
  
  // Validate specific formats
  if (config.NODE_ENV && !['development', 'staging', 'production'].includes(config.NODE_ENV)) {
    errors.push(`Invalid NODE_ENV: ${config.NODE_ENV}`);
  }
  
  if (config.NEXTAUTH_URL && !isValidUrl(config.NEXTAUTH_URL)) {
    errors.push(`Invalid NEXTAUTH_URL: ${config.NEXTAUTH_URL}`);
  }
  
  // Fail fast if any errors
  if (errors.length > 0) {
    console.error('❌ FATAL: Configuration validation failed');
    console.error('🔧 Required environment variables:');
    errors.forEach(error => console.error(`   💡 ${error}`));
    console.error('📝 Copy .env.example to .env and fill in all values');
    process.exit(1);
  }
  
  return config;
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}