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
