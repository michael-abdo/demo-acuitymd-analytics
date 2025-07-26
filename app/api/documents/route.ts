export const dynamic = "force-dynamic";
import { NextRequest } from 'next/server';
import { withAuth, ApiResponse, ApiErrors, Logger } from '@/lib/auth-utils';
import { RequestParser } from '@/lib/services/request-parser';
import { DocumentService } from '@/lib/services/document-service';

// GET /api/documents - List user's documents
export const GET = withAuth(async (request: NextRequest, userEmail: string) => {
  Logger.api.start('DOCUMENTS', userEmail, {
    method: request.method,
    url: request.url
  });
  
  try {
    // Parse query parameters using DRY utility
    const searchParams = request.nextUrl.searchParams;
    const pagination = RequestParser.parsePagination(searchParams);
    const filters = RequestParser.parseDocumentFilters(searchParams);
    
    Logger.api.step('DOCUMENTS', 'Parsed request parameters', {
      pagination,
      filters
    });

    // Get paginated documents using DRY service
    const { documents: paginatedDocuments, total, pages } = await DocumentService.getUserDocumentsPaginated(
      userEmail,
      {
        page: pagination.page,
        pageSize: pagination.pageSize,
        type: filters.type,
        search: filters.search
      }
    );

    // Enhance documents with signed URLs if using S3
    Logger.api.step('DOCUMENTS', 'Enhancing documents with storage URLs');
    
    const enhancedDocuments = await Promise.all(
      paginatedDocuments.map(async (doc) => {
        // Use centralized URL generation
        const urlResult = await DocumentService.getDocumentUrls(doc);
        const { downloadUrl } = urlResult.success 
          ? urlResult.data || { downloadUrl: null }
          : { downloadUrl: null };

        return {
          ...doc,
          downloadUrl,
          canDownload: true,
          // Add computed properties  
          sizeMB: doc.file_size ? (doc.file_size / 1024 / 1024).toFixed(2) : null,
          // Add extraction status
          extractionStatus: doc.extracted_text ? 'completed' : 
                          doc.status === 'processing' ? 'processing' : 
                          doc.status === 'error' ? 'failed' : 'pending'
        };
      })
    );

    // Return paginated response
    Logger.api.success('DOCUMENTS', `Retrieved ${enhancedDocuments.length} documents`, {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
      pages
    });
    
    return ApiResponse.operation('document.list', {
      result: enhancedDocuments,
      metadata: {
        pagination: {
          page: pagination.page,
          pageSize: pagination.pageSize,
          total,
          totalPages: pages
        },
        filters: {
          type: filters.type || 'all',
          search: filters.search || null
        },
        count: enhancedDocuments.length,
        hasSignedUrls: enhancedDocuments.some(doc => doc.downloadUrl?.startsWith('https://'))
      }
    });

  } catch (error) {
    Logger.api.error('DOCUMENTS', 'Failed to fetch documents', error as Error);
    return ApiErrors.serverError('Failed to fetch documents');
  }
}, { allowDevBypass: true });