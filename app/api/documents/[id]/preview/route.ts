export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withDocumentAccess, ApiResponse } from '@/lib/auth-utils';
import { ApiErrors } from '@/lib/utils';
import { Logger } from '@/lib/services/logger';

// GET /api/documents/[id]/preview - Preview extracted text
export const GET = withDocumentAccess<{ id: string }>(async (
  request: NextRequest,
  userEmail: string,
  document,
  context
) => {
  try {
    Logger.api.start('PREVIEW', userEmail, {
      documentId: document.id,
      filename: document.original_name
    });

    // Check if text has been extracted
    if (!document.extracted_text) {
      return ApiResponse.operation('preview.get', {
        result: {
          document: {
            id: document.id,
            filename: document.original_name,
            status: document.status
          },
          preview: null,
          message: 'No extracted text available. Please extract text first.'
        },
        status: 'success'
      });
    }

    // Get preview length from query params (default 500 chars)
    const searchParams = request.nextUrl.searchParams;
    const previewLength = parseInt(searchParams.get('length') || '500', 10);
    const showFull = searchParams.get('full') === 'true';

    // Prepare preview
    const fullText = document.extracted_text;
    const preview = showFull ? fullText : fullText.substring(0, previewLength);
    
    // Calculate text statistics
    const wordCount = fullText.split(/\s+/).filter(word => word.length > 0).length;
    const charCount = fullText.length;
    const lineCount = fullText.split('\n').length;

    Logger.api.success('PREVIEW', 'Text preview generated', {
      previewLength: preview.length,
      fullLength: fullText.length,
      showFull,
      wordCount
    });

    return ApiResponse.operation('preview.get', {
      result: {
        document: {
          id: document.id,
          filename: document.original_name,
          fileType: document.original_name.split('.').pop()?.toLowerCase(),
          extractedAt: document.metadata?.extraction?.extractedAt || document.updated_at
        },
        preview: {
          text: preview,
          truncated: !showFull && fullText.length > previewLength,
          fullLength: fullText.length
        },
        statistics: {
          words: wordCount,
          characters: charCount,
          lines: lineCount,
          pages: document.metadata?.extraction?.pages || null
        },
        extraction: {
          method: document.metadata?.extraction?.method || 'unknown',
          confidence: document.metadata?.extraction?.confidence || null
        }
      },
      metadata: {
        previewLength,
        showFull
      },
      status: 'success'
    });

  } catch (error) {
    Logger.api.error('PREVIEW', 'Failed to get text preview', error as Error);
    return ApiErrors.serverError('Failed to get text preview');
  }
});