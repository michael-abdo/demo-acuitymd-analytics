import { NextRequest, NextResponse } from 'next/server';
import { ApiErrors } from '@/lib/utils';
import { ApiResponse } from '@/lib/auth-utils';
import { ensureStorageInitialized } from '@/lib/storage';
import { queueDb, TaskType, QueueStatus } from '@/lib/nda';
import { processTextExtraction } from '@/lib/text-extraction';
import { config } from '@/lib/config';
import { Logger } from '@/lib/services/logger';

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
    
    Logger.api.start('QUEUE', 'system', { method: request.method, url: request.url });
    // Get the next queued task
    const task = await queueDb.getNext();
    
    if (!task) {
      Logger.api.step('QUEUE', 'No tasks in queue - idle');
      return NextResponse.json({
        status: 'idle',
        message: 'No tasks in queue'
      });
    }
    
    Logger.api.step('QUEUE', 'Found task to process', {
      taskId: task.id,
      taskType: task.task_type,
      documentId: task.document_id
    });

    // Mark task as processing
    await queueDb.updateStatus(task.id, QueueStatus.PROCESSING);
    
    try {
      switch (task.task_type) {
        case TaskType.EXTRACT_TEXT:
          await processTextExtraction(task.document_id);
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
      
      const processedTask = {
        id: task.id,
        type: task.task_type,
        documentId: task.document_id,
        completedAt: new Date()
      };
      
      return ApiResponse.success(
        processedTask,
        `Processed ${task.task_type} task for document ${task.document_id}`
      );

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
    Logger.api.error('QUEUE', 'Queue processing error', error as Error);
    return ApiErrors.serverError(error instanceof Error ? error.message : 'Queue processing failed');
  }
};

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
    
    return ApiResponse.operation('queue.status', {
      result: {
        status: 'ok',
        stats,
        pendingTasks: stats.tasks.filter((t: any) => t.status === QueueStatus.QUEUED),
        failedTasks: stats.tasks.filter((t: any) => t.status === QueueStatus.FAILED)
      },
      metadata: {
        totalTasks: stats.total,
        queuedCount: stats.queued,
        processingCount: stats.processing,
        completedCount: stats.completed,
        failedCount: stats.failed
      }
    });
  } catch (error) {
    Logger.api.error('QUEUE', 'Queue stats error', error as Error);
    
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