import { NextRequest, NextResponse } from 'next/server';
import { withDocumentAccess } from '@/lib/auth-utils';
import { ApiErrors, FileValidation, getFilenameFromPath } from '@/lib/utils';
import { storage } from '@/lib/storage';

// GET /api/documents/[id]/download - Download document file
export const GET = withDocumentAccess(async (
  request: NextRequest,
  userEmail: string,
  document,
  context
) => {
  try {

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
      `document_${document.id}`;

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