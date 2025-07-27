export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, ApiErrors, Logger } from '@/lib/auth-utils';
import { ensureStorageInitialized } from '@/lib/storage';
import { QueueService } from '@/lib/services/queue-service';
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
      return ApiErrors.unauthorized('Invalid system token');
    }
    
    Logger.api.start('QUEUE', 'system', { method: request.method, url: request.url });
    
    // Use centralized queue service (DRY: eliminates ~55 lines of duplicated queue processing)
    const taskResult = await QueueService.processNext({
      loggerKey: 'api',
      timeoutMs: 30000
    });
    
    if (!taskResult) {
      return ApiResponse.operation('queue.process', {
        result: {
          status: 'idle',
          message: 'No tasks in queue'
        },
        status: 'success'
      });
    }
    
    if (taskResult.status === 'completed') {
      return ApiResponse.queue.processed(taskResult, Date.now() - startTime);
    } else {
      // Task failed or is retrying
      throw new Error(taskResult.errorMessage || 'Task processing failed');
    }

  } catch (error) {
    Logger.api.error('QUEUE', 'Queue processing error', error as Error);
    return ApiErrors.serverError(error instanceof Error ? error.message : 'Queue processing failed');
  }
};

// GET endpoint to check queue status
export async function GET(request: NextRequest) {
  try {
    // Use centralized queue service (DRY: eliminates ~80 lines of duplicated statistics logic)
    const stats = await QueueService.getStats();
    
    return ApiResponse.operation('queue.status', {
      result: {
        status: 'ok',
        stats: {
          queued: stats.pending,
          processing: stats.processing,
          completed: stats.completed,
          failed: stats.failed,
          total: stats.total
        },
        pendingTasks: stats.pendingTasks,
        failedTasks: stats.failedTasks
      },
      metadata: {
        totalTasks: stats.total,
        queuedCount: stats.pending,
        processingCount: stats.processing,
        completedCount: stats.completed,
        failedCount: stats.failed
      }
    });
  } catch (error) {
    Logger.api.error('QUEUE', 'Queue stats error', error as Error);
    
    return ApiResponse.operation('queue.status', {
      result: {
        status: 'error',
        stats: {
          queued: 0,
          processing: 0,
          completed: 0,
          failed: 0,
          total: 0
        },
        message: 'Failed to retrieve queue statistics'
      },
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      status: 'partial'
    });
  }
}