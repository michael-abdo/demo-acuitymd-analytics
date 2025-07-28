/**
 * Path Resolver Utility
 * 
 * Consolidates all path operation patterns into a single, comprehensive interface.
 * Eliminates ~60+ lines of duplicated path building and manipulation logic across storage, config, and file operations.
 * Provides standardized path building for storage, URLs, file system operations, and database migrations.
 */

import path from 'path';
import { config } from '@/lib/config';

/**
 * Path types for different contexts
 */
export type PathContext = 
  | 'storage' | 'filesystem' | 'url' | 'api' | 's3' | 'local' | 'migration' | 'temp';

/**
 * Storage path options
 */
export interface StoragePathOptions {
  prefix?: string;
  environment?: string;
  sanitizeUser?: boolean;
  useTimestamp?: boolean;
}

/**
 * File path options
 */
export interface FilePathOptions {
  basePath?: string;
  createDir?: boolean;
  sanitize?: boolean;
  relative?: boolean;
}

/**
 * URL path options
 */
export interface UrlPathOptions {
  protocol?: string;
  domain?: string;
  port?: number;
  includeAuth?: boolean;
  query?: Record<string, string>;
}

/**
 * Comprehensive Path Resolver
 */
export class PathResolver {
  
  /**
   * Sanitize user identifier for file paths
   */
  static sanitizeUserIdentifier(userEmail: string): string {
    return userEmail.replace(/[^a-zA-Z0-9@.-]/g, '_');
  }
  
  /**
   * Sanitize filename for storage
   */
  static sanitizeFilename(filename: string): string {
    return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  }
  
  /**
   * Sanitize path key to prevent directory traversal
   */
  static sanitizePathKey(key: string): string {
    return key.replace(/\.\./g, '').replace(/\/+/g, '/');
  }
  
  /**
   * Normalize path separators and ensure proper format
   */
  static normalizePath(pathStr: string, options: { 
    ensureLeading?: boolean;
    ensureTrailing?: boolean;
    useForwardSlash?: boolean;
  } = {}): string {
    let normalized = pathStr;
    
    // Use forward slashes if specified
    if (options.useForwardSlash) {
      normalized = normalized.replace(/\\/g, '/');
    }
    
    // Ensure leading slash
    if (options.ensureLeading && !normalized.startsWith('/')) {
      normalized = '/' + normalized;
    }
    
    // Ensure trailing slash
    if (options.ensureTrailing && !normalized.endsWith('/')) {
      normalized = normalized + '/';
    }
    
    // Remove double slashes
    normalized = normalized.replace(/\/+/g, '/');
    
    return normalized;
  }
  
  /**
   * Get project working directory paths
   */
  static getProjectPaths() {
    const cwd = process.cwd();
    
    return {
      root: cwd,
      storage: path.join(cwd, '.storage'),
      migrations: path.join(cwd, 'database/migrations'),
      uploads: path.join(cwd, '.uploads'),
      temp: path.join(cwd, '.temp'),
      logs: path.join(cwd, 'logs'),
      config: path.join(cwd, '.env'),
      nodeModules: path.join(cwd, 'node_modules'),
      src: path.join(cwd, 'src'),
      lib: path.join(cwd, 'lib'),
      app: path.join(cwd, 'app')
    };
  }
  
