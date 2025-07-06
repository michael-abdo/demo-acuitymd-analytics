/**
 * Storage Abstraction Layer
 * 
 * Provides a unified interface for file storage that works with both
 * local filesystem (for development) and S3 (for production).
 */

import path from 'path';
import { LocalStorageProvider } from './local-provider';
import { S3StorageProvider } from './s3-provider';
import { config, APP_CONSTANTS } from '@/lib/config';
import { Logger } from '@/lib/services/logger';
import { 
  IStorageProvider, 
  StorageProvider, 
  StorageConfig,
  StorageFile,
  UploadOptions,
  DownloadResult,
  ListOptions,
  ListResult,
  DeleteOptions,
  DeleteResult,
  CopyOptions,
  SignedUrlOptions
} from './types';

// Export all types
export * from './types';

/**
 * Storage instance singleton
 */
let storageInstance: IStorageProvider | null = null;

/**
 * Initialize storage with configuration
 */
export async function initializeStorage(storageConfig?: Partial<StorageConfig>): Promise<IStorageProvider> {
  // Determine provider from passed config or centralized config
  const provider = storageConfig?.provider || 
    (config.STORAGE_PROVIDER as StorageProvider) || 
    (config.S3_ACCESS ? StorageProvider.S3 : StorageProvider.LOCAL);
  
  if (provider === StorageProvider.S3) {
    // Use S3 provider with centralized config as defaults
    const s3Config = {
      bucket: storageConfig?.s3?.bucket || config.S3_BUCKET_NAME || 'vvg-cloud-storage',
      region: storageConfig?.s3?.region || config.AWS_REGION || 'us-west-2',
      accessKeyId: storageConfig?.s3?.accessKeyId || config.AWS_ACCESS_KEY_ID,
      secretAccessKey: storageConfig?.s3?.secretAccessKey || config.AWS_SECRET_ACCESS_KEY,
      endpoint: storageConfig?.s3?.endpoint || config.S3_ENDPOINT
    };
    
    console.log('Initializing S3 storage provider');
    storageInstance = new S3StorageProvider(s3Config);
  } else {
    // Use local provider with centralized config as default
    const basePath = storageConfig?.local?.basePath || 
      config.LOCAL_STORAGE_PATH || 
      path.join(process.cwd(), '.storage');
    
    console.log(`Initializing local storage provider at: ${basePath}`);
    const localProvider = new LocalStorageProvider(basePath);
    await localProvider.initialize();
    storageInstance = localProvider;
  }
  
  return storageInstance;
}

/**
 * Get the current storage instance
 */
export function getStorage(): IStorageProvider {
  if (!storageInstance) {
    throw new Error('Storage not initialized. Call initializeStorage() first.');
  }
  return storageInstance;
}

/**
 * Ensure storage is initialized (idempotent)
 */
export async function ensureStorageInitialized(config?: Partial<StorageConfig>): Promise<IStorageProvider> {
  if (!storageInstance) {
    return await initializeStorage(config);
  }
  return storageInstance;
}

// Retry logic integrated into main storage interface
interface StorageOperationResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  duration: number;
}

/**
 * Execute storage operation with retry logic
 */
