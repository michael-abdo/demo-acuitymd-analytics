/**
 * Queue Service
 * 
 * Consolidates queue management patterns and business logic.
 * Eliminates ~35 lines of duplicated queue processing and statistics logic.
 */

import { QueueStatus, TaskType, queueDb } from '@/lib/nda';
import { processTextExtraction } from '@/lib/text-extraction';
import { Logger } from '@/lib/auth-utils';
import { QueueItemExtended } from '@/lib/nda/repositories/queue';

export interface QueueTaskResult {
  id: number;
  type: TaskType;
  documentId: number;
  status: 'completed' | 'failed' | 'retrying';
  completedAt?: Date;
  errorMessage?: string;
  attempts?: number;
}

export interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  total: number;
  pendingTasks: Array<{
    id: number;
    document_id: number;
    task_type: TaskType;
    status: QueueStatus;
    created_at?: Date;
  }>;
  failedTasks: Array<{
    id: number;
    document_id: number;
    task_type: TaskType;
    status: QueueStatus;
    error_message?: string;
    attempts: number;
  }>;
}

export interface QueueProcessingOptions {
  maxRetries?: number;
  timeoutMs?: number;
  loggerKey?: 'api' | 'queue' | 'system';
}

/**
 * High-level queue service with standardized patterns
 */
