export const dynamic = "force-dynamic";
import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth-utils';
import { ApiErrors, ResponseBuilder, isDocumentOwner } from '@/lib/utils';
import { documentDb } from '@/lib/template/database';
import { RequestParser } from '@/lib/services/request-parser';
// import { comparisonDb, ComparisonStatus } from '@/lib/nda'; // Removed NDA-specific imports
import { Logger } from '@/lib/services/logger';
import { getTextStats, findSections, calculateSimilarity } from '@/lib/text-extraction';

// POST /api/compare/simple - Create a simple text comparison  
export const POST = withAuth(async (request: NextRequest, userEmail: string) => {
  try {
    // Parse comparison request
    const { doc1Id, doc2Id } = await RequestParser.parseComparisonRequest(request);
    
    // Validate not comparing document with itself
    if (doc1Id === doc2Id) {
      return ApiErrors.badRequest('Cannot compare a document with itself');
    }
    
    // Fetch both documents in parallel
    const [doc1, doc2] = await Promise.all([
      documentDb.findById(doc1Id),
      documentDb.findById(doc2Id)
    ]);
    
    // Check existence
    if (!doc1 || !doc2) {
      return ApiErrors.notFound('One or both documents not found');
    }
    
    // Check ownership of both documents
    if (!isDocumentOwner(doc1, userEmail) || !isDocumentOwner(doc2, userEmail)) {
      return ApiErrors.forbidden();
    }
    
    // Check if text has been extracted
    if (!doc1.extracted_text || !doc2.extracted_text) {
      return ApiErrors.validation('Both documents must have extracted text before comparison', {
        doc1HasText: !!doc1.extracted_text,
        doc2HasText: !!doc2.extracted_text
      });
    }
    
    // Perform simple comparison
    const text1 = doc1.extracted_text;
    const text2 = doc2.extracted_text;
    
    // Calculate basic statistics
    const stats1 = getTextStats(text1);
    const stats2 = getTextStats(text2);
    
    // Calculate similarity using centralized utility
    const similarity = calculateSimilarity(text1, text2);
    const { score: similarityScore, commonWords, uniqueToText1: uniqueToDoc1, uniqueToText2: uniqueToDoc2 } = similarity;
    
    // Find key sections (basic implementation)
    const sections1 = findSections(text1);
    const sections2 = findSections(text2);
    
    // TODO: Create comparison record in database
    /*
    const comparison = await comparisonDb.create({
      doc1_id: doc1.id,
      doc2_id: doc2.id,
      user_id: userEmail,
      status: ComparisonStatus.COMPLETED,
      result: {
        summary: `Simple text comparison between "${doc1.original_name}" and "${doc2.original_name}"`,
        similarity_score: Math.round(similarityScore * 100) / 100,
        differences: [
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
        ]
      }
    });
    */
    
    // Temporary mock comparison record
    const comparison = {
      id: Date.now(),
      result: {
        summary: `Simple text comparison between "${doc1.original_name}" and "${doc2.original_name}"`,
        differences: [
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
        ]
      }
    };
    
    return ResponseBuilder.operation('comparison.simple', {
      data: {
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
        differences: comparison.result?.differences || []
      },
      metadata: {
        similarityScore: Math.round(similarityScore * 100) / 100,
        analysisType: 'simple'
      },
      status: 'created'
    });
    
  } catch (error) {
    Logger.api.error('COMPARE_SIMPLE', 'Simple comparison failed', error as Error);
    return ApiErrors.serverError('Failed to perform comparison');
  }
});