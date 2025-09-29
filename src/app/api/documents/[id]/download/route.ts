export const dynamic = "force-dynamic";
// NextResponse still needed for potential file streaming implementation
import { withAuth } from '@/lib/api/with-auth';
import { ApiResponseUtil } from '@/lib/response';
import { validateDocumentId } from '@/lib/validation';

export const GET = withAuth(async (_request, { userEmail, services }, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  
  try {
    // Validate document ID
    const validation = validateDocumentId(id);
    if (!validation.isValid) {
      return ApiResponseUtil.validationError(
        validation.errors[0].message, 
        validation.errors[0].field
      );
    }
    
    // Get document using injected service layer with authorization
    const documentId = parseInt(id, 10);
    const document = await services.documentService.getDocumentById(documentId, userEmail);
    
    // TODO: Implement actual document retrieval and file streaming
    // For now, return a placeholder response indicating successful auth
    // In a real implementation, this would:
    // 1. Fetch the document from storage using document.file_path
    // 2. Return the file as a stream
    
    // Return authorized download information using standardized response utility
    return ApiResponseUtil.success({
      message: 'Document download authorized',
      documentId: document.id,
      filename: document.filename,
      downloadUrl: `/api/documents/${id}/download`, 
      fileSize: document.formatted_size,
      authorizedBy: userEmail
    }, {
      requestId: crypto.randomUUID()
    });
    
    // Example of how to return a file stream:
    // const fileBuffer = await storageService.getFile(document.file_path);
    // return new NextResponse(fileBuffer, {
    //   headers: {
    //     'Content-Type': 'application/pdf',
    //     'Content-Disposition': `attachment; filename="${document.filename}"`,
    //   },
    // });
    
  } catch (error) {
    console.error('API Error in GET /api/documents/[id]/download:', error);
    
    // Handle specific service errors using standardized response utility
    if (error instanceof Error) {
      if (error.message.includes('Document not found')) {
        return ApiResponseUtil.notFound('Document not found');
      }
      if (error.message.includes('Access denied')) {
        return ApiResponseUtil.forbidden('Access denied to this document');
      }
    }
    
    // Default error response
    return ApiResponseUtil.internalError('An unexpected error occurred during download authorization');
  }
});