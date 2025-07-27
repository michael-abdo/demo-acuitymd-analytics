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
    basePath: process.env.APP_BASE_PATH || `/${process.env.PROJECT_NAME || 'vvg-app'}`,
  },
  
  // Template system integration for DRY consolidation
  template: {
    // Core project identity
    name: process.env.PROJECT_NAME || 'vvg-template',
    displayName: process.env.PROJECT_DISPLAY_NAME || 'Template App',
    
    // Path configurations
    basePath: process.env.APP_BASE_PATH || `/${process.env.PROJECT_NAME || 'vvg-template'}`,
    domain: process.env.APP_DOMAIN || 'localhost:3000',
    
    // Computed paths for consistency
    paths: {
      nextAuthUrl: process.env.NEXTAUTH_URL || `https://${process.env.APP_DOMAIN || 'localhost:3000'}/${process.env.PROJECT_NAME || 'vvg-template'}`,
      s3Prefix: `${process.env.PROJECT_NAME || 'vvg-template'}/`,
      nginxPath: `/${process.env.PROJECT_NAME || 'vvg-template'}`,
      
      // API paths for functional files
      api: {
        auth: `/${process.env.PROJECT_NAME || 'vvg-template'}/api/auth`,
        authCallback: `/${process.env.PROJECT_NAME || 'vvg-template'}/api/auth/callback/azure-ad`,
        upload: `/${process.env.PROJECT_NAME || 'vvg-template'}/api/upload`,
        documents: `/${process.env.PROJECT_NAME || 'vvg-template'}/api/documents`,
        compare: `/${process.env.PROJECT_NAME || 'vvg-template'}/api/compare`,
        dashboard: `/${process.env.PROJECT_NAME || 'vvg-template'}/api/dashboard`,
      },
      
      // Full URLs for external references
      urls: {
        azureCallback: `https://${process.env.APP_DOMAIN || 'localhost:3000'}/${process.env.PROJECT_NAME || 'vvg-template'}/api/auth/callback/azure-ad`,
      },
      
      // Page paths
      pages: {
        signIn: `/${process.env.PROJECT_NAME || 'vvg-template'}/sign-in`,
        dashboard: `/${process.env.PROJECT_NAME || 'vvg-template'}/dashboard`,
        documents: `/${process.env.PROJECT_NAME || 'vvg-template'}/documents`,
        compare: `/${process.env.PROJECT_NAME || 'vvg-template'}/compare`,
        upload: `/${process.env.PROJECT_NAME || 'vvg-template'}/upload`,
      }
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
  }
};

export const APP_CONSTANTS = {
  MESSAGES: {
    ERROR: {
      UNAUTHORIZED: 'Authentication required',
      SERVER_ERROR: 'Internal server error',
      NOT_FOUND: 'Resource not found',
      VALIDATION_FAILED: 'Validation failed'
    },
    SUCCESS: {
      UPLOAD_COMPLETE: 'File uploaded successfully',
      EXTRACTION_COMPLETE: 'Text extraction completed',
      COMPARISON_COMPLETE: 'Document comparison completed'
    }
  },
  FILE_LIMITS: {
    MAX_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_TYPES: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
    ALLOWED_MIME_TYPES: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
    ALLOWED_EXTENSIONS: ['.pdf', '.docx', '.txt']
  },
  RATE_LIMITS: {
    COMPARE: {
      MAX_REQUESTS: 10,
      WINDOW_MINUTES: 1
    },
    UPLOAD: {
      MAX_REQUESTS: 20,
      WINDOW_MINUTES: 1
    }
  }
};

// Helper function to check if we're in development
export const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

/**
 * Environment Helpers - Consolidated environment variable access patterns
 * Eliminates scattered process.env calls across the codebase
 */
