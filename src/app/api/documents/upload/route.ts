/**
 * File Upload API Route
 *
 * POST /api/documents/upload
 * Handles multipart/form-data file uploads with security validation.
 *
 * SECURITY:
 * - CSRF token required in x-csrf-token header (validated by withApiAuth)
 * - File type validation (extension + MIME type)
 * - File size validation (max 100MB)
 * - Filename sanitization (prevents path traversal)
 * - User ownership assigned to uploaded document
 *
 * @example
 * ```typescript
 * const formData = new FormData();
 * formData.append('file', fileInput.files[0]);
 *
 * const response = await fetch('/api/documents/upload', {
 *   method: 'POST',
 *   headers: {
 *     'x-csrf-token': await getCsrfToken(),
 *     // Note: Don't set Content-Type - browser sets it with boundary
 *   },
 *   body: formData,
 * });
 * ```
 */

import { NextRequest } from 'next/server';
import { withApiAuth } from '@/lib/api/with-auth';
import { ApiResponseUtil } from '@/lib/response';
import {
  validateFileUpload,
  sanitizeFilename,
} from '@/lib/validation/document.schemas';
import { LocalStorageProvider } from '@/lib/storage/local-provider';
import { logger } from '@/lib/pino-logger';

// Initialize storage provider
const storage = new LocalStorageProvider('./storage/uploads');

// Ensure storage directory exists on startup
storage.initialize().catch((error) => {
  logger.base.error(error, 'Failed to initialize upload storage');
});

export const POST = withApiAuth(async (request: NextRequest, { userEmail, services }) => {
  try {
    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return ApiResponseUtil.validationError(
        'No file provided. Send a file using multipart/form-data with field name "file".\n' +
          'Example: curl -X POST -F "file=@myfile.pdf" -H "x-csrf-token: TOKEN" /api/documents/upload',
        'file'
      );
    }

    // SECURITY: Validate file
    const validation = validateFileUpload({
      filename: file.name,
      mimeType: file.type,
      size: file.size,
    });

    if (!validation.isValid) {
      const errorMessages = validation.errors.map((e) => `${e.field}: ${e.message}`).join('; ');
      return ApiResponseUtil.validationError(errorMessages, 'file');
    }

    // SECURITY: Sanitize filename to prevent path traversal
    const safeFilename = sanitizeFilename(file.name);

    // Generate unique storage key
    const timestamp = Date.now();
    const storageKey = `${userEmail}/${timestamp}-${safeFilename}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to storage
    const storageResult = await storage.upload(storageKey, buffer, {
      contentType: file.type,
    });

    // Create document record in database
    const document = await services.documentService.createDocument(
      {
        filename: safeFilename,
        file_path: storageKey,
        file_size: file.size,
        status: 'uploaded',
      },
      userEmail
    );

    logger.base.info({
      documentId: document.id,
      filename: safeFilename,
      size: file.size,
      storageKey,
      userEmail,
    }, 'File uploaded successfully');

    return ApiResponseUtil.success(
      {
        document,
        storage: {
          key: storageKey,
          size: storageResult.size,
        },
      },
      { requestId: crypto.randomUUID() },
      201
    );
  } catch (error) {
    logger.base.error(error as Error, 'File upload failed');

    if (error instanceof Error && error.message.includes('body limit')) {
      return ApiResponseUtil.validationError(
        'File too large. Maximum upload size is 100MB.',
        'file'
      );
    }

    return ApiResponseUtil.internalError('Failed to upload file. Please try again.');
  }
});