export const QueueService = {
  /**
   * Process the next available task in the queue
   * Consolidates the processing pattern from process-queue/route.ts
   */
  async processNext(options: QueueProcessingOptions = {}): Promise<QueueTaskResult | null> {
    const { loggerKey = 'api', timeoutMs = 30000 } = options;
    const startTime = Date.now();

    // Get the next queued task
    const task = await queueDb.getNext();
    
    if (!task) {
      Logger[loggerKey].step('QUEUE', 'No tasks in queue - idle');
      return null;
    }

    Logger[loggerKey].step('QUEUE', 'Found task to process', {
      taskId: task.id,
      taskType: task.task_type,
      documentId: task.document_id,
      attempts: task.attempts
    });

    // Mark task as processing
    await queueDb.updateStatus(task.id, QueueStatus.PROCESSING);
    
    try {
      // Set timeout for task processing
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Task timeout after ${timeoutMs}ms`)), timeoutMs);
      });

      // Process the task based on type
      const taskPromise = this.processTaskByType(task);
      await Promise.race([taskPromise, timeoutPromise]);

      // Mark task as completed
      await queueDb.updateStatus(task.id, QueueStatus.COMPLETED);
      
      const duration = Date.now() - startTime;
      Logger[loggerKey].success('QUEUE', `Task ${task.id} completed in ${duration}ms`);
      
      return {
        id: task.id,
        type: task.task_type,
        documentId: task.document_id,
        status: 'completed',
        completedAt: new Date()
      };

    } catch (error) {
      return this.handleTaskError(task, error, { loggerKey });
    }
  },

  /**
   * Process a task based on its type
   * Consolidates the task type switching logic
   */
  async processTaskByType(task: QueueItemExtended): Promise<void> {
    switch (task.task_type) {
      case TaskType.EXTRACT_TEXT:
        await processTextExtraction(task.document_id);
        break;
      
      case TaskType.COMPARE:
        // Future implementation for comparison processing
        throw new Error('Comparison processing not yet implemented');
      
      case TaskType.EXPORT:
        // Future implementation for export processing
        throw new Error('Export processing not yet implemented');
      
      default:
        throw new Error(`Unknown task type: ${task.task_type}`);
    }
  },

  /**
   * Handle task errors with retry logic
   * Consolidates the error handling pattern from process-queue/route.ts
   */
  async handleTaskError(
    task: QueueItemExtended, 
    error: any, 
    options: QueueProcessingOptions = {}
  ): Promise<QueueTaskResult> {
    const { loggerKey = 'api' } = options;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    Logger[loggerKey].error('QUEUE', `Task ${task.id} failed`, error as Error);
    
    // Update task with error
    await queueDb.updateError(task.id, errorMessage);
    
    // Check if we should retry
    const shouldRetry = task.attempts < (task.max_attempts - 1);
    
    if (shouldRetry) {
      await queueDb.retry(task.id);
      Logger[loggerKey].warn('QUEUE', `Task ${task.id} will be retried (attempt ${task.attempts + 1}/${task.max_attempts})`);
      
      return {
        id: task.id,
        type: task.task_type,
        documentId: task.document_id,
        status: 'retrying',
        errorMessage,
        attempts: task.attempts + 1
      };
    } else {
      await queueDb.updateStatus(task.id, QueueStatus.FAILED);
      Logger[loggerKey].error('QUEUE', `Task ${task.id} failed permanently after ${task.attempts} attempts`);
      
      return {
        id: task.id,
        type: task.task_type,
        documentId: task.document_id,
        status: 'failed',
        errorMessage,
        attempts: task.attempts
      };
    }
  },

  /**
   * Generate comprehensive queue statistics
   * Consolidates the statistics generation from process-queue/route.ts
   */
  async getStats(): Promise<QueueStats> {
    try {
      // Try to get all tasks (fallback to empty array if not implemented)
      const allTasks = await queueDb.findAll?.() || [];
      
      const stats: QueueStats = {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        total: allTasks.length,
        pendingTasks: [],
        failedTasks: []
      };
      
      // Process each task to generate statistics
      allTasks.forEach((task: any) => {
        switch (task.status) {
          case QueueStatus.PENDING:
            stats.pending++;
            stats.pendingTasks.push({
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
            stats.failedTasks.push({
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
      
      return stats;
      
    } catch (error) {
      Logger.api.error('QUEUE', 'Failed to generate queue statistics', error as Error);
      
      // Return minimal stats on error
      return {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        total: 0,
        pendingTasks: [],
        failedTasks: []
      };
    }
  },

  /**
   * Queue a task with standard options and error handling
   * Consolidates the queuing pattern used in compare/route.ts and document-service.ts
   */
  async queueTask(
    taskType: TaskType,
    documentId: number,
    userId: string,
    options: {
      priority?: number;
      metadata?: Record<string, any>;
      scheduledAt?: Date;
      maxAttempts?: number;
    } = {}
  ): Promise<QueueItemExtended> {
    const {
      priority = 1,
      metadata = {},
      scheduledAt = null,
      maxAttempts = 3
    } = options;

    try {
      const task = await queueDb.enqueue({
        document_id: documentId,
        task_type: taskType,
        user_id: userId,
        priority,
        max_attempts: maxAttempts,
        scheduled_at: scheduledAt,
        metadata
      });

      Logger.api.step('QUEUE', `Queued ${taskType} task for document ${documentId}`, {
        taskId: task.id,
        priority,
        scheduledAt
      });

      return task;

    } catch (error) {
      Logger.api.error('QUEUE', `Failed to queue ${taskType} task for document ${documentId}`, error as Error);
      throw error;
    }
  },

  /**
   * Queue multiple tasks with batch processing
   * Consolidates the pattern used in compare/route.ts for queuing multiple extraction tasks
   */
  async queueBatch(
    tasks: Array<{
      taskType: TaskType;
      documentId: number;
      userId: string;
      priority?: number;
      metadata?: Record<string, any>;
    }>
  ): Promise<QueueItemExtended[]> {
    const queuePromises = tasks.map(task => 
      this.queueTask(task.taskType, task.documentId, task.userId, {
        priority: task.priority,
        metadata: task.metadata
      })
    );

    try {
      const queuedTasks = await Promise.all(queuePromises);
      
      Logger.api.success('QUEUE', `Queued ${tasks.length} tasks successfully`);
      
      return queuedTasks;

    } catch (error) {
      Logger.api.error('QUEUE', 'Batch queue operation failed', error as Error);
      throw error;
    }
  },

  /**
   * Trigger queue processing via API call
   * Consolidates the trigger pattern from compare/route.ts
   */
  async triggerProcessing(baseUrl: string, systemToken?: string): Promise<boolean> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (systemToken) {
        headers.Authorization = `Bearer ${systemToken}`;
      }

      const response = await fetch(`${baseUrl}/api/process-queue`, {
        method: 'POST',
        headers
      });

      if (response.ok) {
        Logger.api.success('QUEUE', 'Queue processing triggered successfully');
        return true;
      } else {
        Logger.api.error('QUEUE', `Queue processing trigger failed: ${response.status}`);
        return false;
      }

    } catch (error) {
      Logger.api.error('QUEUE', 'Failed to trigger queue processing', error as Error);
      return false;
    }
  }
};