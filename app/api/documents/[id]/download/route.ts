import { NextRequest, NextResponse } from 'next/server';
import { withDocumentAccess } from '@/lib/auth-utils';
import { ApiErrors, FileValidation, getFilenameFromPath } from '@/lib/utils';
import { storage } from '@/lib/storage';
import { Logger } from '@/lib/services/logger';

// GET /api/documents/[id]/download - Download document file
export const GET = withDocumentAccess<{ id: string }>(async (
  request: NextRequest,
  userEmail: string,
  document,
  context
) => {
  try {
    Logger.api.start('DOWNLOAD', userEmail, {
      documentId: document.id,
      filename: document.original_name
    });

    // Check if file exists in storage (with built-in retry logic)
    const exists = await storage.exists(document.filename);
    
    if (!exists) {
      Logger.api.error('DOWNLOAD', 'File not found in storage', new Error('File missing'));
      return ApiErrors.notFound('File in storage');
    }

    // Download file from storage (with built-in retry logic)
    Logger.api.step('DOWNLOAD', 'Downloading file from storage');
    const downloadResult = await storage.download(document.filename);
    const fileData = downloadResult.data;
    
    Logger.api.success('DOWNLOAD', 'File downloaded successfully', {
      size: fileData.length
    });

    // Determine content type
    const contentType = FileValidation.getContentType(document.filename);

    // Extract original filename from storage path
    const originalFilename = document.original_name || 
      getFilenameFromPath(document.filename) || 
      `document_${document.id}`;

    // Return file as response
    return new NextResponse(fileData, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${originalFilename}"`,
        'Content-Length': fileData.length.toString(),
        'Cache-Control': 'private, max-age=3600',
      },
    });

  } catch (error) {
    Logger.api.error('DOWNLOAD', 'Failed to download document', error as Error);
    return ApiErrors.serverError('Failed to download document');
  }
});