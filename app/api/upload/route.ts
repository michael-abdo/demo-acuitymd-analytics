import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-utils';
import { FileValidation, ApiErrors } from '@/lib/utils';
import { createHash } from 'crypto';
import { storage, ndaPaths } from '@/lib/storage';
import { documentDb, DocumentStatus, queueDb, TaskType, QueueStatus } from '@/lib/nda';
import { config } from '@/lib/config';

export const POST = withAuth(async (request: NextRequest, userEmail: string) => {
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

    // Read file content
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Generate file hash for deduplication
    const fileHash = createHash('sha256').update(buffer).digest('hex');
    
    // Check if file already exists
    const existingDocument = await documentDb.findByHash(fileHash);
    if (existingDocument) {
      return NextResponse.json({
        status: 'duplicate',
        message: 'Document already exists',
        document: existingDocument,
        duplicate: true
      });
    }

    // Initialize storage
    await storage.initialize();
    
    // Generate storage key
    const storageKey = ndaPaths.document(userEmail, fileHash, file.name);
    
    // Upload to storage (S3 or local)
    const uploadResult = await storage.upload(storageKey, buffer, {
      contentType: file.type,
      metadata: {
        originalName: file.name,
        uploadedBy: userEmail,
        docType: docType,
        fileHash: fileHash,
        isStandard: isStandard.toString(),
        uploadDate: new Date().toISOString()
      }
    });

    // Store document metadata in database (memory or MySQL)
    const document = await documentDb.create({
      filename: storageKey,
      original_name: file.name,
      file_hash: fileHash,
      s3_url: storage.isS3() ? `s3://${config.S3_BUCKET_NAME}/${storageKey}` : `local://${storageKey}`,
      file_size: file.size,
      upload_date: new Date(),
      user_id: userEmail,
      status: DocumentStatus.UPLOADED,
      extracted_text: null,
      is_standard: isStandard,
      metadata: {
        docType,
        contentType: file.type,
        provider: storage.getProvider()
      }
    });

    // Queue text extraction task using existing queue system
    await queueDb.enqueue({
      document_id: document.id,
      task_type: TaskType.EXTRACT_TEXT,
      priority: 5, // Medium priority
      status: QueueStatus.QUEUED,
      attempts: 0,
      max_attempts: 3,
      scheduled_at: new Date()
    });

    console.log(`Queued text extraction for document ${document.id}, hash: ${fileHash}`);

    return NextResponse.json({
      status: 'success',
      message: 'Document uploaded successfully',
      document: {
        id: document.id,
        filename: document.filename,
        originalName: document.original_name,
        fileHash: document.file_hash,
        fileSize: document.file_size,
        uploadDate: document.upload_date,
        isStandard: document.is_standard,
        status: document.status,
        storageProvider: storage.getProvider(),
        storageKey: storageKey
      },
      storage: {
        provider: storage.getProvider(),
        key: uploadResult.key,
        size: uploadResult.size,
        etag: uploadResult.etag
      }
    });

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