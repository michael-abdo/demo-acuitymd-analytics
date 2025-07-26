export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withDocumentAccess, ApiResponse, ApiErrors, Logger } from '@/lib/auth-utils';
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
      return ApiResponse.operation('extraction.status', {
        result: {
          status: 'already_extracted',
          message: 'Text has already been extracted from this document',
          document: {
            id: document.id,
            filename: document.original_name,
            extractedTextLength: document.extracted_text.length
          }
        },
        status: 'success'
      });
    }

    // Check if there's already a pending task
    const existingTasks = await queueDb.findByDocument?.(document.id) || [];
    const pendingTask = existingTasks.find((task: any) => 
      task.task_type === TaskType.EXTRACT_TEXT && 
      (task.status === QueueStatus.QUEUED || task.status === QueueStatus.PROCESSING)
    );

    if (pendingTask) {
      return ApiResponse.operation('extraction.status', {
        result: {
          status: 'already_queued',
          message: 'Text extraction is already queued for this document',
          task: {
            id: pendingTask.id,
            status: pendingTask.status,
            created_at: pendingTask.created_at
          }
        },
        status: 'success'
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

    Logger.api.step('EXTRACT', `Queued text extraction for document ${document.id}`);

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
          Logger.api.step('EXTRACT', 'Triggered queue processing', await response.json());
        } catch (error) {
          Logger.api.error('EXTRACT', 'Failed to trigger queue', error as Error);
        }
      }, 1000); // Small delay to ensure task is saved
    }

    return ApiResponse.operation('extraction.queue', {
      result: {
        status: 'queued',
        message: 'Text extraction has been queued',
        task: {
          id: task.id,
          document_id: document.id,
          priority: task.priority,
          created_at: task.created_at
        }
      },
      status: 'created'
    });

  } catch (error) {
    Logger.api.error('EXTRACT', 'Manual extraction error', error as Error);
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

    return ApiResponse.operation('extraction.status', {
      result: {
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
      },
      status: 'success'
    });

  } catch (error) {
    Logger.api.error('EXTRACT', 'Extraction status error', error as Error);
    return ApiErrors.serverError('Failed to get extraction status');
  }
});