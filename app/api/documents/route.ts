import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-utils';
import { ApiErrors } from '@/lib/utils';
import { documentDb } from '@/lib/nda/database';
import { storage } from '@/lib/storage';

// GET /api/documents - List user's documents
export const GET = withAuth(async (request: NextRequest, userEmail: string) => {
  try {
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);
    const type = searchParams.get('type') as 'standard' | 'third_party' | null;
    const search = searchParams.get('search') || '';

    // Validate pagination
    const validPage = Math.max(1, page);
    const validPageSize = Math.min(100, Math.max(1, pageSize));
    const offset = (validPage - 1) * validPageSize;

    // Get user's documents from database
    const userDocuments = await documentDb.findByUser(userEmail);

    // Filter documents based on query parameters
    let filteredDocuments = userDocuments;

    if (type) {
      filteredDocuments = filteredDocuments.filter(doc => {
        if (type === 'standard') return doc.is_standard;
        if (type === 'third_party') return !doc.is_standard;
        return true;
      });
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filteredDocuments = filteredDocuments.filter(doc => 
        doc.filename.toLowerCase().includes(searchLower) ||
        doc.original_name.toLowerCase().includes(searchLower)
      );
    }

    // Sort by created_at descending
    filteredDocuments.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Apply pagination
    const paginatedDocuments = filteredDocuments.slice(offset, offset + validPageSize);

    // Enhance documents with signed URLs if using S3
    const enhancedDocuments = await Promise.all(
      paginatedDocuments.map(async (doc) => {
        let downloadUrl = null;
        
        try {
          // Try to generate a signed URL for download
          if (storage.isS3?.()) {
            downloadUrl = await storage.getSignedUrl(doc.filename, 'get', { expires: 3600 });
          }
        } catch (error) {
          // If signed URL fails, we'll handle downloads differently
          console.error(`Failed to generate signed URL for ${doc.filename}:`, error);
        }

        return {
          ...doc,
          downloadUrl,
          canDownload: true,
          // Add computed properties
          fileType: doc.filename.split('.').pop()?.toLowerCase() || 'unknown',
          sizeMB: doc.file_size ? (doc.file_size / 1024 / 1024).toFixed(2) : null,
          // Add extraction status
          extractionStatus: doc.extracted_text ? 'completed' : 
                          doc.status === 'processing' ? 'processing' : 
                          doc.status === 'error' ? 'failed' : 'pending',
          hasExtractedText: !!doc.extracted_text,
          extractedTextLength: doc.extracted_text ? doc.extracted_text.length : 0
        };
      })
    );

    // Return paginated response
    return NextResponse.json({
      documents: enhancedDocuments,
      total: filteredDocuments.length,
      page: validPage,
      pageSize: validPageSize,
      hasNextPage: offset + validPageSize < filteredDocuments.length,
      hasPreviousPage: validPage > 1,
      totalPages: Math.ceil(filteredDocuments.length / validPageSize)
    });

  } catch (error) {
    console.error('Error fetching documents:', error);
    return ApiErrors.serverError('Failed to fetch documents');
  }
});