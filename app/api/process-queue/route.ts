import { NextRequest, NextResponse } from 'next/server';
import { ApiErrors } from '@/lib/utils';
import { getStorage, ensureStorageInitialized } from '@/lib/storage';
import { documentDb, queueDb, TaskType, QueueStatus, DocumentStatus } from '@/lib/nda';
import { extractText } from '@/lib/text-extraction';
import { config } from '@/lib/config';

/**
 * Process queue endpoint - handles background tasks like text extraction
 * This can be called periodically by a cron job or triggered manually
 */
export const POST = async (request: NextRequest) => {
  try {
    // Ensure storage is initialized before processing
    await ensureStorageInitialized();
    
    // Allow system calls with a simple token or in development
    const authHeader = request.headers.get('authorization');
    const systemToken = config.QUEUE_SYSTEM_TOKEN;
    
    // In development, allow without auth. In production, require system token
    if (config.IS_PRODUCTION && authHeader !== `Bearer ${systemToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('[Queue] Processing queue - checking for tasks...');
    // Get the next queued task
    const task = await queueDb.getNext();
    
    if (!task) {
      console.log('[Queue] No tasks in queue - idle');
      return NextResponse.json({
        status: 'idle',
        message: 'No tasks in queue'
      });
    }
    
    console.log(`[Queue] Found task: ID=${task.id}, Type=${task.task_type}, Document=${task.document_id}`);

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
    return ApiErrors.serverError(error instanceof Error ? error.message : 'Queue processing failed');
  }
};

async function processTextExtraction(task: any) {
  console.log(`[Extraction] Starting text extraction for document ${task.document_id}`);
  console.log(`[Extraction] Task ID: ${task.id}, Attempt: ${task.attempts + 1}/${task.max_attempts}`);
  
  // Get document from database
  const document = await documentDb.findById(task.document_id);
  if (!document) {
    console.error(`[Extraction] Document ${task.document_id} not found in database`);
    throw new Error(`Document ${task.document_id} not found`);
  }
  
  console.log(`[Extraction] Document found: ${document.original_name} (${document.file_size} bytes)`);
  console.log(`[Extraction] Storage path: ${document.filename}`);

  // Update document status to processing
  await documentDb.updateStatus(document.id, DocumentStatus.PROCESSING);

  try {
    // Download file from storage
    const storageKey = document.filename;
    console.log(`[Extraction] Downloading file from storage: ${storageKey}`);
    
    const storage = getStorage();
    const downloadResult = await storage.download(storageKey);
    const fileBuffer = downloadResult.data;
    console.log(`[Extraction] Downloaded ${fileBuffer.length} bytes`);
    
    // Extract text using unified extractor
    console.log(`[Extraction] Starting text extraction for file type: ${document.original_name.split('.').pop()}`);
    const extractedContent = await extractText(
      fileBuffer, 
      document.original_name,
      document.file_hash
    );
    
    console.log(`[Extraction] Text extraction completed:`);
    console.log(`[Extraction]   - Characters: ${extractedContent.text.length}`);
    console.log(`[Extraction]   - Pages: ${extractedContent.pages || 'N/A'}`);
    console.log(`[Extraction]   - Method: ${extractedContent.metadata.method}`);
    console.log(`[Extraction]   - First 100 chars: ${extractedContent.text.substring(0, 100)}...`);
    
    // Update document with extracted text
    console.log(`[Extraction] Updating document ${document.id} with extracted text`);
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

    console.log(`[Extraction] ✅ Successfully completed extraction for document ${document.id}`);
    
  } catch (error) {
    console.error(`[Extraction] ❌ Error during extraction:`, error);
    // Update document status to error
    await documentDb.updateStatus(document.id, DocumentStatus.ERROR);
    throw error;
  }
}

// GET endpoint to check queue status
export async function GET(request: NextRequest) {
  try {
    // For now, let's implement basic queue stats manually
    // since getStats might not be implemented
    const allTasks = await queueDb.findAll?.() || [];
    
    const stats = {
      queued: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      total: allTasks.length,
      tasks: [] as any[]
    };
    
    // Count tasks by status and get details
    allTasks.forEach((task: any) => {
      switch (task.status) {
        case QueueStatus.QUEUED:
          stats.queued++;
          stats.tasks.push({
            id: task.id,
            document_id: task.document_id,
            task_type: task.task_type,
            status: task.status,
            created_at: task.created_at
          });
          break;
        case QueueStatus.PROCESSING:
          stats.processing++;
          break;
        case QueueStatus.COMPLETED:
          stats.completed++;
          break;
        case QueueStatus.FAILED:
          stats.failed++;
          stats.tasks.push({
            id: task.id,
            document_id: task.document_id,
            task_type: task.task_type,
            status: task.status,
            error_message: task.error_message,
            attempts: task.attempts
          });
          break;
      }
    });
    
    return NextResponse.json({
      status: 'ok',
      stats,
      pendingTasks: stats.tasks.filter((t: any) => t.status === QueueStatus.QUEUED),
      failedTasks: stats.tasks.filter((t: any) => t.status === QueueStatus.FAILED)
    });
  } catch (error) {
    console.error('Queue stats error:', error);
    
    // If findAll doesn't exist, return minimal stats
    return NextResponse.json({
      status: 'ok',
      stats: {
        queued: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        total: 0
      },
      message: 'Queue stats not fully implemented',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}