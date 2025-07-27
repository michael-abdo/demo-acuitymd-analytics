export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuthAndStorage, ApiResponse, ApiErrors } from '@/lib/auth-utils';
import { FileValidation } from '@/lib/utils';
import { DocumentService } from '@/lib/services/document-service';
import { storage } from '@/lib/storage';
import { withDetailedLogging, ApiLoggerContext } from '@/lib/decorators/api-logger';
import { APP_CONSTANTS, EnvironmentHelpers } from '@/lib/config';
import { ErrorSuggestionService } from '@/lib/utils/error-suggestions';

// Use detailed logging decorator for file uploads (DRY principle)
export const POST = withAuthAndStorage(withDetailedLogging('UPLOAD', async (
  request: NextRequest, 
  userEmail: string, 
  logger: ApiLoggerContext
) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const docType = formData.get('docType') as string || 'THIRD_PARTY';
    const isStandard = formData.get('isStandard') === 'true';

    if (!file) {
      logger.error('No file provided in request', new Error('Missing file'));
      return ApiErrors.badRequest(APP_CONSTANTS.MESSAGES.UPLOAD.NO_FILE);
    }

    logger.step('File received', {
      filename: file.name,
      size: file.size,
      type: file.type,
      docType,
      isStandard
    });

    // Use centralized file validation (DRY principle)
    const fileValidation = await DocumentService.validateFile(file);
    if (!fileValidation.valid) {
      logger.error('File validation failed', new Error('Validation error'));
      return ApiErrors.validation(fileValidation.errors?.join(', ') || 'File validation failed');
    }

    logger.step('File validation passed');

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
      logger.success('Duplicate file detected', {
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
    
    logger.success('Document uploaded successfully', {
      documentId: result.document.id,
      filename: result.document.original_name,
      size: result.document.file_size,
      provider: result.storageInfo.provider,
      queued: result.queued
    });

    return ApiResponse.document.uploaded(documentWithMeta, {
      fileSize: file.size,
      fileType: file.type,
      storageProvider: result.storageInfo.provider,
      extractionQueued: result.queued,
      docType,
      isStandard
    });

  } catch (error: any) {
    // Use centralized error suggestion service (DRY: eliminates ~17 lines of duplicated error mapping)
    const errorSuggestion = ErrorSuggestionService.getErrorSuggestion(error, {
      operation: 'upload',
      resource: 'file'
    });
    
    // Log detailed error for debugging
    logger.error('Upload failed with specific error', error, {
      errorCode: errorSuggestion.errorCode,
      storageProvider: storage.getProvider?.() || 'unknown',
      suggestion: errorSuggestion.suggestion
    });
    
    return EnvironmentHelpers.isDevelopment() 
      ? ApiErrors.validation(`Upload failed: ${errorSuggestion.userMessage}`, {
          code: errorSuggestion.errorCode,
          error: error.message,
          suggestion: errorSuggestion.suggestion,
          storageProvider: storage.getProvider?.() || 'unknown',
          stack: error.stack
        })
      : ApiErrors.serverError(`Upload failed: ${errorSuggestion.userMessage}`);
  }
}), { allowDevBypass: true });