  /**
   * Storage path builders (consolidates ndaPaths and PathGenerators.storage)
   */
  static storage = {
    /**
     * Get user root directory
     */
    userRoot: (userEmail: string, options: StoragePathOptions = {}): string => {
      const sanitized = options.sanitizeUser !== false 
        ? PathResolver.sanitizeUserIdentifier(userEmail)
        : userEmail;
      return `users/${sanitized}`;
    },
    
    /**
     * Get user documents directory
     */
    userDocuments: (userEmail: string, options: StoragePathOptions = {}): string => {
      return `${PathResolver.storage.userRoot(userEmail, options)}/documents`;
    },
    
    /**
     * Get document storage path
     */
    document: (
      userEmail: string, 
      fileHash: string, 
      filename: string, 
      options: StoragePathOptions = {}
    ): string => {
      const prefix = options.prefix || config.S3_FOLDER_PREFIX || '';
      const sanitizedFilename = PathResolver.sanitizeFilename(filename);
      const documentsPath = PathResolver.storage.userDocuments(userEmail, options);
      
      return `${prefix}${documentsPath}/${fileHash}/${sanitizedFilename}`;
    },
    
    /**
     * Get comparison result path
     */
    comparison: (
      userEmail: string, 
      comparisonId: string | number, 
      options: StoragePathOptions = {}
    ): string => {
      const prefix = options.prefix || config.S3_FOLDER_PREFIX || '';
      const userRoot = PathResolver.storage.userRoot(userEmail, options);
      
      return `${prefix}${userRoot}/comparisons/${comparisonId}/result.json`;
    },
    
    /**
     * Get export file path
     */
    export: (
      userEmail: string, 
      exportId: string | number, 
      format: 'pdf' | 'docx' | 'json', 
      options: StoragePathOptions = {}
    ): string => {
      const prefix = options.prefix || config.S3_FOLDER_PREFIX || '';
      const userRoot = PathResolver.storage.userRoot(userEmail, options);
      
      return `${prefix}${userRoot}/exports/${exportId}/report.${format}`;
    },
    
    /**
     * Get temporary file path
     */
    temp: (filename: string, options: StoragePathOptions = {}): string => {
      const prefix = options.prefix || config.S3_FOLDER_PREFIX || '';
      const sanitizedFilename = PathResolver.sanitizeFilename(filename);
      const timestamp = options.useTimestamp !== false ? Date.now() : '';
      
      return `${prefix}temp/${timestamp}-${sanitizedFilename}`;
    },
    
    /**
     * Get S3-specific path with proper prefix
     */
    s3Path: (
      userEmail: string, 
      resourceType: 'documents' | 'comparisons' | 'exports', 
      identifier: string,
      filename?: string,
      options: StoragePathOptions = {}
    ): string => {
      const s3Prefix = config.S3_FOLDER_PREFIX || '';
      const userRoot = PathResolver.storage.userRoot(userEmail, options);
      
      let resourcePath = `${s3Prefix}${userRoot}/${resourceType}/${identifier}`;
      
      if (filename) {
        const sanitizedFilename = PathResolver.sanitizeFilename(filename);
        resourcePath += `/${sanitizedFilename}`;
      }
      
      return resourcePath;
    },
    
    /**
     * Get backup path
     */
    backup: (
      userEmail: string, 
      resourceType: string, 
      timestamp: string | Date = new Date(),
      options: StoragePathOptions = {}
    ): string => {
      const prefix = options.prefix || config.S3_FOLDER_PREFIX || '';
      const userRoot = PathResolver.storage.userRoot(userEmail, options);
      const timestampStr = timestamp instanceof Date ? timestamp.toISOString() : timestamp;
      
      return `${prefix}${userRoot}/backups/${resourceType}/${timestampStr}`;
    }
  };
  
  /**
   * File system path operations (consolidates local-provider.ts patterns)
   */
  static filesystem = {
    /**
     * Get safe file path within base directory
     */
    safePath: (basePath: string, relativePath: string, options: FilePathOptions = {}): string => {
      const sanitized = options.sanitize !== false 
        ? PathResolver.sanitizePathKey(relativePath)
        : relativePath;
      
      const fullPath = path.join(basePath, sanitized);
      
      // Ensure the path is within the base directory (security)
      const resolvedBase = path.resolve(basePath);
      const resolvedPath = path.resolve(fullPath);
      
      if (!resolvedPath.startsWith(resolvedBase)) {
        throw new Error(`Path traversal attempt detected: ${relativePath}`);
      }
      
      return fullPath;
    },
    
    /**
     * Get directory path from file path
     */
    getDirectory: (filePath: string): string => {
      return path.dirname(filePath);
    },
    
    /**
     * Get filename from path
     */
    getFilename: (filePath: string, includeExtension: boolean = true): string => {
      return includeExtension ? path.basename(filePath) : path.basename(filePath, path.extname(filePath));
    },
    
    /**
     * Get file extension
     */
    getExtension: (filePath: string): string => {
      return path.extname(filePath);
    },
    
    /**
     * Join paths safely
     */
    join: (...pathSegments: string[]): string => {
      return path.join(...pathSegments);
    },
    
    /**
     * Resolve absolute path
     */
    resolve: (...pathSegments: string[]): string => {
      return path.resolve(...pathSegments);
    },
    
    /**
     * Get relative path between two paths
     */
    relative: (fromPath: string, toPath: string): string => {
      return path.relative(fromPath, toPath);
    },
    
    /**
     * Get metadata file path for a given file
     */
    getMetadataPath: (filePath: string, extension: string = '.meta.json'): string => {
      return filePath + extension;
    },
    
    /**
     * Check if path is within allowed directory
     */
    isWithinDirectory: (dirPath: string, filePath: string): boolean => {
      const resolvedDir = path.resolve(dirPath);
      const resolvedFile = path.resolve(filePath);
      return resolvedFile.startsWith(resolvedDir);
    }
  };
  
