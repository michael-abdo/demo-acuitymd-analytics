import { NextRequest, NextResponse } from 'next/server';
import { withAuthAndStorage, ApiResponse } from '@/lib/auth-utils';
import { FileValidation, ApiErrors } from '@/lib/utils';
import { processUploadedFile } from '@/lib/text-extraction';
import { storage } from '@/lib/storage';

export const POST = withAuthAndStorage(async (request: NextRequest, userEmail: string) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const docType = formData.get('docType') as string || 'THIRD_PARTY';
    const isStandard = formData.get('isStandard') === 'true';

    if (!file) {
      return ApiErrors.badRequest('No file provided');
    }

    // Validate file using centralized utilities
    const validationError = FileValidation.getValidationError(file);
    if (validationError) {
      return validationError;
    }

    // Use consolidated file processing utility
    const result = await processUploadedFile({
      file,
      filename: file.name,
      userEmail,
      docType,
      isStandard,
      contentType: file.type
    });

    // Handle duplicate file case
    if (result.duplicate) {
      return ApiResponse.successWithMeta(
        result.document,
        { duplicate: true, status: 'duplicate' },
        'Document already exists'
      );
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
      storage: result.storageInfo
    };
    
    return ApiResponse.created(documentWithMeta, 'Document uploaded successfully');

  } catch (error: any) {
    console.error('Upload error:', error);
    
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
});