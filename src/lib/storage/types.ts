/**
 * Storage Abstraction Types
 * 
 * Type definitions for the storage abstraction layer that works with
 * both local filesystem and S3.
 */

/**
 * Storage provider types
 */
export enum StorageProvider {
  LOCAL = 'local',
  S3 = 's3'
}

/**
 * File metadata stored alongside files
 */
export interface FileMetadata {
  contentType: string;
  size: number;
  uploadedAt: Date;
  uploadedBy: string;
  originalName: string;
  hash?: string;
  custom?: Record<string, any>;
}

/**
 * Storage file information
 */
export interface StorageFile {
  key: string;
  size: number;
  lastModified: Date;
  contentType?: string;
  etag?: string;
  metadata?: FileMetadata;
}

/**
 * Upload options
 */
export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  acl?: 'private' | 'public-read';
  serverSideEncryption?: boolean;
}

/**
 * Download result
 */
export interface DownloadResult {
  data: Buffer;
  contentType?: string;
  metadata?: Record<string, string>;
  etag?: string;
  lastModified?: Date;
}

/**
 * List options
 */
export interface ListOptions {
  prefix?: string;
  delimiter?: string;
  maxKeys?: number;
  startAfter?: string;
}

/**
 * List result
 */
export interface ListResult {
  files: StorageFile[];
  isTruncated: boolean;
  nextContinuationToken?: string;
  commonPrefixes?: string[];
}

/**
 * Delete options
 */
export interface DeleteOptions {
  quiet?: boolean;
}

/**
 * Delete result
 */
export interface DeleteResult {
  deleted: boolean;
  errors?: Array<{
    key: string;
    code: string;
    message: string;
  }>;
}

/**
 * Copy options
 */
export interface CopyOptions {
  metadata?: Record<string, string>;
  metadataDirective?: 'COPY' | 'REPLACE';
  contentType?: string;
}

/**
 * Signed URL options
 */
export interface SignedUrlOptions {
  expires?: number; // seconds
  contentType?: string;
  contentDisposition?: string;
  responseContentType?: string;
}

/**
 * Storage configuration
 */
export interface StorageConfig {
  provider: StorageProvider;
  local?: {
    basePath: string;
    publicUrl?: string;
  };
  s3?: {
    bucket: string;
    region: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    endpoint?: string; // for S3-compatible services
  };
}

/**
 * Storage provider interface
 */
export interface IStorageProvider {
  /**
   * Upload a file
   */
  upload(key: string, data: Buffer | Uint8Array | string, options?: UploadOptions): Promise<StorageFile>;
  
  /**
   * Download a file
   */
  download(key: string): Promise<DownloadResult>;
  
  /**
   * Delete a file
   */
  delete(key: string, options?: DeleteOptions): Promise<DeleteResult>;
  
  /**
   * List files
   */
  list(options?: ListOptions): Promise<ListResult>;
  
  /**
   * Check if file exists
   */
  exists(key: string): Promise<boolean>;
  
  /**
   * Get file metadata without downloading
   */
  head(key: string): Promise<StorageFile | null>;
  
  /**
   * Copy a file
   */
  copy(sourceKey: string, destinationKey: string, options?: CopyOptions): Promise<StorageFile>;
  
  /**
   * Generate a signed URL for temporary access
   */
  getSignedUrl(key: string, operation: 'get' | 'put', options?: SignedUrlOptions): Promise<string>;
  
  /**
   * Get the provider type
   */
  getProvider(): StorageProvider;
}

/**
 * Error types
 */
export class StorageError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

export class FileNotFoundError extends StorageError {
  constructor(key: string) {
    super(`File not found: ${key}`, 'FILE_NOT_FOUND', 404);
  }
}

export class AccessDeniedError extends StorageError {
  constructor(key: string, operation: string) {
    super(`Access denied for ${operation} on ${key}`, 'ACCESS_DENIED', 403);
  }
}

export class StorageQuotaError extends StorageError {
  constructor(message: string) {
    super(message, 'QUOTA_EXCEEDED', 507);
  }
}