async function executeWithRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  metadata?: Record<string, any>
): Promise<T> {
  const startTime = Date.now();
  const maxRetries = APP_CONSTANTS.STORAGE?.MAX_RETRIES || 3;
  const retryDelay = APP_CONSTANTS.STORAGE?.RETRY_DELAY || 1000;
  
  let lastError: Error | undefined;
  let attempts = 0;

  while (attempts < maxRetries) {
    attempts++;
    
    try {
      Logger.storage?.operation?.(
        `Attempting ${operationName} (attempt ${attempts}/${maxRetries})`,
        metadata
      );
      
      const data = await operation();
      
      const duration = Date.now() - startTime;
      Logger.storage?.success?.(
        `${operationName} completed`,
        { attempts, duration, ...metadata }
      );
      
      return data;
    } catch (error) {
      lastError = error as Error;
      
      Logger.storage?.error?.(
        `${operationName} failed (attempt ${attempts}/${maxRetries})`,
        error as Error
      );
      
      // Check if error is retryable
      if (!isRetryableError(error)) {
        break;
      }
      
      // Wait before retrying (exponential backoff)
      if (attempts < maxRetries) {
        const delay = retryDelay * Math.pow(2, attempts - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // If we get here, all retries failed
  const duration = Date.now() - startTime;
  throw lastError || new Error(`${operationName} failed after ${attempts} attempts`);
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error: any): boolean {
  // Network errors
  if (error.code === 'ECONNREFUSED' || 
      error.code === 'ETIMEDOUT' || 
      error.code === 'ENOTFOUND') {
    return true;
  }
  
  // AWS S3 throttling errors
  if (error.code === 'SlowDown' || 
      error.code === 'RequestLimitExceeded' ||
      error.code === 'ServiceUnavailable' ||
      error.code === 'RequestTimeout') {
    return true;
  }
  
  // Don't retry access denied or not found errors
  if (error.code === 'AccessDenied' || 
      error.code === 'NoSuchKey' || 
      error.code === 'NoSuchBucket' ||
      error.code === 'Forbidden') {
    return false;
  }
  
  // Retry 5xx errors but not 4xx
  if (error.statusCode >= 500 && error.statusCode < 600) {
    return true;
  }
  
  return false;
}

/**
 * Storage facade for easier use (now with built-in retry logic)
 */
export const storage = {
  /**
   * Initialize storage (must be called before using other methods)
   */
  async initialize(config?: Partial<StorageConfig>): Promise<void> {
    await initializeStorage(config);
  },
  
  /**
   * Upload a file (with retry logic)
   */
  async upload(key: string, data: Buffer | Uint8Array | string, options?: UploadOptions): Promise<StorageFile> {
    return executeWithRetry(
      () => getStorage().upload(key, data, options),
      'storage.upload',
      { key, size: data.length, contentType: options?.contentType }
    );
  },
  
  /**
   * Download a file (with retry logic)
   */
  async download(key: string): Promise<DownloadResult> {
    return executeWithRetry(
      () => getStorage().download(key),
      'storage.download',
      { key }
    );
  },
  
  /**
   * Delete a file (with retry logic)
   */
  async delete(key: string, options?: DeleteOptions): Promise<DeleteResult> {
    return executeWithRetry(
      () => getStorage().delete(key, options),
      'storage.delete',
      { key }
    );
  },
  
  /**
   * List files (with retry logic)
   */
  async list(options?: ListOptions): Promise<ListResult> {
    return executeWithRetry(
      () => getStorage().list(options),
      'storage.list',
      { prefix: options?.prefix }
    );
  },
  
  /**
   * Check if file exists (with retry logic)
   */
  async exists(key: string): Promise<boolean> {
    return executeWithRetry(
      () => getStorage().exists(key),
      'storage.exists',
      { key }
    );
  },
  
  /**
   * Get file metadata (with retry logic)
   */
  async head(key: string): Promise<StorageFile | null> {
    return executeWithRetry(
      () => getStorage().head(key),
      'storage.head',
      { key }
    );
  },
  
  /**
   * Copy a file (with retry logic)
   */
  async copy(sourceKey: string, destinationKey: string, options?: CopyOptions): Promise<StorageFile> {
    return executeWithRetry(
      () => getStorage().copy(sourceKey, destinationKey, options),
      'storage.copy',
      { sourceKey, destinationKey }
    );
  },
  
  /**
   * Get a signed URL
   */
  async getSignedUrl(key: string, operation: 'get' | 'put', options?: SignedUrlOptions): Promise<string> {
    return getStorage().getSignedUrl(key, operation, options);
  },
  
  /**
   * Get the current provider type
   */
  getProvider(): StorageProvider {
    return getStorage().getProvider();
  },
  
  /**
   * Check if using local storage
   */
  isLocal(): boolean {
    return getStorage().getProvider() === StorageProvider.LOCAL;
  },
  
  /**
   * Check if using S3 storage
   */
  isS3(): boolean {
    return getStorage().getProvider() === StorageProvider.S3;
  }
};

/**
 * NDA-specific storage paths
 */
export const ndaPaths = {
  /**
   * Get the path for an uploaded document
   */
  document(userId: string, fileHash: string, filename: string): string {
    const prefix = config.S3_FOLDER_PREFIX;
    return `${prefix}users/${userId}/documents/${fileHash}/${filename}`;
  },
  
  /**
   * Get the path for a comparison result
   */
  comparison(userId: string, comparisonId: string | number): string {
    const prefix = config.S3_FOLDER_PREFIX;
    return `${prefix}users/${userId}/comparisons/${comparisonId}/result.json`;
  },
  
  /**
   * Get the path for an export
   */
  export(userId: string, exportId: string | number, format: 'pdf' | 'docx'): string {
    const prefix = config.S3_FOLDER_PREFIX;
    return `${prefix}users/${userId}/exports/${exportId}/report.${format}`;
  },
  
  /**
   * Get the path for temporary files
   */
  temp(filename: string): string {
    const prefix = config.S3_FOLDER_PREFIX;
    return `${prefix}temp/${Date.now()}-${filename}`;
  }
};

// Auto-initialize in development
if (config.IS_DEVELOPMENT && !storageInstance) {
  initializeStorage().catch(console.error);
}