import { NextRequest, NextResponse } from 'next/server';
import { withAuthAndStorage, ApiResponse } from '@/lib/auth-utils';
import { FileValidation, ApiErrors } from '@/lib/utils';
import { DocumentService } from '@/lib/services/document-service';
import { storage } from '@/lib/storage';
import { Logger } from '@/lib/services/logger';
import { APP_CONSTANTS } from '@/lib/config';

export const POST = withAuthAndStorage(async (request: NextRequest, userEmail: string) => {
  Logger.api.start('UPLOAD', userEmail, {
    method: request.method,
    url: request.url
  });

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const docType = formData.get('docType') as string || 'THIRD_PARTY';
    const isStandard = formData.get('isStandard') === 'true';

    if (!file) {
      Logger.api.error('UPLOAD', 'No file provided in request', new Error('Missing file'));
      return ApiErrors.badRequest(APP_CONSTANTS.MESSAGES.UPLOAD.NO_FILE);
    }

    Logger.api.step('UPLOAD', 'File received', {
      filename: file.name,
      size: file.size,
      type: file.type,
      docType,
      isStandard
    });

    // Validate file using centralized utilities
    const validationError = FileValidation.getValidationError(file);
    if (validationError) {
      Logger.api.error('UPLOAD', 'File validation failed', new Error('Validation error'));
      return validationError;
    }

    Logger.api.step('UPLOAD', 'File validation passed');

    // Use DocumentService for DRY processing
    const result = await DocumentService.processDocument({
      file,
      filename: file.name,
      userEmail,
      docType,
      isStandard,
      contentType: file.type
    });

    // Handle duplicate file case
    if (result.duplicate) {
      Logger.api.success('UPLOAD', 'Duplicate file detected', {
        documentId: result.document.id,
        originalHash: result.document.file_hash
      });
      
      return ApiResponse.operation('document.upload', {
        result: result.document,
        metadata: {
          duplicate: true,
          fileSize: file.size,
          fileType: file.type,
          storageProvider: result.storageInfo.provider,
          extractionQueued: result.queued
        },
        message: APP_CONSTANTS.MESSAGES.UPLOAD.DUPLICATE,
        status: 'success',
        timing: { start: startTime, operations: timingOperations },
        warnings: ['File already exists in the system']
      });
    }

    // Format response with document metadata
    const documentWithMeta = {
      id: result.document.id,
      filename: result.document.filename,
      originalName: result.document.original_name,
      fileHash: result.document.file_hash,
      fileSize: result.document.file_size,
      uploadDate: result.document.upload_date,
      isStandard: result.document.is_standard,
      status: result.document.status,
      storageProvider: result.storageInfo.provider,
      storageKey: result.storageInfo.key,
      storage: result.storageInfo,
      extractionQueued: result.queued
    };
    
    Logger.api.success('UPLOAD', 'Document uploaded successfully', {
      documentId: result.document.id,
      filename: result.document.original_name,
      size: result.document.file_size,
      provider: result.storageInfo.provider,
      queued: result.queued
    });

    return ApiResponse.operation('document.upload', {
      result: documentWithMeta,
      metadata: {
        fileSize: file.size,
        fileType: file.type,
        storageProvider: result.storageInfo.provider,
        extractionQueued: result.queued,
        docType,
        isStandard
      },
      status: 'created'
    });

  } catch (error: any) {
    Logger.api.error('UPLOAD', 'Upload failed', error);
    
    // Provide specific error messages based on error type
    let errorMessage = 'Upload failed';
    let errorCode = 'UPLOAD_ERROR';
    
    if (error.code === 'AccessDenied') {
      errorMessage = 'Storage access denied. Please check permissions.';
      errorCode = 'STORAGE_ACCESS_DENIED';
    } else if (error.code === 'NoSuchBucket') {
      errorMessage = 'Storage bucket not found. Please check configuration.';
      errorCode = 'STORAGE_BUCKET_NOT_FOUND';
    } else if (error.code === 'ENOSPC') {
      errorMessage = 'Insufficient storage space.';
      errorCode = 'STORAGE_QUOTA_EXCEEDED';
    } else if (error.name === 'StorageError') {
      errorMessage = error.message;
      errorCode = error.code;
    }
    
    return process.env.NODE_ENV === 'development' 
      ? ApiErrors.validation(errorMessage, {
          code: errorCode,
          error: error.message,
          storageProvider: storage.getProvider?.() || 'unknown',
          stack: error.stack
        })
      : ApiErrors.serverError(errorMessage);
  }
}, { allowDevBypass: true });