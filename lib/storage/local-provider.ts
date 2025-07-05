/**
 * Local Filesystem Storage Provider
 * 
 * Implements S3-like storage using the local filesystem for development
 * without S3 access. Files are stored with accompanying metadata.
 */

import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  IStorageProvider,
  StorageProvider,
  StorageFile,
  FileMetadata,
  UploadOptions,
  DownloadResult,
  ListOptions,
  ListResult,
  DeleteOptions,
  DeleteResult,
  CopyOptions,
  SignedUrlOptions,
  FileNotFoundError,
  StorageError
} from './types';

export class LocalStorageProvider implements IStorageProvider {
  private basePath: string;
  private metadataExt = '.meta.json';

  constructor(basePath: string) {
    this.basePath = path.resolve(basePath);
  }

  async initialize(): Promise<void> {
    // Ensure base directory exists
    await fs.mkdir(this.basePath, { recursive: true });
  }

  private getFilePath(key: string): string {
    // Sanitize key to prevent directory traversal
    const sanitizedKey = key.replace(/\.\./g, '');
    return path.join(this.basePath, sanitizedKey);
  }

  private getMetadataPath(filePath: string): string {
    return filePath + this.metadataExt;
  }

  private async saveMetadata(filePath: string, metadata: FileMetadata): Promise<void> {
    const metadataPath = this.getMetadataPath(filePath);
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
  }

  private async loadMetadata(filePath: string): Promise<FileMetadata | null> {
    try {
      const metadataPath = this.getMetadataPath(filePath);
      const data = await fs.readFile(metadataPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  private calculateEtag(data: Buffer): string {
    return crypto.createHash('md5').update(data).digest('hex');
  }

  async upload(key: string, data: Buffer | Uint8Array | string, options?: UploadOptions): Promise<StorageFile> {
    const filePath = this.getFilePath(key);
    const dirPath = path.dirname(filePath);
    
    // Ensure directory exists
    await fs.mkdir(dirPath, { recursive: true });
    
    // Convert data to Buffer
    let buffer: Buffer;
    if (Buffer.isBuffer(data)) {
      buffer = data;
    } else if (typeof data === 'string') {
      buffer = Buffer.from(data);
    } else {
      buffer = Buffer.from(data as Uint8Array);
    }
    
    // Write file
    await fs.writeFile(filePath, buffer);
    
    // Prepare metadata
    const metadata: FileMetadata = {
      contentType: options?.contentType || 'application/octet-stream',
      size: buffer.length,
      uploadedAt: new Date(),
      uploadedBy: options?.metadata?.uploadedBy || 'system',
      originalName: options?.metadata?.originalName || path.basename(key),
      hash: this.calculateEtag(buffer),
      custom: options?.metadata
    };
    
    // Save metadata
    await this.saveMetadata(filePath, metadata);
    
    // Return file info
    return {
      key,
      size: buffer.length,
      lastModified: new Date(),
      contentType: metadata.contentType,
      etag: metadata.hash,
      metadata
    };
  }

  async download(key: string): Promise<DownloadResult> {
    const filePath = this.getFilePath(key);
    
    try {
      const [data, metadata] = await Promise.all([
        fs.readFile(filePath),
        this.loadMetadata(filePath)
      ]);
      
      return {
        data,
        contentType: metadata?.contentType,
        metadata: metadata?.custom,
        etag: metadata?.hash,
        lastModified: metadata?.uploadedAt
      };
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new FileNotFoundError(key);
      }
      throw new StorageError(`Failed to download file: ${error.message}`, 'DOWNLOAD_ERROR');
    }
  }

  async delete(key: string, options?: DeleteOptions): Promise<DeleteResult> {
    const filePath = this.getFilePath(key);
    const metadataPath = this.getMetadataPath(filePath);
    
    try {
      await Promise.all([
        fs.unlink(filePath),
        fs.unlink(metadataPath).catch(() => {}) // Ignore if metadata doesn't exist
      ]);
      
      // Try to remove empty directories
      const dirPath = path.dirname(filePath);
      if (dirPath !== this.basePath) {
        try {
          await fs.rmdir(dirPath);
        } catch {
          // Directory not empty or other error, ignore
        }
      }
      
      return { deleted: true };
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return { deleted: false };
      }
      
      if (!options?.quiet) {
        throw new StorageError(`Failed to delete file: ${error.message}`, 'DELETE_ERROR');
      }
      
      return {
        deleted: false,
        errors: [{
          key,
          code: error.code,
          message: error.message
        }]
      };
    }
  }

  async list(options?: ListOptions): Promise<ListResult> {
    const prefix = options?.prefix || '';
    const delimiter = options?.delimiter;
    const maxKeys = options?.maxKeys || 1000;
    const startAfter = options?.startAfter;
    
    const results: StorageFile[] = [];
    const commonPrefixes = new Set<string>();
    
    async function* walkDir(dir: string, baseDir: string): AsyncGenerator<string> {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(baseDir, fullPath);
        
        if (entry.isDirectory()) {
          yield* walkDir(fullPath, baseDir);
        } else if (!entry.name.endsWith('.meta.json')) {
          yield relativePath;
        }
      }
    }
    
    // Convert paths to forward slashes for consistency
    const normalizeKey = (key: string) => key.replace(/\\/g, '/');
    
    let count = 0;
    let isTruncated = false;
    let foundStartAfter = !startAfter;
    
    for await (const file of walkDir(this.basePath, this.basePath)) {
      const key = normalizeKey(file);
      
      // Skip if before startAfter
      if (!foundStartAfter) {
        if (key === startAfter) {
          foundStartAfter = true;
        }
        continue;
      }
      
      // Check prefix
      if (prefix && !key.startsWith(prefix)) {
        continue;
      }
      
      // Handle delimiter (folder simulation)
      if (delimiter && prefix) {
        const keyWithoutPrefix = key.slice(prefix.length);
        const delimiterIndex = keyWithoutPrefix.indexOf(delimiter);
        
        if (delimiterIndex !== -1) {
          const commonPrefix = prefix + keyWithoutPrefix.slice(0, delimiterIndex + delimiter.length);
          commonPrefixes.add(commonPrefix);
          continue;
        }
      }
      
      if (count >= maxKeys) {
        isTruncated = true;
        break;
      }
      
      const filePath = this.getFilePath(key);
      const stats = await fs.stat(filePath);
      const metadata = await this.loadMetadata(filePath);
      
      results.push({
        key,
        size: stats.size,
        lastModified: stats.mtime,
        contentType: metadata?.contentType,
        etag: metadata?.hash,
        metadata: metadata || undefined
      });
      
      count++;
    }
    
    return {
      files: results,
      isTruncated,
      commonPrefixes: Array.from(commonPrefixes).sort()
    };
  }