  /**
   * URL path builders (consolidates PathGenerators.urls)
   */
  static url = {
    /**
     * Build base URL
     */
    base: (options: UrlPathOptions = {}): string => {
      const protocol = options.protocol || config.NEXTAUTH_URL?.split('://')[0] || 'https';
      const domain = options.domain || config.NEXTAUTH_URL?.split('://')[1]?.split('/')[0] || 'localhost';
      const port = options.port || (protocol === 'https' ? 443 : 80);
      
      let baseUrl = `${protocol}://${domain}`;
      if ((protocol === 'http' && port !== 80) || (protocol === 'https' && port !== 443)) {
        baseUrl += `:${port}`;
      }
      
      return baseUrl;
    },
    
    /**
     * Build API endpoint URL
     */
    api: (endpoint: string, options: UrlPathOptions = {}): string => {
      const baseUrl = PathResolver.url.base(options);
      const normalizedEndpoint = PathResolver.normalizePath(endpoint, { ensureLeading: true });
      
      let url = `${baseUrl}/api${normalizedEndpoint}`;
      
      if (options.query) {
        const queryString = new URLSearchParams(options.query).toString();
        url += `?${queryString}`;
      }
      
      return url;
    },
    
    /**
     * Build page URL
     */
    page: (pagePath: string, options: UrlPathOptions = {}): string => {
      const baseUrl = PathResolver.url.base(options);
      const normalizedPath = PathResolver.normalizePath(pagePath, { ensureLeading: true });
      
      let url = `${baseUrl}${normalizedPath}`;
      
      if (options.query) {
        const queryString = new URLSearchParams(options.query).toString();
        url += `?${queryString}`;
      }
      
      return url;
    },
    
    /**
     * Build auth callback URL
     */
    authCallback: (provider: string, options: UrlPathOptions = {}): string => {
      return PathResolver.url.api(`/auth/callback/${provider}`, options);
    },
    
    /**
     * Build NextAuth URL
     */
    nextAuth: (options: UrlPathOptions = {}): string => {
      return PathResolver.url.api('/auth', options);
    },
    
    /**
     * Build download URL for files
     */
    download: (
      documentId: string | number, 
      filename?: string, 
      options: UrlPathOptions = {}
    ): string => {
      let endpoint = `/documents/${documentId}/download`;
      if (filename) {
        endpoint += `?filename=${encodeURIComponent(filename)}`;
      }
      
      return PathResolver.url.api(endpoint, options);
    },
    
    /**
     * Build signed URL parameters
     */
    signed: (
      path: string, 
      operation: 'get' | 'put', 
      expiresIn: number = 3600,
      options: UrlPathOptions = {}
    ): string => {
      const query = {
        operation,
        expires: (Date.now() + expiresIn * 1000).toString(),
        ...options.query
      };
      
      return PathResolver.url.api(path, { ...options, query });
    }
  };
  
  /**
   * Database and migration paths
   */
  static database = {
    /**
     * Get migration file path
     */
    migration: (filename: string): string => {
      const projectPaths = PathResolver.getProjectPaths();
      return path.join(projectPaths.migrations, filename);
    },
    
    /**
     * Get specific migration by name
     */
    migrationByName: (name: string): string => {
      return PathResolver.database.migration(`${name}.sql`);
    },
    
    /**
     * Get database backup path
     */
    backup: (timestamp: string | Date = new Date()): string => {
      const projectPaths = PathResolver.getProjectPaths();
      const timestampStr = timestamp instanceof Date 
        ? timestamp.toISOString().replace(/[:.]/g, '-')
        : timestamp;
      
      return path.join(projectPaths.root, 'backups', `db_${timestampStr}.sql`);
    }
  };
  
