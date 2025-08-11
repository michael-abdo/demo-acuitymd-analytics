/**
 * Centralized Application Configuration
 * 
 * Industry Standard: Single source of truth for all configuration
 * Next.js handles basePath automatically for 99% of cases
 */

const config = {
  // App metadata
  app: {
    name: process.env.NEXT_PUBLIC_APP_NAME || 'VVG Template',
    version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
  },

  // API configuration
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || '',
    timeout: parseInt(process.env.API_TIMEOUT || '30000'),
  },

  // Authentication
  auth: {
    providers: {
      azureAd: {
        enabled: !!process.env.AZURE_AD_CLIENT_ID,
      }
    }
  },

  // Storage
  storage: {
    provider: process.env.STORAGE_PROVIDER || 'local',
    s3: {
      bucket: process.env.S3_BUCKET_NAME || '',
      region: process.env.AWS_REGION || 'us-east-1',
    }
  },

  // Features
  features: {
    ocr: process.env.ENABLE_OCR === 'true',
    emailNotifications: process.env.ENABLE_EMAIL === 'true',
  },

  // Environment
  env: {
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
    isTest: process.env.NODE_ENV === 'test',
  },

  // ONLY for special cases where Next.js doesn't handle basePath
  // (like constructing external URLs or manual window.location redirects)
  paths: {
    // The basePath from Next.js config (rarely needed)
    base: process.env.NEXT_PUBLIC_BASE_PATH || '',
    
    // Only use for edge cases like window.location redirects
    buildFullUrl: (path: string): string => {
      if (typeof window === 'undefined') return path;
      const base = process.env.NEXT_PUBLIC_BASE_PATH || '';
      return `${base}${path}`;
    }
  }
} as const;

export default config;