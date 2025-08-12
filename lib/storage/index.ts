/**
 * Storage Abstraction Layer
 * 
 * Provides a unified interface for file storage that works with both
 * local filesystem (for development) and S3 (for production).
 */

import { LocalStorageProvider } from './local-provider';
import { S3StorageProvider } from './s3-provider';
import { config } from '@/lib/config';
import { Logger } from '@/lib/services/logger';
import { RetryUtils } from '@/lib/utils';
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
    StorageProvider.LOCAL;
  
  if (provider === StorageProvider.S3) {
    // Use S3 provider with centralized config as defaults
    const s3Config = {
      bucket: storageConfig?.s3?.bucket || config.S3_BUCKET_NAME,
      region: storageConfig?.s3?.region || config.AWS_REGION,
      accessKeyId: storageConfig?.s3?.accessKeyId || process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: storageConfig?.s3?.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY,
      endpoint: storageConfig?.s3?.endpoint || process.env.S3_ENDPOINT
    };
    
    console.log('Initializing S3 storage provider');
    storageInstance = new S3StorageProvider(s3Config);
  } else {
    // Use local provider with centralized config as default
    const basePath = storageConfig?.local?.basePath || 
      './storage';
    
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

/**
 * Execute storage operation with unified retry logic
 */
async function executeWithRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  metadata?: Record<string, any>
): Promise<T> {
  const result = await RetryUtils.forStorage(
    operation,
    operationName,
    {
      onRetry: (_error, attempt, delay) => {
        Logger.storage?.operation?.(
          `Attempting ${operationName} (attempt ${attempt})`,
          { ...metadata, delay }
        );
      },
      onFailure: (error, _attempts, _duration) => {
        Logger.storage?.error?.(
          `${operationName} failed permanently`,
          error
        );
      }
    }
  );
  
  Logger.storage?.success?.(
    `${operationName} completed`,
    { attempts: result.attempts, duration: result.totalDuration, ...metadata }
  );
  
  return result.result;
}

// isRetryableError is now handled by RetryUtils internally

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
 * Template-specific storage paths
 */
export const templatePaths = {
  /**
   * Get the path for an uploaded document
   */
  document: (userId: string, fileHash: string, filename: string): string =>
    `documents/${userId}/${fileHash}/${filename}`,
  
  /**
   * Get the path for a comparison result
   */
  comparison: (userId: string, comparisonId: string | number): string =>
    `comparisons/${userId}/${comparisonId}/result.json`,
  
  /**
   * Get the path for an export
   */
  export: (userId: string, exportId: string | number, format: 'pdf' | 'docx'): string =>
    `exports/${userId}/${exportId}/export.${format}`,
  
  /**
   * Get the path for temporary files
   */
  temp: (filename: string): string => 
    `temp/${filename}`
};

// Auto-initialize in development
if (config.IS_DEVELOPMENT && !storageInstance) {
  initializeStorage().catch(console.error);
}