  /**
   * Utility functions for common path operations
   */
  static utils = {
    /**
     * Extract file info from path
     */
    getFileInfo: (filePath: string) => ({
      directory: path.dirname(filePath),
      filename: path.basename(filePath),
      name: path.basename(filePath, path.extname(filePath)),
      extension: path.extname(filePath),
      isAbsolute: path.isAbsolute(filePath)
    }),
    
    /**
     * Build path with multiple segments
     */
    buildPath: (segments: Array<string | number>, options: {
      separator?: string;
      sanitize?: boolean;
      normalize?: boolean;
    } = {}): string => {
      const separator = options.separator || '/';
      let result = segments
        .map(segment => String(segment))
        .filter(Boolean)
        .join(separator);
      
      if (options.sanitize) {
        result = PathResolver.sanitizePathKey(result);
      }
      
      if (options.normalize) {
        result = PathResolver.normalizePath(result);
      }
      
      return result;
    },
    
    /**
     * Check if path matches pattern
     */
    matchesPattern: (filePath: string, patterns: string[]): boolean => {
      const filename = path.basename(filePath).toLowerCase();
      return patterns.some(pattern => {
        const regex = new RegExp(pattern.replace(/\*/g, '.*').replace(/\?/g, '.'));
        return regex.test(filename);
      });
    },
    
    /**
     * Get common path prefix
     */
    getCommonPrefix: (paths: string[]): string => {
      if (paths.length === 0) return '';
      if (paths.length === 1) return path.dirname(paths[0]);
      
      const normalized = paths.map(p => path.normalize(p));
      let commonPrefix = normalized[0];
      
      for (let i = 1; i < normalized.length; i++) {
        while (!normalized[i].startsWith(commonPrefix)) {
          commonPrefix = path.dirname(commonPrefix);
          if (commonPrefix === path.dirname(commonPrefix)) break;
        }
      }
      
      return commonPrefix;
    }
  };
}

/**
 * Pre-built path resolvers for common use cases
 */
export const CommonPaths = {
  /**
   * Standard document storage paths
   */
  documents: {
    user: (userEmail: string) => PathResolver.storage.userDocuments(userEmail),
    upload: (userEmail: string, fileHash: string, filename: string) =>
      PathResolver.storage.document(userEmail, fileHash, filename),
    metadata: (userEmail: string, fileHash: string, filename: string) =>
      PathResolver.storage.document(userEmail, fileHash, filename) + '.meta.json'
  },
  
  /**
   * Standard comparison paths
   */
  comparisons: {
    result: (userEmail: string, comparisonId: string | number) =>
      PathResolver.storage.comparison(userEmail, comparisonId),
    export: (userEmail: string, comparisonId: string | number, format: 'pdf' | 'docx') =>
      PathResolver.storage.export(userEmail, comparisonId, format)
  },
  
  /**
   * Standard API endpoints
   */
  api: {
    documents: () => PathResolver.url.api('/documents'),
    documentById: (id: string | number) => PathResolver.url.api(`/documents/${id}`),
    compare: () => PathResolver.url.api('/compare'),
    upload: () => PathResolver.url.api('/upload'),
    processQueue: () => PathResolver.url.api('/process-queue')
  },
  
  /**
   * Standard file system paths
   */
  filesystem: {
    storage: () => PathResolver.getProjectPaths().storage,
    uploads: () => PathResolver.getProjectPaths().uploads,
    temp: () => PathResolver.getProjectPaths().temp,
    logs: () => PathResolver.getProjectPaths().logs
  }
};

/**
 * Convenience functions for quick path operations
 */
export const pathResolver = {
  /**
   * Quick document path
   */
  document: (userEmail: string, fileHash: string, filename: string) =>
    PathResolver.storage.document(userEmail, fileHash, filename),
  
  /**
   * Quick comparison path
   */
  comparison: (userEmail: string, comparisonId: string | number) =>
    PathResolver.storage.comparison(userEmail, comparisonId),
  
  /**
   * Quick temp path
   */
  temp: (filename: string) => PathResolver.storage.temp(filename),
  
  /**
   * Quick API URL
   */
  api: (endpoint: string) => PathResolver.url.api(endpoint),
  
  /**
   * Quick file system join
   */
  join: (...segments: string[]) => PathResolver.filesystem.join(...segments),
  
  /**
   * Quick sanitize
   */
  sanitize: (pathStr: string) => PathResolver.sanitizePathKey(pathStr),
  
  /**
   * Quick normalize
   */
  normalize: (pathStr: string) => PathResolver.normalizePath(pathStr)
};

export default PathResolver;