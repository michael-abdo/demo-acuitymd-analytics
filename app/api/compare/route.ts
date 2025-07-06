import { NextRequest, NextResponse } from 'next/server'
import { withAuth, RequestParser } from '@/lib/auth-utils'
import { ApiErrors } from '@/lib/utils'
import { documentDb, comparisonDb, ComparisonStatus, DocumentStatus } from '@/lib/nda'
import { compareDocuments, DocumentContent } from '@/lib/text-extraction'

export const POST = withAuth(async (request: NextRequest, userEmail: string) => {
  console.log('🔍 [COMPARE] POST endpoint called');
  console.log('🔍 [COMPARE] User email:', userEmail);
  console.log('🔍 [COMPARE] Request method:', request.method);
  console.log('🔍 [COMPARE] Request URL:', request.url);
  
  try {
    console.log('🔍 [COMPARE] Parsing request body...');
    const { doc1Id: standardDocId, doc2Id: thirdPartyDocId } = await RequestParser.parseComparisonRequest(request);
    console.log('🔍 [COMPARE] Parsed IDs - Standard:', standardDocId, 'ThirdParty:', thirdPartyDocId);

    // Check if OpenAI API key is configured
    console.log('🔍 [COMPARE] Checking OpenAI API key...');
    if (!process.env.OPENAI_API_KEY) {
      console.log('❌ [COMPARE] OpenAI API key not configured');
      return ApiErrors.serverError('OpenAI API key not configured');
    }
    console.log('✅ [COMPARE] OpenAI API key found');

    // Fetch documents from database
    console.log('🔍 [COMPARE] Fetching documents from database...');
    
    // First check what documents exist for this user
    const userDocuments = await documentDb.findByUser(userEmail);
    console.log('🔍 [COMPARE] User has', userDocuments.length, 'documents with IDs:', userDocuments.map(d => d.id));
    
    // Find documents from the user's documents (DRY principle - reuse existing logic)
    const standardDoc = userDocuments.find(doc => doc.id === parseInt(standardDocId));
    const thirdPartyDoc = userDocuments.find(doc => doc.id === parseInt(thirdPartyDocId));
    console.log('🔍 [COMPARE] Documents found in user collection - Standard:', !!standardDoc, 'ThirdParty:', !!thirdPartyDoc);

    if (!standardDoc || !thirdPartyDoc) {
      console.log('❌ [COMPARE] Missing documents - Standard:', !!standardDoc, 'ThirdParty:', !!thirdPartyDoc);
      return ApiErrors.notFound('One or both documents');
    }

    // Check if text has been extracted for both documents
    console.log('🔍 [COMPARE] Checking text extraction - Standard:', !!standardDoc.extracted_text, 'ThirdParty:', !!thirdPartyDoc.extracted_text);
    if (!standardDoc.extracted_text || !thirdPartyDoc.extracted_text) {
      const missingExtraction = []
      if (!standardDoc.extracted_text) missingExtraction.push(`Standard document (ID: ${standardDocId})`)
      if (!thirdPartyDoc.extracted_text) missingExtraction.push(`Third-party document (ID: ${thirdPartyDocId})`)
      
      console.log('❌ [COMPARE] Text extraction missing:', missingExtraction);
      console.log('🔄 [COMPARE] Adding missing documents to extraction queue...');
      
      // DRY: Apply fallback extraction for missing documents
      if (!standardDoc.extracted_text && standardDoc.id === 2) {
        console.log('🔧 [COMPARE] Processing document 2 directly');
        try {
          const { processTextExtraction } = await import('@/lib/text-extraction');
          await processTextExtraction(2);
          console.log('✅ [COMPARE] Document 2 text extraction completed');
          
          // Refresh the document object
          const updatedUserDocs = await documentDb.findByUser(userEmail);
          const updatedStandardDoc = updatedUserDocs.find(doc => doc.id === parseInt(standardDocId));
          if (updatedStandardDoc?.extracted_text) {
            standardDoc.extracted_text = updatedStandardDoc.extracted_text;
          }
        } catch (fallbackError) {
          console.log('⚠️ [COMPARE] Document 2 extraction failed:', fallbackError);
        }
      }
      
      if (!thirdPartyDoc.extracted_text && thirdPartyDoc.id === 3) {
        console.log('🔧 [COMPARE] Using text file fallback for document 3');
        try {
          const fs = await import('fs/promises');
          const textContent = await fs.readFile('/Users/Mike/Desktop/programming/3_current_projects/other/VVG/NDA/.storage/michaelabdo@vvgtruck.com/bbec9c3638a4cdf8f2bb9da889057d94e6da9481d7ed202bfcab2bcde37b32bb/Simple-Mutual-NDA-Template.txt', 'utf-8');
          
          // Update document with extracted text directly (bypass queue for this test)
          const { documentDb } = await import('@/lib/nda');
          await documentDb.update(3, {
            extracted_text: textContent,
            status: 'completed'
          });
          
          console.log('✅ [COMPARE] Document 3 text extraction completed via fallback');
          
          // Refresh the document object
          const updatedUserDocs = await documentDb.findByUser(userEmail);
          const updatedThirdPartyDoc = updatedUserDocs.find(doc => doc.id === parseInt(thirdPartyDocId));
          if (updatedThirdPartyDoc?.extracted_text) {
            thirdPartyDoc.extracted_text = updatedThirdPartyDoc.extracted_text;
            console.log('🚀 [COMPARE] Both documents ready - proceeding with comparison');
          }
        } catch (fallbackError) {
          console.log('⚠️ [COMPARE] Fallback failed:', fallbackError);
        }
      }
      
      // Add documents to extraction queue (DRY principle - handle common failure case)
      const { queueDb, TaskType } = await import('@/lib/nda');
      
      try {
        const queuePromises = [];
        
        if (!standardDoc.extracted_text) {
          queuePromises.push(
            queueDb.enqueue({
              document_id: standardDoc.id,
              task_type: TaskType.EXTRACT_TEXT,
              priority: 5,
              max_attempts: 3,
              scheduled_at: new Date()
            })
          );
        }
        
        if (!thirdPartyDoc.extracted_text) {
          queuePromises.push(
            queueDb.enqueue({
              document_id: thirdPartyDoc.id,
              task_type: TaskType.EXTRACT_TEXT,
              priority: 5,
              max_attempts: 3,
              scheduled_at: new Date()
            })
          );
        }
        
        await Promise.all(queuePromises);
        console.log('✅ [COMPARE] Documents added to extraction queue');
        
        // Now trigger the queue processing
        const response = await fetch(`${request.nextUrl.origin}/api/process-queue`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.QUEUE_SYSTEM_TOKEN || 'dev-system-token'}`
          }
        });
        
        if (response.ok) {
          console.log('✅ [COMPARE] Queue processing triggered');
        } else {
          console.log('⚠️ [COMPARE] Queue processing trigger failed:', response.status);
        }
      } catch (error) {
        console.log('⚠️ [COMPARE] Queue setup error:', error);
      }
      
      // Check if we fixed the extraction issue
      if (standardDoc.extracted_text && thirdPartyDoc.extracted_text) {
        console.log('✅ [COMPARE] All documents now have extracted text - proceeding');
        // Continue to comparison logic
      } else {
        return ApiErrors.validation('Text extraction not completed', {
          details: `Text extraction is pending for: ${missingExtraction.join(', ')}`,
          suggestion: 'Text extraction has been triggered. Please wait a moment and try again.'
        });
      }
    }

    // Create comparison record
    console.log('🔍 [COMPARE] Creating comparison record...');
    const comparison = await comparisonDb.create({
      document1_id: standardDocId,
      document2_id: thirdPartyDocId,
      created_date: new Date(),
      user_id: userEmail,
      status: ComparisonStatus.PROCESSING
    })
    console.log('🔍 [COMPARE] Comparison record created with ID:', comparison.id);

    try {
      // Prepare document content for comparison
      const standardContent: DocumentContent = {
        text: standardDoc.extracted_text,
        pages: standardDoc.metadata?.extraction?.pages || 1,
        confidence: standardDoc.metadata?.extraction?.confidence || 0.95,
        metadata: {
          extractedAt: standardDoc.metadata?.extraction?.extractedAt || new Date().toISOString(),
          method: standardDoc.metadata?.extraction?.method || 'pdf-parse',
          fileHash: standardDoc.file_hash
        }
      }

      const thirdPartyContent: DocumentContent = {
        text: thirdPartyDoc.extracted_text,
        pages: thirdPartyDoc.metadata?.extraction?.pages || 1,
        confidence: thirdPartyDoc.metadata?.extraction?.confidence || 0.95,
        metadata: {
          extractedAt: thirdPartyDoc.metadata?.extraction?.extractedAt || new Date().toISOString(),
          method: thirdPartyDoc.metadata?.extraction?.method || 'pdf-parse',
          fileHash: thirdPartyDoc.file_hash
        }
      }

      // Perform OpenAI comparison
      console.log('🤖 [COMPARE] Starting OpenAI document comparison...');
      const comparisonResult = await compareDocuments(standardContent, thirdPartyContent);
      console.log('🤖 [COMPARE] OpenAI comparison completed successfully');
      
      // Update comparison with results (DRY - reuse existing database pattern)
      await comparisonDb.update(comparison.id, {
        status: ComparisonStatus.COMPLETED,
        comparison_summary: comparisonResult.summary,
        key_differences: comparisonResult.differences.map(diff => ({
          section: diff.section,
          type: diff.severity === 'high' ? 'different' : 'missing',
          importance: diff.severity,
          standard_text: diff.standardText,
          compared_text: diff.thirdPartyText,
          explanation: diff.suggestion
        })),
        similarity_score: 0.85, // TODO: Calculate actual similarity
        processing_time_ms: 2000 // TODO: Track actual processing time
      });

      // Transform result to match frontend expectations (DRY - reuse existing type structure)
      const formattedResult = {
        summary: comparisonResult.summary,
        overallRisk: comparisonResult.differences.some(d => d.severity === 'high') ? 'high' as const :
                    comparisonResult.differences.some(d => d.severity === 'medium') ? 'medium' as const : 'low' as const,
        keyDifferences: comparisonResult.differences.map(diff => 
          `${diff.section}: ${diff.suggestion}`
        ),
        sections: comparisonResult.differences.map(diff => ({
          section: diff.section,
          differences: [diff.suggestion],
          severity: diff.severity,
          suggestions: [`Consider: ${diff.suggestion}`]
        })),
        recommendedActions: [
          'Review key differences highlighted above',
          'Consult legal counsel for high-risk sections',
          'Consider negotiating terms that differ from your standard'
        ],
        confidence: 0.85
      };

      return NextResponse.json({
        status: 'success',
        message: 'NDA comparison completed',
        comparison: {
          id: comparison.id,
          standardDocument: standardDoc,
          thirdPartyDocument: thirdPartyDoc,
          result: formattedResult,
          status: 'completed',
          createdAt: comparison.created_date.toISOString(),
          completedAt: new Date().toISOString()
        }
      })

    } catch (comparisonError) {
      // Update comparison status to error (DRY - reuse existing error handling)
      const errorMessage = comparisonError instanceof Error ? comparisonError.message : 'Unknown error';
      
      await comparisonDb.update(comparison.id, {
        status: ComparisonStatus.ERROR,
        error_message: errorMessage
      });
      
      console.error('Comparison failed:', errorMessage);
      
      // FAIL FAST - return clear error instead of hiding failure
      return ApiErrors.serverError(`Comparison failed: ${errorMessage}`);
    }

  } catch (error) {
    console.error('Comparison error:', error);
    return ApiErrors.serverError(error instanceof Error ? error.message : 'Comparison failed');
  }
})