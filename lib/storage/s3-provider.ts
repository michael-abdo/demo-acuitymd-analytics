/**
 * S3 Storage Provider
 * 
 * Implements storage using AWS S3 for production use.
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
  CopyObjectCommand,
  GetObjectCommandOutput
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
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
  SignedUrlOptions,
  FileNotFoundError,
  AccessDeniedError,
  StorageError
} from './types';

export class S3StorageProvider implements IStorageProvider {
  private client: S3Client;
  private bucket: string;

  constructor(config: {
    bucket: string;
    region: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    endpoint?: string;
  }) {
    this.bucket = config.bucket;
    
    this.client = new S3Client({
      region: config.region,
      ...(config.accessKeyId && config.secretAccessKey && {
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey
        }
      }),
      ...(config.endpoint && { endpoint: config.endpoint })
    });
  }

  private handleS3Error(error: any, key: string, operation: string): never {
    if (error.Code === 'NoSuchKey' || error.Code === 'NotFound') {
      throw new FileNotFoundError(key);
    }
    
    if (error.Code === 'AccessDenied' || error.Code === 'Forbidden') {
      throw new AccessDeniedError(key, operation);
    }
    
    throw new StorageError(
      error.message || 'S3 operation failed',
      error.Code || 'S3_ERROR',
      error.$metadata?.httpStatusCode,
      error
    );
  }

  async upload(key: string, data: Buffer | Uint8Array | string, options?: UploadOptions): Promise<StorageFile> {
    try {
      const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
      
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: options?.contentType || 'application/octet-stream',
        Metadata: options?.metadata,
        ACL: options?.acl,
        ...(options?.serverSideEncryption && {
          ServerSideEncryption: 'AES256'
        })
      });
      
      const response = await this.client.send(command);
      
      return {
        key,
        size: buffer.length,
        lastModified: new Date(),
        contentType: options?.contentType,
        etag: response.ETag?.replace(/"/g, '')
      };
    } catch (error: any) {
      this.handleS3Error(error, key, 'upload');
    }
  }

  async download(key: string): Promise<DownloadResult> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key
      });
      
      const response = await this.client.send(command);
      
      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      const stream = response.Body as any;
      
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      
      const data = Buffer.concat(chunks);
      
      return {
        data,
        contentType: response.ContentType,
        metadata: response.Metadata,
        etag: response.ETag?.replace(/"/g, ''),
        lastModified: response.LastModified
      };
    } catch (error: any) {
      this.handleS3Error(error, key, 'download');
    }
  }

  async delete(key: string, options?: DeleteOptions): Promise<DeleteResult> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key
      });
      
      await this.client.send(command);
      
      return { deleted: true };
    } catch (error: any) {
      if (options?.quiet) {
        return {
          deleted: false,
          errors: [{
            key,
            code: error.Code || 'DELETE_ERROR',
            message: error.message
          }]
        };
      }
      
      this.handleS3Error(error, key, 'delete');
    }
  }

  async list(options?: ListOptions): Promise<ListResult> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: options?.prefix,
        Delimiter: options?.delimiter,
        MaxKeys: options?.maxKeys || 1000,
        StartAfter: options?.startAfter
      });
      
      const response = await this.client.send(command);
      
      const files: StorageFile[] = (response.Contents || []).map(item => ({
        key: item.Key!,
        size: item.Size!,
        lastModified: item.LastModified!,
        etag: item.ETag?.replace(/"/g, '')
      }));
      
      return {
        files,
        isTruncated: response.IsTruncated || false,
        nextContinuationToken: response.NextContinuationToken,
        commonPrefixes: response.CommonPrefixes?.map(p => p.Prefix!) || []
      };
    } catch (error: any) {
      this.handleS3Error(error, options?.prefix || '', 'list');
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key
      });
      
      await this.client.send(command);
      return true;
    } catch (error: any) {
      if (error.Code === 'NoSuchKey' || error.Code === 'NotFound') {
        return false;
      }
      this.handleS3Error(error, key, 'exists');
    }
  }

  async head(key: string): Promise<StorageFile | null> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key
      });
      
      const response = await this.client.send(command);
      
      return {
        key,
        size: response.ContentLength!,
        lastModified: response.LastModified!,
        contentType: response.ContentType,
        etag: response.ETag?.replace(/"/g, ''),
        metadata: {
          contentType: response.ContentType!,
          size: response.ContentLength!,
          uploadedAt: response.LastModified!,
          uploadedBy: response.Metadata?.uploadedBy || 'unknown',
          originalName: response.Metadata?.originalName || key,
          custom: response.Metadata
        }
      };
    } catch (error: any) {
      if (error.Code === 'NoSuchKey' || error.Code === 'NotFound') {
        return null;
      }
      this.handleS3Error(error, key, 'head');
    }
  }

  async copy(sourceKey: string, destinationKey: string, options?: CopyOptions): Promise<StorageFile> {
    try {
      const command = new CopyObjectCommand({
        Bucket: this.bucket,
        CopySource: `${this.bucket}/${sourceKey}`,
        Key: destinationKey,
        MetadataDirective: options?.metadataDirective,
        Metadata: options?.metadata,
        ContentType: options?.contentType
      });
      
      const response = await this.client.send(command);
      
      // Get file info
      const headResult = await this.head(destinationKey);
      
      if (!headResult) {
        throw new StorageError('Copy succeeded but could not retrieve file info', 'COPY_VERIFY_ERROR');
      }
      
      return headResult;
    } catch (error: any) {
      this.handleS3Error(error, sourceKey, 'copy');
    }
  }

  async getSignedUrl(key: string, operation: 'get' | 'put', options?: SignedUrlOptions): Promise<string> {
    try {
      const command = operation === 'get'
        ? new GetObjectCommand({
            Bucket: this.bucket,
            Key: key,
            ResponseContentType: options?.responseContentType,
            ResponseContentDisposition: options?.contentDisposition
          })
        : new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            ContentType: options?.contentType
          });
      
      return await getSignedUrl(this.client, command, {
        expiresIn: options?.expires || 3600
      });
    } catch (error: any) {
      this.handleS3Error(error, key, 'getSignedUrl');
    }
  }

  getProvider(): StorageProvider {
    return StorageProvider.S3;
  }
}