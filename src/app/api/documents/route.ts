export const dynamic = "force-dynamic";
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/session-validator';
import { ApiResponseUtil } from '@/lib/response';

export async function GET(_request: NextRequest) {
  try {
    // Authenticate request
    const session = await requireAuth();
    const userEmail = session.user?.email || '';
    
    // TODO: Replace with actual database query
    // For now, return mock data to test the build
    const mockDocuments = [
      {
        id: 1,
        filename: 'example.pdf',
        file_path: '/documents/example.pdf',
        file_size: 1024000,
        user_id: userEmail,
        status: 'completed',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        formatted_size: '1.0 MB',
        download_url: '/api/documents/1/download'
      }
    ];
    
    // Return successful response using standardized response utility
    return ApiResponseUtil.success(mockDocuments, {
      requestId: crypto.randomUUID()
    });
    
  } catch (error) {
    console.error('API Error in GET /api/documents:', error);
    return ApiResponseUtil.unauthorized('Authentication required to access this resource');
  }
}