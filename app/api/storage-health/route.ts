export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { config } from '@/lib/config';
import { ApiResponse, ApiErrors, Logger, TimestampUtils } from '@/lib/auth-utils';

export async function GET() {
  try {
    // Initialize storage if not already done
    await storage.initialize();
    
    const provider = storage.getProvider();
    const isLocal = storage.isLocal();
    
    // Create a test file
    const testKey = `health-check/${Date.now()}-test.txt`;
    const testContent = `Storage health check - ${TimestampUtils.now()}`;
    const testBuffer = Buffer.from(testContent, 'utf-8');
    
    // Test upload
    const uploadResult = await storage.upload(testKey, testBuffer, {
      contentType: 'text/plain',
      metadata: {
        uploadedBy: 'health-check',
        originalName: 'health-check.txt',
        test: 'true'
      }
    });
    
    // Test exists
    const exists = await storage.exists(testKey);
    
    // Test head (metadata)
    const headResult = await storage.head(testKey);
    
    // Test download
    const downloadResult = await storage.download(testKey);
    const downloadedContent = downloadResult.data.toString('utf-8');
    
    // Test list
    const listResult = await storage.list({
      prefix: 'health-check/',
      maxKeys: 10
    });
    
    // Test signed URL generation
    let signedUrl: string | null = null;
    try {
      signedUrl = await storage.getSignedUrl(testKey, 'get', { expires: 300 });
    } catch (error) {
      // Signed URLs might not work in local mode, that's okay
      signedUrl = isLocal ? 'Not supported in local mode' : null;
    }
    
    // Clean up - delete the test file
    const deleteResult = await storage.delete(testKey);
    
    // Verify content matches
    const contentMatches = downloadedContent === testContent;
    
    return ApiResponse.operation('storage.health', {
      result: {
        status: 'healthy',
        provider,
        timestamp: TimestampUtils.now(),
        tests: {
          upload: uploadResult.key === testKey,
          exists: exists === true,
          head: headResult?.key === testKey,
          download: contentMatches,
          list: listResult.files.some(f => f.key === testKey),
          signedUrl: signedUrl !== null,
          delete: deleteResult.deleted === true
        },
        details: {
          provider,
          isLocal,
          uploadedFileSize: uploadResult.size,
          downloadedFileSize: downloadResult.data.length,
          contentType: downloadResult.contentType,
          metadata: headResult?.metadata,
          listCount: listResult.files.length,
          signedUrlSupported: !isLocal,
          basePath: isLocal ? config.LOCAL_STORAGE_PATH || '.storage' : undefined
        },
        operations: ['upload', 'exists', 'head', 'download', 'list', 'signedUrl', 'delete']
      },
      status: 'success'
    });
    
  } catch (error: any) {
    Logger.storage.error('Health check failed', error);
    
    let errorDetails: any = {
      message: error.message,
      code: error.code,
      name: error.name
    };
    
    // Add specific error details for different error types
    if (error.Code) {
      errorDetails.awsCode = error.Code;
    }
    
    if (error.statusCode) {
      errorDetails.statusCode = error.statusCode;
    }
    
    if (process.env.NODE_ENV === 'development') {
      errorDetails.stack = error.stack;
    }
    
    return ApiErrors.serverError('Storage health check failed', {
      provider: storage.isLocal?.() ? 'local' : storage.isS3?.() ? 's3' : 'unknown',
      timestamp: TimestampUtils.now(),
      error: errorDetails,
      suggestion: getErrorSuggestion(error)
    });
  }
}

function getErrorSuggestion(error: any): string {
  if (error.code === 'ENOENT') {
    return 'Local storage directory may not exist or be accessible';
  }
  
  if (error.code === 'EACCES') {
    return 'Permission denied accessing local storage directory';
  }
  
  if (error.Code === 'AccessDenied') {
    return 'AWS credentials do not have sufficient S3 permissions';
  }
  
  if (error.Code === 'NoSuchBucket') {
    return 'S3 bucket does not exist or is not accessible';
  }
  
  if (error.Code === 'InvalidAccessKeyId') {
    return 'AWS access key ID is invalid';
  }
  
  if (error.Code === 'SignatureDoesNotMatch') {
    return 'AWS secret access key is incorrect';
  }
  
  if (error.message?.includes('ENOTFOUND') || error.message?.includes('getaddrinfo')) {
    return 'Network connectivity issue or invalid S3 endpoint';
  }
  
  return 'Check storage configuration and permissions';
}