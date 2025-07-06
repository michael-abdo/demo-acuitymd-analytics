import { NextRequest, NextResponse } from 'next/server';
import { withDocumentAccess } from '@/lib/auth-utils';
import { ApiErrors } from '@/lib/utils';
import { queueDb, TaskType, QueueStatus } from '@/lib/nda';
import { config, APP_CONSTANTS } from '@/lib/config';

// POST /api/documents/[id]/extract - Manually trigger text extraction
export const POST = withDocumentAccess<{ id: string }>(async (
  request: NextRequest,
  userEmail: string,
  document,
  context
) => {
  try {

    // Check if text is already extracted
    if (document.extracted_text) {
      return NextResponse.json({
        status: 'already_extracted',
        message: 'Text has already been extracted from this document',
        document: {
          id: document.id,
          filename: document.original_name,
          extractedTextLength: document.extracted_text.length
        }
      });
    }

    // Check if there's already a pending task
    const existingTasks = await queueDb.findByDocument?.(document.id) || [];
    const pendingTask = existingTasks.find((task: any) => 
      task.task_type === TaskType.EXTRACT_TEXT && 
      (task.status === QueueStatus.QUEUED || task.status === QueueStatus.PROCESSING)
    );

    if (pendingTask) {
      return NextResponse.json({
        status: 'already_queued',
        message: 'Text extraction is already queued for this document',
        task: {
          id: pendingTask.id,
          status: pendingTask.status,
          created_at: pendingTask.created_at
        }
      });
    }

    // Queue text extraction task
    const task = await queueDb.enqueue({
      document_id: document.id,
      task_type: TaskType.EXTRACT_TEXT,
      priority: 1, // High priority for manual triggers
      max_attempts: APP_CONSTANTS.QUEUE.MAX_ATTEMPTS,
      scheduled_at: new Date()
    });

    console.log(`[Manual Extract] Queued text extraction for document ${document.id}`);

    // Optionally, trigger immediate processing
    if (config.IS_DEVELOPMENT) {
      // In development, trigger processing immediately
      setTimeout(async () => {
        try {
          const response = await fetch('http://localhost:3000/api/process-queue', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          console.log('[Manual Extract] Triggered queue processing:', await response.json());
        } catch (error) {
          console.error('[Manual Extract] Failed to trigger queue:', error);
        }
      }, 1000); // Small delay to ensure task is saved
    }

    return NextResponse.json({
      status: 'queued',
      message: 'Text extraction has been queued',
      task: {
        id: task.id,
        document_id: document.id,
        priority: task.priority,
        created_at: task.created_at
      }
    });

  } catch (error) {
    console.error('Manual extraction error:', error);
    return ApiErrors.serverError('Failed to queue text extraction');
  }
});

// GET /api/documents/[id]/extract - Check extraction status
export const GET = withDocumentAccess(async (
  request: NextRequest,
  userEmail: string,
  document,
  context
) => {
  try {
    // Get extraction tasks for this document
    const tasks = await queueDb.findByDocument?.(document.id) || [];
    const extractionTasks = tasks.filter((task: any) => 
      task.task_type === TaskType.EXTRACT_TEXT
    );

    return NextResponse.json({
      document: {
        id: document.id,
        filename: document.original_name,
        status: document.status,
        hasExtractedText: !!document.extracted_text,
        extractedTextLength: document.extracted_text ? document.extracted_text.length : 0
      },
      extractionTasks: extractionTasks.map((task: any) => ({
        id: task.id,
        status: task.status,
        attempts: task.attempts,
        created_at: task.created_at,
        error_message: task.error_message
      }))
    });

  } catch (error) {
    console.error('Extraction status error:', error);
    return ApiErrors.serverError('Failed to get extraction status');
  }
});