  async exists(key: string): Promise<boolean> {
    const filePath = this.getFilePath(key);
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async head(key: string): Promise<StorageFile | null> {
    const filePath = this.getFilePath(key);
    
    try {
      const [stats, metadata] = await Promise.all([
        fs.stat(filePath),
        this.loadMetadata(filePath)
      ]);
      
      return {
        key,
        size: stats.size,
        lastModified: stats.mtime,
        contentType: metadata?.contentType,
        etag: metadata?.hash,
        metadata: metadata || undefined
      };
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw new StorageError(`Failed to get file info: ${error.message}`, 'HEAD_ERROR');
    }
  }

  async copy(sourceKey: string, destinationKey: string, options?: CopyOptions): Promise<StorageFile> {
    const sourcePath = this.getFilePath(sourceKey);
    const destPath = this.getFilePath(destinationKey);
    const destDir = path.dirname(destPath);
    
    // Ensure destination directory exists
    await fs.mkdir(destDir, { recursive: true });
    
    try {
      // Copy file
      await fs.copyFile(sourcePath, destPath);
      
      // Handle metadata
      const sourceMetadata = await this.loadMetadata(sourcePath);
      if (sourceMetadata) {
        let destMetadata = sourceMetadata;
        
        if (options?.metadataDirective === 'REPLACE' && options.metadata) {
          destMetadata = {
            ...sourceMetadata,
            custom: options.metadata,
            contentType: options.contentType || sourceMetadata.contentType
          };
        }
        
        await this.saveMetadata(destPath, destMetadata);
      }
      
      // Get file info
      const stats = await fs.stat(destPath);
      
      return {
        key: destinationKey,
        size: stats.size,
        lastModified: new Date(),
        contentType: sourceMetadata?.contentType,
        etag: sourceMetadata?.hash,
        metadata: sourceMetadata || undefined
      };
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new FileNotFoundError(sourceKey);
      }
      throw new StorageError(`Failed to copy file: ${error.message}`, 'COPY_ERROR');
    }
  }

  async getSignedUrl(key: string, operation: 'get' | 'put', options?: SignedUrlOptions): Promise<string> {
    // For local storage, return a simple URL that can be handled by the application
    const expires = options?.expires || 3600;
    const timestamp = Date.now();
    const signature = crypto
      .createHash('sha256')
      .update(`${key}:${operation}:${timestamp}:${expires}`)
      .digest('hex');
    
    // This URL format can be parsed and validated by the application
    return `local://${key}?op=${operation}&ts=${timestamp}&exp=${expires}&sig=${signature}`;
  }

  getProvider(): StorageProvider {
    return StorageProvider.LOCAL;
  }
}