export const EnvironmentHelpers = {
  // Environment type checks
  isDevelopment: () => process.env.NODE_ENV === 'development',
  isProduction: () => process.env.NODE_ENV === 'production',
  isStaging: () => process.env.NODE_ENV === 'staging',
  isTest: () => process.env.NODE_ENV === 'test',
  
  // Project identity helpers
  getProjectName: () => process.env.PROJECT_NAME || 'vvg-template',
  getDisplayName: () => process.env.PROJECT_DISPLAY_NAME || 'Template App',
  getDomain: () => process.env.APP_DOMAIN || 'localhost:3000',
  
  // Environment-specific behaviors
  requireDevelopment: () => {
    if (EnvironmentHelpers.isProduction()) {
      throw new Error('Development-only feature accessed in production');
    }
  },
  
  // Production guard for dev-only routes (returns Response for immediate return)
  devOnlyResponse: () => EnvironmentHelpers.isProduction() 
    ? new Response(null, { status: 404 })
    : null,
    
  // Environment configuration getter
  getEnvOrThrow: (key: string, message?: string) => {
    const value = process.env[key];
    if (!value) {
      throw new Error(message || `Required environment variable ${key} is not set`);
    }
    return value;
  },
  
  // Environment configuration with default
  getEnvOrDefault: (key: string, defaultValue: string) => {
    return process.env[key] || defaultValue;
  },
  
  // Boolean environment variable helper
  getEnvBoolean: (key: string, defaultValue: boolean = false) => {
    const value = process.env[key];
    if (value === undefined) return defaultValue;
    return value.toLowerCase() === 'true' || value === '1';
  },
  
  // Numeric environment variable helper
  getEnvNumber: (key: string, defaultValue: number) => {
    const value = process.env[key];
    if (value === undefined) return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  },
  
  // Environment variable list helper (comma-separated)
  getEnvList: (key: string, defaultValue: string[] = []) => {
    const value = process.env[key];
    if (!value) return defaultValue;
    return value.split(',').map(item => item.trim()).filter(Boolean);
  },
  
  // Database access helper - consolidates DB_CREATE_ACCESS and memory store checks
  hasDbAccess: () => {
    // Check if we're using memory store (development mode)
    const hasMemoryStore = (global as any)._ndaMemoryStore;
    if (hasMemoryStore) return false;
    
    // Check if DB_CREATE_ACCESS is enabled
    const dbCreateAccess = process.env.DB_CREATE_ACCESS;
    return dbCreateAccess === 'true' || dbCreateAccess === '1';
  }
};

/**
 * Computed Configuration - Environment-aware values with helpers
 * Eliminates redundant environment checks across the codebase
 */
export const ComputedConfig = {
  // Environment information
  environment: {
    current: process.env.NODE_ENV as 'development' | 'production' | 'staging' | 'test',
    isDev: EnvironmentHelpers.isDevelopment(),
    isProd: EnvironmentHelpers.isProduction(),
    isStaging: EnvironmentHelpers.isStaging(),
    isTest: EnvironmentHelpers.isTest(),
  },
  
  // Project identity (computed once)
  project: {
    name: EnvironmentHelpers.getProjectName(),
    displayName: EnvironmentHelpers.getDisplayName(),
    domain: EnvironmentHelpers.getDomain(),
    basePath: EnvironmentHelpers.getEnvOrDefault('APP_BASE_PATH', `/${EnvironmentHelpers.getProjectName()}`),
  },
  
  // Feature flags based on environment
  features: {
    devBypass: EnvironmentHelpers.isDevelopment() && EnvironmentHelpers.getEnvBoolean('ALLOW_DEV_BYPASS'),
    debugLogging: EnvironmentHelpers.isDevelopment() || EnvironmentHelpers.getEnvBoolean('DEBUG_LOGGING'),
    rateLimiting: EnvironmentHelpers.isProduction() || EnvironmentHelpers.getEnvBoolean('ENABLE_RATE_LIMITING'),
    errorTracking: EnvironmentHelpers.isProduction() || EnvironmentHelpers.getEnvBoolean('ENABLE_ERROR_TRACKING'),
  },
  
  // Common URL patterns
  urls: {
    base: EnvironmentHelpers.isDevelopment() 
      ? `http://${EnvironmentHelpers.getDomain()}`
      : `https://${EnvironmentHelpers.getDomain()}`,
    api: `${EnvironmentHelpers.getProjectName()}/api`,
    auth: `${EnvironmentHelpers.getProjectName()}/api/auth`,
  },
  
  // Storage configuration
  storage: {
    provider: EnvironmentHelpers.getEnvOrDefault('STORAGE_PROVIDER', 'local') as 'local' | 's3',
    maxFileSize: EnvironmentHelpers.getEnvNumber('MAX_FILE_SIZE', 10 * 1024 * 1024), // 10MB default
    allowedTypes: EnvironmentHelpers.getEnvList('ALLOWED_FILE_TYPES', ['pdf', 'docx', 'txt']),
  },
};

