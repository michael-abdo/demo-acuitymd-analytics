import { NextRequest, NextResponse } from 'next/server';
import { withAuthDynamic } from '@/lib/auth-utils';
import { ApiErrors, parseDocumentId, isDocumentOwner, FileValidation, getFilenameFromPath } from '@/lib/utils';
import { documentDb } from '@/lib/nda/database';
import { storage } from '@/lib/storage';

// GET /api/documents/[id]/download - Download document file
export const GET = withAuthDynamic<{ id: string }>(async (
  request: NextRequest,
  userEmail: string,
  context
) => {
  try {
    const documentId = parseDocumentId(context.params.id);
    if (!documentId) {
      return ApiErrors.badRequest('Invalid document ID');
    }

    // Get document from database
    const document = await documentDb.findById(documentId);

    if (!document) {
      return ApiErrors.notFound('Document');
    }

    // Check ownership
    if (!isDocumentOwner(document, userEmail)) {
      return ApiErrors.forbidden();
    }

    // Check if file exists in storage
    const exists = await storage.exists(document.filename);
    if (!exists) {
      return ApiErrors.notFound('File in storage');
    }

    // Download file from storage
    const fileData = await storage.download(document.filename);

    // Determine content type
    const contentType = FileValidation.getContentType(document.filename);

    // Extract original filename from storage path
    const originalFilename = document.display_name || 
      getFilenameFromPath(document.filename) || 
      `document_${documentId}`;

    // Return file as response
    return new NextResponse(fileData.data, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${originalFilename}"`,
        'Content-Length': fileData.data.length.toString(),
        'Cache-Control': 'private, max-age=3600',
      },
    });

  } catch (error) {
    console.error('Error downloading document:', error);
    return ApiErrors.serverError('Failed to download document');
  }
});