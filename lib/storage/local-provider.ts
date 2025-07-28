/**
 * Local File Storage Provider
 * 
 * Implements local filesystem storage for development and testing
 */

import fs from 'fs/promises';
import path from 'path';
import { 
  IStorageProvider, 
  StorageProvider,
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

export class LocalStorageProvider implements IStorageProvider {
  private basePath: string;

  constructor(basePath: string = './storage') {
    this.basePath = basePath;
  }

  async initialize(): Promise<void> {
    // Ensure base directory exists
    await fs.mkdir(this.basePath, { recursive: true });
  }

  getProvider(): StorageProvider {
    return StorageProvider.LOCAL;
  }

  async upload(key: string, data: Buffer | Uint8Array | string, options?: UploadOptions): Promise<StorageFile> {
    const filePath = path.join(this.basePath, key);
    const dir = path.dirname(filePath);
    
    // Ensure directory exists
    await fs.mkdir(dir, { recursive: true });
    
    // Write file
    await fs.writeFile(filePath, data);
    
    const stats = await fs.stat(filePath);
    
    return {
      key,
      size: stats.size,
      lastModified: stats.mtime,
      contentType: options?.contentType
    };
  }

  async download(key: string): Promise<DownloadResult> {
    const filePath = path.join(this.basePath, key);
    const data = await fs.readFile(filePath);
    const stats = await fs.stat(filePath);
    
    return {
      data,
      lastModified: stats.mtime
    };
  }

  async delete(key: string, options?: DeleteOptions): Promise<DeleteResult> {
    const filePath = path.join(this.basePath, key);
    await fs.unlink(filePath);
    return { deleted: true };
  }

  async exists(key: string): Promise<boolean> {
    try {
      const filePath = path.join(this.basePath, key);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async getSignedUrl(key: string, operation: 'get' | 'put', options?: SignedUrlOptions): Promise<string> {
    // For local storage, return a file:// URL
    const filePath = path.join(this.basePath, key);
    return `file://${filePath}`;
  }

  async list(options?: ListOptions): Promise<ListResult> {
    const { prefix = '', maxKeys = 1000 } = options || {};
    const searchPath = path.join(this.basePath, prefix);
    
    try {
      const files: StorageFile[] = [];
      const walk = async (dir: string, currentPrefix: string = '') => {
        if (files.length >= maxKeys) return;
        
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          if (files.length >= maxKeys) break;
          
          const fullPath = path.join(dir, entry.name);
          const relativePath = path.join(currentPrefix, entry.name);
          
          if (entry.isDirectory()) {
            await walk(fullPath, relativePath);
          } else {
            const stats = await fs.stat(fullPath);
            files.push({
              key: relativePath,
              size: stats.size,
              lastModified: stats.mtime
            });
          }
        }
      };
      
      if (await this.exists(prefix)) {
        const stats = await fs.stat(searchPath);
        if (stats.isDirectory()) {
          await walk(searchPath);
        } else {
          files.push({
            key: prefix,
            size: stats.size,
            lastModified: stats.mtime
          });
        }
      }
      
      return {
        files,
        isTruncated: false,
        nextContinuationToken: undefined
      };
    } catch (error) {
      return {
        files: [],
        isTruncated: false,
        nextContinuationToken: undefined
      };
    }
  }

  async head(key: string): Promise<StorageFile | null> {
    try {
      const filePath = path.join(this.basePath, key);
      const stats = await fs.stat(filePath);
      
      return {
        key,
        size: stats.size,
        lastModified: stats.mtime
      };
    } catch {
      return null;
    }
  }

  async copy(sourceKey: string, destinationKey: string, options?: CopyOptions): Promise<StorageFile> {
    const sourcePath = path.join(this.basePath, sourceKey);
    const destPath = path.join(this.basePath, destinationKey);
    const destDir = path.dirname(destPath);
    
    // Ensure destination directory exists
    await fs.mkdir(destDir, { recursive: true });
    
    // Copy file
    await fs.copyFile(sourcePath, destPath);
    
    const stats = await fs.stat(destPath);
    
    return {
      key: destinationKey,
      size: stats.size,
      lastModified: stats.mtime
    };
  }
}