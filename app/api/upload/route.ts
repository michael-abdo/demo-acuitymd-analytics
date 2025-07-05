import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-utils';
import { createHash } from 'crypto';
import { storage, ndaPaths } from '@/lib/storage';
import { documentDb, DocumentStatus } from '@/lib/nda';

export const POST = withAuth(async (request: NextRequest, userEmail: string) => {
  try {

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const docType = formData.get('docType') as string || 'THIRD_PARTY';
    const isStandard = formData.get('isStandard') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword', // .doc
      'text/plain' // .txt
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Only PDF, DOCX, DOC, and TXT files are allowed',
        allowedTypes: ['pdf', 'docx', 'doc', 'txt'],
        receivedType: file.type
      }, { status: 400 });
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'File too large',
        maxSize: maxSize,
        actualSize: file.size
      }, { status: 400 });
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
      s3_url: storage.isS3() ? `s3://${process.env.S3_BUCKET_NAME}/${storageKey}` : `local://${storageKey}`,
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
    
    return NextResponse.json({
      status: 'error',
      message: errorMessage,
      code: errorCode,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      details: process.env.NODE_ENV === 'development' ? {
        storageProvider: storage.getProvider?.() || 'unknown',
        stack: error.stack
      } : undefined
    }, { status: 500 });
  }
});