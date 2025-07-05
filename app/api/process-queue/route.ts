import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-utils';
import { storage } from '@/lib/storage';
import { documentDb, queueDb, TaskType, QueueStatus, DocumentStatus } from '@/lib/nda';
import { extractText } from '@/lib/text-extraction';

/**
 * Process queue endpoint - handles background tasks like text extraction
 * This can be called periodically by a cron job or triggered manually
 */
export const POST = withAuth(async (request: NextRequest, userEmail: string) => {
  try {
    // Get the next queued task
    const task = await queueDb.getNext();
    
    if (!task) {
      return NextResponse.json({
        status: 'idle',
        message: 'No tasks in queue'
      });
    }

    // Mark task as processing
    await queueDb.updateStatus(task.id, QueueStatus.PROCESSING);
    
    try {
      switch (task.task_type) {
        case TaskType.EXTRACT_TEXT:
          await processTextExtraction(task);
          break;
        
        case TaskType.COMPARE:
          // TODO: Implement comparison processing
          throw new Error('Comparison processing not yet implemented');
        
        case TaskType.EXPORT:
          // TODO: Implement export processing
          throw new Error('Export processing not yet implemented');
        
        default:
          throw new Error(`Unknown task type: ${task.task_type}`);
      }

      // Mark task as completed
      await queueDb.updateStatus(task.id, QueueStatus.COMPLETED);
      
      return NextResponse.json({
        status: 'success',
        message: `Processed ${task.task_type} task for document ${task.document_id}`,
        task: {
          id: task.id,
          type: task.task_type,
          documentId: task.document_id,
          completedAt: new Date()
        }
      });

    } catch (error) {
      // Update task with error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await queueDb.updateError(task.id, errorMessage);
      
      // Check if we should retry
      if (task.attempts < task.max_attempts - 1) {
        await queueDb.retry(task.id);
      } else {
        await queueDb.updateStatus(task.id, QueueStatus.FAILED);
      }
      
      throw error;
    }

  } catch (error) {
    console.error('Queue processing error:', error);
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Queue processing failed'
    }, { status: 500 });
  }
});

async function processTextExtraction(task: any) {
  console.log(`Processing text extraction for document ${task.document_id}`);
  
  // Get document from database
  const document = await documentDb.findById(task.document_id);
  if (!document) {
    throw new Error(`Document ${task.document_id} not found`);
  }

  // Update document status to processing
  await documentDb.updateStatus(document.id, DocumentStatus.PROCESSING);

  try {
    // Download file from storage
    const storageKey = document.filename;
    const fileBuffer = await storage.download(storageKey);
    
    // Extract text using unified extractor
    const extractedContent = await extractText(
      fileBuffer, 
      document.original_name,
      document.file_hash
    );
    
    // Update document with extracted text
    await documentDb.update(document.id, {
      extracted_text: extractedContent.text,
      status: DocumentStatus.PROCESSED,
      metadata: {
        ...document.metadata,
        extraction: {
          pages: extractedContent.pages,
          confidence: extractedContent.confidence,
          method: extractedContent.metadata.method,
          extractedAt: extractedContent.metadata.extractedAt
        }
      }
    });

    console.log(`Successfully extracted text from document ${document.id}: ${extractedContent.text.length} characters`);
    
  } catch (error) {
    // Update document status to error
    await documentDb.updateStatus(document.id, DocumentStatus.ERROR);
    throw error;
  }
}

// GET endpoint to check queue status
export async function GET(request: NextRequest) {
  try {
    const stats = await queueDb.getStats();
    
    return NextResponse.json({
      status: 'ok',
      stats: {
        queued: stats.queued || 0,
        processing: stats.processing || 0,
        completed: stats.completed || 0,
        failed: stats.failed || 0,
        total: stats.total || 0
      }
    });
  } catch (error) {
    console.error('Queue stats error:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Failed to get queue stats'
    }, { status: 500 });
  }
}