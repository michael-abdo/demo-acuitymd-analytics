import { NextRequest, NextResponse } from 'next/server';
import { withDocumentAccess } from '@/lib/auth-utils';
import { ApiErrors } from '@/lib/utils';

// GET /api/documents/[id]/preview - Preview extracted text
export const GET = withDocumentAccess(async (
  request: NextRequest,
  userEmail: string,
  document,
  context
) => {
  try {

    // Check if text has been extracted
    if (!document.extracted_text) {
      return NextResponse.json({
        document: {
          id: document.id,
          filename: document.original_name,
          status: document.status
        },
        preview: null,
        message: 'No extracted text available. Please extract text first.'
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

    return NextResponse.json({
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
    });

  } catch (error) {
    console.error('Preview error:', error);
    return ApiErrors.serverError('Failed to get text preview');
  }
});