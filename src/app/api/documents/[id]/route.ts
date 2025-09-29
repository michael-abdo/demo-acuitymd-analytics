export const dynamic = "force-dynamic";
import { withAuth } from '@/lib/api/with-auth';
import { ApiResponseUtil } from '@/lib/response';
import { validateDocumentId, validateUpdateDocumentInput } from '@/lib/validation';

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
    
    // Return successful response using standardized response utility
    return ApiResponseUtil.success(document, {
      requestId: crypto.randomUUID()
    });
    
  } catch (error) {
    console.error('API Error in GET /api/documents/[id]:', error);
    
    // Handle specific service errors
    if (error instanceof Error) {
      if (error.message.includes('Document not found')) {
        return ApiResponseUtil.notFound('Document not found');
      }
      if (error.message.includes('Access denied')) {
        return ApiResponseUtil.forbidden('Access denied to this document');
      }
    }
    
    // Default error response
    return ApiResponseUtil.internalError('An unexpected error occurred');
  }
});

export const PUT = withAuth(async (request, { userEmail, services }, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  
  try {
    // Validate document ID
    const idValidation = validateDocumentId(id);
    if (!idValidation.isValid) {
      return ApiResponseUtil.validationError(
        idValidation.errors[0].message, 
        idValidation.errors[0].field
      );
    }
    
    // Parse and validate request body
    const body = await request.json();
    const bodyValidation = validateUpdateDocumentInput(body);
    if (!bodyValidation.isValid) {
      return ApiResponseUtil.validationError(
        bodyValidation.errors[0].message, 
        bodyValidation.errors[0].field
      );
    }
    
    // Update document using injected service layer with authorization
    const documentId = parseInt(id, 10);
    const updatedDocument = await services.documentService.updateDocument(documentId, body, userEmail);
    
    // Return successful response using standardized response utility
    return ApiResponseUtil.success(updatedDocument, {
      requestId: crypto.randomUUID()
    });
    
  } catch (error) {
    console.error('API Error in PUT /api/documents/[id]:', error);
    
    // Handle specific service errors
    if (error instanceof Error) {
      if (error.message.includes('Document not found')) {
        return ApiResponseUtil.notFound('Document not found');
      }
      if (error.message.includes('Access denied')) {
        return ApiResponseUtil.forbidden('Access denied to this document');
      }
      if (error.message.includes('No updates provided')) {
        return ApiResponseUtil.validationError('No updates provided');
      }
    }
    
    // Default error response
    return ApiResponseUtil.internalError('An unexpected error occurred');
  }
});

export const DELETE = withAuth(async (_request, { userEmail, services }, { params }: { params: Promise<{ id: string }> }) => {
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
    
    // Delete document using injected service layer with authorization
    const documentId = parseInt(id, 10);
    await services.documentService.deleteDocument(documentId, userEmail);
    
    // Return successful response using standardized response utility
    return ApiResponseUtil.success(
      { message: 'Document deleted successfully', documentId }, 
      { requestId: crypto.randomUUID() }
    );
    
  } catch (error) {
    console.error('API Error in DELETE /api/documents/[id]:', error);
    
    // Handle specific service errors
    if (error instanceof Error) {
      if (error.message.includes('Document not found')) {
        return ApiResponseUtil.notFound('Document not found');
      }
      if (error.message.includes('Access denied')) {
        return ApiResponseUtil.forbidden('Access denied to this document');
      }
    }
    
    // Default error response
    return ApiResponseUtil.internalError('An unexpected error occurred');
  }
});