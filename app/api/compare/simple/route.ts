import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-utils';
import { RequestParser } from '@/lib/services/request-parser';
import { ApiErrors, parseDocumentId, isDocumentOwner } from '@/lib/utils';
import { documentDb, comparisonDb, ComparisonStatus } from '@/lib/nda';

// POST /api/compare/simple - Create a simple text comparison
export const POST = withAuth(async (request: NextRequest, userEmail: string) => {
  try {
    const { doc1Id: validDoc1Id, doc2Id: validDoc2Id } = await RequestParser.parseComparisonRequest(request);
    
    if (validDoc1Id === validDoc2Id) {
      return ApiErrors.badRequest('Cannot compare a document with itself');
    }
    
    // Get documents
    const [doc1, doc2] = await Promise.all([
      documentDb.findById(validDoc1Id),
      documentDb.findById(validDoc2Id)
    ]);
    
    if (!doc1 || !doc2) {
      return ApiErrors.notFound('One or both documents not found');
    }
    
    // Check ownership
    if (!isDocumentOwner(doc1, userEmail) || !isDocumentOwner(doc2, userEmail)) {
      return ApiErrors.forbidden();
    }
    
    // Check if text has been extracted
    if (!doc1.extracted_text || !doc2.extracted_text) {
      return NextResponse.json({
        error: 'Text extraction required',
        message: 'Both documents must have extracted text before comparison',
        doc1HasText: !!doc1.extracted_text,
        doc2HasText: !!doc2.extracted_text
      }, { status: 400 });
    }
    
    // Perform simple comparison
    const text1 = doc1.extracted_text;
    const text2 = doc2.extracted_text;
    
    // Calculate basic statistics
    const stats1 = getTextStats(text1);
    const stats2 = getTextStats(text2);
    
    // Find common words
    const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    
    const commonWords = new Set([...words1].filter(x => words2.has(x)));
    const uniqueToDoc1 = new Set([...words1].filter(x => !words2.has(x)));
    const uniqueToDoc2 = new Set([...words2].filter(x => !words1.has(x)));
    
    // Calculate similarity score (Jaccard index)
    const union = new Set([...words1, ...words2]);
    const similarityScore = union.size > 0 ? (commonWords.size / union.size) * 100 : 0;
    
    // Find key sections (basic implementation)
    const sections1 = findSections(text1);
    const sections2 = findSections(text2);
    
    // Create comparison record
    const comparison = await comparisonDb.create({
      document1_id: validDoc1Id,
      document2_id: validDoc2Id,
      comparison_summary: `Simple text comparison between "${doc1.original_name}" and "${doc2.original_name}"`,
      similarity_score: Math.round(similarityScore * 100) / 100,
      key_differences: [
        {
          section: 'Document Statistics',
          type: 'different',
          importance: 'low',
          standard_text: `Word count: ${stats1.words}`,
          compared_text: `Word count: ${stats2.words}`,
          explanation: `Word count difference: ${stats1.words - stats2.words} words`
        },
        {
          section: 'Content Length',
          type: 'different',
          importance: 'low',
          standard_text: `Character count: ${stats1.characters}`,
          compared_text: `Character count: ${stats2.characters}`,
          explanation: `Character count difference: ${stats1.characters - stats2.characters} characters`
        }
      ],
      user_id: userEmail,
      status: ComparisonStatus.COMPLETED,
      processing_time_ms: 0,
      created_date: new Date()
    });
    
    return NextResponse.json({
      comparisonId: comparison.id,
      documents: {
        doc1: {
          id: doc1.id,
          name: doc1.original_name,
          stats: stats1
        },
        doc2: {
          id: doc2.id,
          name: doc2.original_name,
          stats: stats2
        }
      },
      similarity: {
        score: similarityScore,
        commonWords: commonWords.size,
        uniqueToDoc1: uniqueToDoc1.size,
        uniqueToDoc2: uniqueToDoc2.size,
        interpretation: similarityScore > 80 ? 'Very Similar' :
                       similarityScore > 60 ? 'Similar' :
                       similarityScore > 40 ? 'Somewhat Similar' :
                       similarityScore > 20 ? 'Different' : 'Very Different'
      },
      sections: {
        doc1Sections: sections1,
        doc2Sections: sections2,
        commonSections: sections1.filter(s => sections2.includes(s))
      },
      differences: comparison.key_differences
    });
    
  } catch (error) {
    console.error('Simple comparison error:', error);
    return ApiErrors.serverError('Failed to perform comparison');
  }
});

function getTextStats(text: string) {
  const words = text.split(/\s+/).filter(word => word.length > 0);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
  
  return {
    words: words.length,
    characters: text.length,
    charactersNoSpaces: text.replace(/\s/g, '').length,
    sentences: sentences.length,
    paragraphs: paragraphs.length,
    averageWordLength: words.length > 0 ? 
      Math.round((words.reduce((sum, word) => sum + word.length, 0) / words.length) * 10) / 10 : 0
  };
}

function findSections(text: string): string[] {
  // Find sections based on common patterns
  const sections: string[] = [];
  
  // Look for numbered sections (1., 2., etc.)
  const numberedSections = text.match(/^\d+\.\s*[A-Z][^.]*$/gm);
  if (numberedSections) {
    sections.push(...numberedSections.map(s => s.trim()));
  }
  
  // Look for uppercase headers
  const upperHeaders = text.match(/^[A-Z][A-Z\s]{2,}$/gm);
  if (upperHeaders) {
    sections.push(...upperHeaders.map(s => s.trim()));
  }
  
  // Look for sections with keywords
  const keywords = ['WHEREAS', 'THEREFORE', 'ARTICLE', 'SECTION', 'CLAUSE'];
  keywords.forEach(keyword => {
    const keywordSections = text.match(new RegExp(`^.*${keyword}.*$`, 'gmi'));
    if (keywordSections) {
      sections.push(...keywordSections.map(s => s.trim()));
    }
  });
  
  // Remove duplicates and return
  return [...new Set(sections)];
}