export const dynamic = "force-dynamic";
import { withAuth } from '@/lib/api/with-auth';
import { ApiResponseUtil } from '@/lib/response';

export const GET = withAuth(async (_request, { userEmail, services }) => {
  try {
    // Get user documents using injected service layer
    const documents = await services.documentService.getUserDocuments(userEmail);
    
    // Return successful response using standardized response utility
    return ApiResponseUtil.success(documents, {
      requestId: crypto.randomUUID()
    });
    
  } catch (error) {
    console.error('API Error in GET /api/documents:', error);
    
    // Handle specific service errors
    if (error instanceof Error) {
      if (error.message.includes('Failed to get documents')) {
        return ApiResponseUtil.internalError('Unable to retrieve documents');
      }
    }
    
    // Default error response
    return ApiResponseUtil.internalError('An unexpected error occurred');
  }
});