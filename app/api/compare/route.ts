export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server'
import { withRateLimit, ApiResponse, ApiErrors, Logger, TimestampUtils } from '@/lib/auth-utils'
import { RequestParser } from '@/lib/services/request-parser'
import { documentDb, comparisonDb, ComparisonStatus, DocumentStatus, TaskType } from '@/lib/nda'
import { compareDocuments, DocumentContent } from '@/lib/text-extraction'
import { compareRateLimiter } from '@/lib/rate-limiter'
import { config, APP_CONSTANTS } from '@/lib/config'
import { DocumentService } from '@/lib/services/document-service'
import { ConfigValidatorService } from '@/lib/services/config-validator'
import { QueueService } from '@/lib/services/queue-service'

export const POST = withRateLimit(
  compareRateLimiter,
  async (request: NextRequest, userEmail: string) => {
  Logger.api.start('COMPARE', userEmail, {
    method: request.method,
    url: request.url
  });
  
  try {
    Logger.api.step('COMPARE', 'Parsing request body');
    const { doc1Id: standardDocId, doc2Id: thirdPartyDocId } = await RequestParser.parseComparisonRequest(request);
    Logger.api.step('COMPARE', 'Parsed document IDs', { standardDocId, thirdPartyDocId });

    // Use centralized configuration validation (DRY: eliminates ~6 lines of duplicated config checking)
    const configError = ConfigValidatorService.requireOpenAI({
      loggerKey: 'api',
      operation: 'COMPARE'
    });
    if (configError) return configError;

    // Fetch documents from database
    Logger.api.step('COMPARE', 'Fetching documents from database');
    
    // First check what documents exist for this user
    const userDocuments = await DocumentService.getUserDocuments(userEmail) || [];
    Logger.api.step('COMPARE', 'User documents retrieved', { 
      count: userDocuments.length, 
      documentIds: userDocuments.map(d => d.id) 
    });
    
    // Find documents from the user's documents (DRY principle - reuse existing logic)
    const standardDoc = userDocuments.find(doc => doc.id === parseInt(standardDocId));
    const thirdPartyDoc = userDocuments.find(doc => doc.id === parseInt(thirdPartyDocId));
    Logger.api.step('COMPARE', 'Documents found in user collection', {
      standardFound: !!standardDoc,
      thirdPartyFound: !!thirdPartyDoc
    });

    if (!standardDoc || !thirdPartyDoc) {
      Logger.api.warn('COMPARE', 'Missing documents', {
        standardFound: !!standardDoc,
        thirdPartyFound: !!thirdPartyDoc
      });
      return ApiErrors.notFound('One or both documents');
    }

    // Check if text has been extracted for both documents
    Logger.api.step('COMPARE', 'Checking text extraction status', {
      standardExtracted: !!standardDoc.extracted_text,
      thirdPartyExtracted: !!thirdPartyDoc.extracted_text
    });
    if (!standardDoc.extracted_text || !thirdPartyDoc.extracted_text) {
      const missingExtraction = []
      if (!standardDoc.extracted_text) missingExtraction.push(`Standard document (ID: ${standardDocId})`)
      if (!thirdPartyDoc.extracted_text) missingExtraction.push(`Third-party document (ID: ${thirdPartyDocId})`)
      
      Logger.api.warn('COMPARE', 'Text extraction missing', { missingExtraction });
      Logger.api.step('COMPARE', 'Adding missing documents to extraction queue');
      
      // DRY: Apply direct extraction for missing documents
      if (!standardDoc.extracted_text) {
        Logger.api.step('COMPARE', `Processing standard document ${standardDoc.id} directly`);
        try {
          const { processTextExtraction } = await import('@/lib/text-extraction');
          await processTextExtraction(standardDoc.id);
          Logger.api.success('COMPARE', `Standard document ${standardDoc.id} text extraction completed`);
        } catch (fallbackError) {
          Logger.api.warn('COMPARE', `Standard document ${standardDoc.id} extraction failed`, fallbackError as Error);
        }
      }
      
      if (!thirdPartyDoc.extracted_text) {
        Logger.api.step('COMPARE', `Processing third-party document ${thirdPartyDoc.id} directly`);
        try {
          const { processTextExtraction } = await import('@/lib/text-extraction');
          await processTextExtraction(thirdPartyDoc.id);
          Logger.api.success('COMPARE', `Third-party document ${thirdPartyDoc.id} text extraction completed`);
        } catch (fallbackError) {
          Logger.api.warn('COMPARE', `Third-party document ${thirdPartyDoc.id} extraction failed`, fallbackError as Error);
        }
      }
      
      // Use centralized queue service (DRY: eliminates ~40 lines of duplicated queue management)
      try {
        const tasksToQueue = [];
        
        if (!standardDoc.extracted_text) {
          tasksToQueue.push({
            taskType: TaskType.EXTRACT_TEXT,
            documentId: standardDoc.id,
            userId: userEmail,
            priority: APP_CONSTANTS.QUEUE.DEFAULT_PRIORITY
          });
        }
        
        if (!thirdPartyDoc.extracted_text) {
          tasksToQueue.push({
            taskType: TaskType.EXTRACT_TEXT,
            documentId: thirdPartyDoc.id,
            userId: userEmail,
            priority: APP_CONSTANTS.QUEUE.DEFAULT_PRIORITY
          });
        }
        
        if (tasksToQueue.length > 0) {
          await QueueService.queueBatch(tasksToQueue);
          
          // Trigger queue processing
          const triggered = await QueueService.triggerProcessing(
            request.nextUrl.origin,
            config.QUEUE_SYSTEM_TOKEN
          );
          
          if (!triggered) {
            Logger.api.warn('COMPARE', 'Queue processing trigger failed, but tasks were queued');
          }
        }
      } catch (error) {
        Logger.api.error('COMPARE', 'Queue setup error', error as Error);
      }
      
      // Refresh document objects after extraction to get updated extracted_text
      Logger.api.step('COMPARE', 'Refreshing document objects after extraction');
      const refreshedUserDocs = await DocumentService.getUserDocuments(userEmail) || [];
      const refreshedStandardDoc = refreshedUserDocs.find(doc => doc.id === parseInt(standardDocId));
      const refreshedThirdPartyDoc = refreshedUserDocs.find(doc => doc.id === parseInt(thirdPartyDocId));

      if (refreshedStandardDoc?.extracted_text) {
        standardDoc.extracted_text = refreshedStandardDoc.extracted_text;
        standardDoc.metadata = refreshedStandardDoc.metadata;
      }
      if (refreshedThirdPartyDoc?.extracted_text) {
        thirdPartyDoc.extracted_text = refreshedThirdPartyDoc.extracted_text;
        thirdPartyDoc.metadata = refreshedThirdPartyDoc.metadata;
      }

      // Check if we now have extracted text
      if (standardDoc.extracted_text && thirdPartyDoc.extracted_text) {
        Logger.api.success('COMPARE', 'All documents now have extracted text - proceeding');
        // Continue to comparison logic
      } else {
        Logger.api.warn('COMPARE', 'Text extraction still missing after queue processing', {
          standardHasText: !!standardDoc.extracted_text,
          thirdPartyHasText: !!thirdPartyDoc.extracted_text
        });
        return ApiErrors.validation(APP_CONSTANTS.MESSAGES.COMPARISON.MISSING_TEXT, {
          details: `Text extraction is still pending for: ${missingExtraction.join(', ')}`,
          suggestion: 'Please wait a moment and try again. Extraction is processing in the background.'
        });
      }
    }

    // Create comparison record
    Logger.api.step('COMPARE', 'Creating comparison record');
    const comparison = await comparisonDb.create({
      document1_id: standardDocId,
      document2_id: thirdPartyDocId,
      created_date: new Date(),
      user_id: userEmail,
      status: ComparisonStatus.PROCESSING
    })
    Logger.api.step('COMPARE', 'Comparison record created', { comparisonId: comparison.id });

    try {
      // Prepare document content for comparison
      const standardContent: DocumentContent = {
        text: standardDoc.extracted_text,
        pages: standardDoc.metadata?.extraction?.pages || 1,
        confidence: standardDoc.metadata?.extraction?.confidence || APP_CONSTANTS.PROCESSING.DEFAULT_CONFIDENCE,
        metadata: {
          extractedAt: standardDoc.metadata?.extraction?.extractedAt || TimestampUtils.now(),
          method: standardDoc.metadata?.extraction?.method || 'pdf-parse',
          fileHash: standardDoc.file_hash
        }
      }

      const thirdPartyContent: DocumentContent = {
        text: thirdPartyDoc.extracted_text,
        pages: thirdPartyDoc.metadata?.extraction?.pages || 1,
        confidence: thirdPartyDoc.metadata?.extraction?.confidence || APP_CONSTANTS.PROCESSING.DEFAULT_CONFIDENCE,
        metadata: {
          extractedAt: thirdPartyDoc.metadata?.extraction?.extractedAt || TimestampUtils.now(),
          method: thirdPartyDoc.metadata?.extraction?.method || 'pdf-parse',
          fileHash: thirdPartyDoc.file_hash
        }
      }

      // Perform OpenAI comparison
      Logger.api.step('COMPARE', 'Starting OpenAI document comparison');
      const comparisonResult = await compareDocuments(standardContent, thirdPartyContent);
      Logger.api.success('COMPARE', 'OpenAI comparison completed successfully');
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
        processing_time_ms: 0 // Timing now tracked via headers
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

      // Use ApiResponse.operation for standardized response
      const response = ApiResponse.operation('comparison.create', {
        result: {
          id: comparison.id,
          standardDocument: standardDoc,
          thirdPartyDocument: thirdPartyDoc,
          result: formattedResult,
          status: 'completed',
          createdAt: comparison.created_date.toISOString(),
          completedAt: TimestampUtils.now()
        },
        metadata: {
          differenceCount: comparisonResult.differences.length,
          overallRisk: formattedResult.overallRisk
        },
        status: 'created'
      });

      return response;

    } catch (comparisonError) {
      // Update comparison status to error (DRY - reuse existing error handling)
      const errorMessage = comparisonError instanceof Error ? comparisonError.message : 'Unknown error';
      
      await comparisonDb.update(comparison.id, {
        status: ComparisonStatus.ERROR,
        error_message: errorMessage
      });
      
      Logger.api.error('COMPARE', 'Comparison failed', new Error(errorMessage));
      
      // FAIL FAST - return clear error instead of hiding failure
      return ApiErrors.serverError(`Comparison failed: ${errorMessage}`);
    }

  } catch (error) {
    Logger.api.error('COMPARE', 'Comparison error', error as Error);
    return ApiErrors.serverError(error instanceof Error ? error.message : 'Comparison failed');
  }
  },
  { allowDevBypass: true, includeHeaders: true }
)