/**
 * Enhanced APP_CONSTANTS with computed values to eliminate duplication
 */
export const APP_CONSTANTS_ENHANCED = {
  ...APP_CONSTANTS,
  
  // Environment-specific constants
  ENVIRONMENT: ComputedConfig.environment,
  PROJECT: ComputedConfig.project,
  FEATURES: ComputedConfig.features,
  
  // Headers with environment-aware values
  HEADERS: {
    DEV_BYPASS: 'x-dev-bypass',
    PROJECT_NAME: 'x-project-name',
    ENVIRONMENT: 'x-environment',
    
    RATE_LIMIT: {
      LIMIT: 'x-ratelimit-limit',
      REMAINING: 'x-ratelimit-remaining',
      RESET: 'x-ratelimit-reset',
    },
    
    TIMING: {
      PROCESSING_TIME: 'x-processing-time',
      QUEUE_TIME: 'x-queue-time',
    },
    
    CACHE: {
      CONTROL: 'cache-control',
      ETAG: 'etag',
      LAST_MODIFIED: 'last-modified',
    }
  },
  
  // Common error messages with environment context
  MESSAGES_ENHANCED: {
    ...APP_CONSTANTS.MESSAGES,
    ENVIRONMENT: {
      DEV_ONLY: 'This feature is only available in development mode',
      PROD_ONLY: 'This feature is only available in production mode',
      CONFIG_MISSING: (key: string) => `Required configuration ${key} is missing`,
      FEATURE_DISABLED: (feature: string) => `Feature ${feature} is disabled in this environment`,
    }
  },
  
  // Time constants
  TIME: {
    SECOND: 1000,
    MINUTE: 60 * 1000,
    HOUR: 60 * 60 * 1000,
    DAY: 24 * 60 * 60 * 1000,
    
    // Common durations
    SESSION_TIMEOUT: EnvironmentHelpers.getEnvNumber('SESSION_TIMEOUT_MINUTES', 30) * 60 * 1000,
    REQUEST_TIMEOUT: EnvironmentHelpers.getEnvNumber('REQUEST_TIMEOUT_SECONDS', 30) * 1000,
    CACHE_TTL: EnvironmentHelpers.getEnvNumber('CACHE_TTL_MINUTES', 60) * 60 * 1000,
  }
};

/**
 * Path Generation Utilities - Eliminates repetitive path construction patterns
 * Consolidates 40+ lines of repetitive path generation logic
 */
