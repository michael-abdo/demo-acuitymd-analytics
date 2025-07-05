/**
 * Storage Abstraction Layer
 * 
 * Provides a unified interface for file storage that works with both
 * local filesystem (for development) and S3 (for production).
 */

import path from 'path';
import { LocalStorageProvider } from './local-provider';
import { S3StorageProvider } from './s3-provider';
import { config } from '@/lib/config';
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

/**
 * Storage facade for easier use
 */
export const storage = {
  /**
   * Initialize storage (must be called before using other methods)
   */
  async initialize(config?: Partial<StorageConfig>): Promise<void> {
    await initializeStorage(config);
  },
  
  /**
   * Upload a file
   */
  async upload(key: string, data: Buffer | Uint8Array | string, options?: UploadOptions): Promise<StorageFile> {
    return getStorage().upload(key, data, options);
  },
  
  /**
   * Download a file
   */
  async download(key: string): Promise<DownloadResult> {
    return getStorage().download(key);
  },
  
  /**
   * Delete a file
   */
  async delete(key: string, options?: DeleteOptions): Promise<DeleteResult> {
    return getStorage().delete(key, options);
  },
  
  /**
   * List files
   */
  async list(options?: ListOptions): Promise<ListResult> {
    return getStorage().list(options);
  },
  
  /**
   * Check if file exists
   */
  async exists(key: string): Promise<boolean> {
    return getStorage().exists(key);
  },
  
  /**
   * Get file metadata
   */
  async head(key: string): Promise<StorageFile | null> {
    return getStorage().head(key);
  },
  
  /**
   * Copy a file
   */
  async copy(sourceKey: string, destinationKey: string, options?: CopyOptions): Promise<StorageFile> {
    return getStorage().copy(sourceKey, destinationKey, options);
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