export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withComparisonAccess, ApiResponse, ApiErrors, Logger } from '@/lib/auth-utils';
import { comparisonDb, ComparisonStatus } from '@/lib/nda';
import { getTextStats, findSections, calculateSimilarity } from '@/lib/text-extraction';
import { DocumentService } from '@/lib/services/document-service';

// POST /api/compare/simple - Create a simple text comparison
export const POST = withComparisonAccess(async (request: NextRequest, userEmail: string, doc1, doc2) => {
  try {
    
    // Use centralized document validation (DRY: eliminates duplicated extraction checks)
    const validationResult = DocumentService.validateDocumentsReady([doc1, doc2]);
    if (!validationResult.ready) {
      return ApiErrors.validation('Both documents must have extracted text before comparison', {
        missingExtraction: validationResult.missingExtraction,
        extractionStatus: validationResult.hasExtractionStatus
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
    
    // Create comparison record
    const comparison = await comparisonDb.create({
      document1_id: doc1.id,
      document2_id: doc2.id,
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
    
    return ApiResponse.operation('comparison.simple', {
      result: {
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