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
  NODE_ENV: 'development';
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
  
  // Hints for where to get each variable
  const varHints: Record<string, string> = {
    'NEXTAUTH_SECRET': 'Generate with: openssl rand -base64 32',
    'NEXTAUTH_URL': 'e.g., http://localhost:3000 or https://yourdomain.com',
    'AZURE_AD_CLIENT_ID': 'From Azure Portal > App Registrations > Your App > Overview',
    'AZURE_AD_CLIENT_SECRET': 'From Azure Portal > App Registrations > Certificates & secrets',
    'AZURE_AD_TENANT_ID': 'From Azure Portal > Azure Active Directory > Overview',
    'DATABASE_URL': 'Format: mysql://user:password@host:port/database',
    'AWS_REGION': 'e.g., us-east-1, us-west-2',
    'AWS_ACCESS_KEY_ID': 'From AWS IAM console',
    'AWS_SECRET_ACCESS_KEY': 'From AWS IAM console (shown only once when created)',
    'S3_BUCKET_NAME': 'Your S3 bucket name',
    'NODE_ENV': 'Usually: development',
    'PORT': 'Usually: 3000',
    'LOG_LEVEL': 'One of: debug, info, warn, error',
  };

  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (!value) {
      const hint = varHints[varName] || '';
      errors.push(`Missing: ${varName}${hint ? ` (${hint})` : ''}`);
    } else {
      (config as any)[varName] = value;
    }
  }
  
  // Optional Redis
  if (process.env.REDIS_URL) {
    config.REDIS_URL = process.env.REDIS_URL;
  }
  
  // Validate specific formats
  if (config.NODE_ENV && config.NODE_ENV !== 'development') {
    errors.push(`Invalid NODE_ENV: ${config.NODE_ENV}`);
  }
  
  if (config.NEXTAUTH_URL && !isValidUrl(config.NEXTAUTH_URL)) {
    errors.push(
      `Invalid NEXTAUTH_URL: "${config.NEXTAUTH_URL}"\n` +
      `   Expected format: http://localhost:3000 (dev) or https://yourdomain.com (prod)\n` +
      `   Must be a valid URL without trailing slash`
    );
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