export const PathGenerators = {
  /**
   * Core path building function that applies project name consistently
   */
  buildPath: (segments: string[], withProject: boolean = true): string => {
    const projectName = EnvironmentHelpers.getProjectName();
    const parts = withProject ? [projectName, ...segments] : segments;
    return '/' + parts.filter(Boolean).join('/');
  },
  
  /**
   * Build full URL with domain and protocol
   */
  buildUrl: (path: string, includeProtocol: boolean = true): string => {
    const domain = EnvironmentHelpers.getDomain();
    const protocol = EnvironmentHelpers.isDevelopment() ? 'http' : 'https';
    const base = includeProtocol ? `${protocol}://${domain}` : domain;
    return base + (path.startsWith('/') ? path : `/${path}`);
  },
  
  /**
   * API path generators
   */
  api: {
    base: () => PathGenerators.buildPath(['api']),
    auth: () => PathGenerators.buildPath(['api', 'auth']),
    authCallback: (provider: string = 'azure-ad') => PathGenerators.buildPath(['api', 'auth', 'callback', provider]),
    upload: () => PathGenerators.buildPath(['api', 'upload']),
    documents: () => PathGenerators.buildPath(['api', 'documents']),
    compare: () => PathGenerators.buildPath(['api', 'compare']),
    dashboard: () => PathGenerators.buildPath(['api', 'dashboard']),
    processQueue: () => PathGenerators.buildPath(['api', 'process-queue']),
    
    // Dynamic API paths
    document: (id: string | number) => PathGenerators.buildPath(['api', 'documents', id.toString()]),
    comparison: (id: string | number) => PathGenerators.buildPath(['api', 'comparisons', id.toString()]),
  },
  
  /**
   * Page path generators
   */
  pages: {
    home: () => PathGenerators.buildPath([]),
    signIn: () => PathGenerators.buildPath(['sign-in']),
    dashboard: () => PathGenerators.buildPath(['dashboard']),
    documents: () => PathGenerators.buildPath(['documents']),
    compare: () => PathGenerators.buildPath(['compare']),
    upload: () => PathGenerators.buildPath(['upload']),
    
    // Dynamic page paths
    document: (id: string | number) => PathGenerators.buildPath(['documents', id.toString()]),
    documentEdit: (id: string | number) => PathGenerators.buildPath(['documents', id.toString(), 'edit']),
    comparison: (id: string | number) => PathGenerators.buildPath(['comparisons', id.toString()]),
  },
  
  /**
   * Storage path generators
   */
  storage: {
    userRoot: (userEmail: string) => `users/${userEmail.replace(/[^a-zA-Z0-9@.-]/g, '_')}`,
    userDocuments: (userEmail: string) => `${PathGenerators.storage.userRoot(userEmail)}/documents`,
    documentPath: (userEmail: string, fileHash: string, filename: string) => 
      `${PathGenerators.storage.userDocuments(userEmail)}/${fileHash}/${filename}`,
    
    // S3-specific paths
    s3Prefix: () => `${EnvironmentHelpers.getProjectName()}/`,
    s3UserPrefix: (userEmail: string) => `${PathGenerators.storage.s3Prefix()}${PathGenerators.storage.userRoot(userEmail)}`,
    s3DocumentPath: (userEmail: string, fileHash: string, filename: string) =>
      `${PathGenerators.storage.s3UserPrefix(userEmail)}/documents/${fileHash}/${filename}`,
  },
  
  /**
   * URL generators with full domain
   */
  urls: {
    base: () => PathGenerators.buildUrl(''),
    api: (endpoint: string) => PathGenerators.buildUrl(PathGenerators.api.base() + '/' + endpoint),
    page: (pagePath: string) => PathGenerators.buildUrl(pagePath),
    
    // Callback URLs for external services
    azureCallback: () => PathGenerators.buildUrl(PathGenerators.api.authCallback('azure-ad')),
    googleCallback: () => PathGenerators.buildUrl(PathGenerators.api.authCallback('google')),
    
    // NextAuth URL
    nextAuth: () => PathGenerators.buildUrl(PathGenerators.api.auth()),
  }
};

/**
 * Optimized config object with generated paths - replaces repetitive manual path construction
 */
export const OptimizedConfig = {
  ...config,
  
  // Override template.paths with generated ones to eliminate duplication
  template: {
    ...config.template,
    paths: {
      // Computed API paths using generators
      api: {
        auth: PathGenerators.api.auth(),
        authCallback: PathGenerators.api.authCallback(),
        upload: PathGenerators.api.upload(),
        documents: PathGenerators.api.documents(),
        compare: PathGenerators.api.compare(),
        dashboard: PathGenerators.api.dashboard(),
      },
      
      // Computed page paths using generators  
      pages: {
        signIn: PathGenerators.pages.signIn(),
        dashboard: PathGenerators.pages.dashboard(),
        documents: PathGenerators.pages.documents(),
        compare: PathGenerators.pages.compare(),
        upload: PathGenerators.pages.upload(),
      },
      
      // Computed URL paths using generators
      urls: {
        azureCallback: PathGenerators.urls.azureCallback(),
        googleCallback: PathGenerators.urls.googleCallback(),
        nextAuth: PathGenerators.urls.nextAuth(),
        base: PathGenerators.urls.base(),
      },
      
      // Storage paths
      storage: {
        s3Prefix: PathGenerators.storage.s3Prefix(),
        userDocuments: (userEmail: string) => PathGenerators.storage.userDocuments(userEmail),
        documentPath: (userEmail: string, fileHash: string, filename: string) =>
          PathGenerators.storage.documentPath(userEmail, fileHash, filename),
      }
    }
  }
};
