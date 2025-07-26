/**
 * Queue Repository Implementation
 * 
 * Extends BaseRepository with queue-specific operations.
 * Consolidates ~120 lines of queue-specific database code.
 */

import { BaseRepository } from './base';
import { ProcessingQueueRow } from '../types';
import { TaskType, QueueStatus } from '@/types/nda';

// Extended queue item type that includes all database fields
export interface QueueItemExtended {
  id: number;
  document_id: number;
  task_type: TaskType;
  priority: number;
  status: QueueStatus;
  attempts: number;
  max_attempts: number;
  scheduled_at: Date | null;
  started_at: Date | null;
  completed_at: Date | null;
  error_message: string | null;
  metadata: Record<string, any> | null;
  user_id: string;
  created_at?: Date;
  updated_at?: Date;
}

// Access to in-memory store
declare global {
  var _ndaMemoryStore: {
    documents: Map<number, any>;
    comparisons: Map<number, any>;
    exports: Map<number, any>;
    queue: Map<number, QueueItemExtended>;
    nextId: {
      documents: number;
      comparisons: number;
      exports: number;
      queue: number;
    };
  } | undefined;
}

/**
 * Convert database row to domain model
 */
function rowToQueueItem(row: ProcessingQueueRow): QueueItemExtended {
  return {
    ...row,
    metadata: row.metadata ? JSON.parse(row.metadata) : null
  };
}

/**
 * Queue-specific repository interface
 */
export interface IQueueRepository {
  findPendingTasks(limit?: number): Promise<QueueItemExtended[]>;
  findByDocument(documentId: number): Promise<QueueItemExtended[]>;
  findByStatus(status: QueueStatus, userId?: string): Promise<QueueItemExtended[]>;
  updateStatus(id: number, status: QueueStatus, startedAt?: Date, completedAt?: Date): Promise<boolean>;
  incrementAttempts(id: number, errorMessage?: string): Promise<boolean>;
  findNextTask(): Promise<QueueItemExtended | null>;
}

/**
 * Queue repository implementation
 */
export class QueueRepository 
  extends BaseRepository<
    QueueItemExtended,
    ProcessingQueueRow,
    Omit<QueueItemExtended, 'id' | 'created_at' | 'updated_at'>
  > 
  implements IQueueRepository {
  
  constructor() {
    // Initialize memory store if not exists
    if (!global._ndaMemoryStore) {
      global._ndaMemoryStore = {
        documents: new Map(),
        comparisons: new Map(),
        exports: new Map(),
        queue: new Map<number, QueueItemExtended>(),
        nextId: {
          documents: 1,
          comparisons: 1,
          exports: 1,
          queue: 1
        }
      };
    }
    
    super({
      tableName: 'processing_queue',
      entityName: 'queue_item',
      rowConverter: rowToQueueItem,
      memoryStore: global._ndaMemoryStore.queue as Map<number, QueueItemExtended>,
      nextId: () => global._ndaMemoryStore!.nextId.queue++
    });
  }
  
  /**
   * Find pending tasks ordered by priority and scheduled time
   */
  async findPendingTasks(limit: number = 10): Promise<QueueItemExtended[]> {
    const HAS_DB_ACCESS = (global as any)._ndaMemoryStore ? false : true;
    
    if (HAS_DB_ACCESS) {
      const rows = await this.executeCustomQuery<ProcessingQueueRow[]>(
        `SELECT * FROM processing_queue 
         WHERE status = ? AND (scheduled_at IS NULL OR scheduled_at <= NOW())
         ORDER BY priority DESC, scheduled_at ASC, created_at ASC
         LIMIT ?`,
        [QueueStatus.PENDING, limit],
        'findPendingTasks'
      );
      return rows.map(rowToQueueItem);
    } else {
      // In-memory search
      const now = new Date();
      let tasks = Array.from(this.config.memoryStore.values())
        .filter(task => 
          task.status === QueueStatus.PENDING && 
          (!task.scheduled_at || task.scheduled_at <= now)
        );
      
      // Sort by priority desc, then by scheduled_at asc, then created_at asc
      tasks.sort((a, b) => {
        if (a.priority !== b.priority) return b.priority - a.priority;
        
        const aScheduled = a.scheduled_at || a.created_at || new Date(0);
        const bScheduled = b.scheduled_at || b.created_at || new Date(0);
        return aScheduled.getTime() - bScheduled.getTime();
      });
      
      return tasks.slice(0, limit);
    }
  }
  
  /**
   * Find tasks by document ID
   */
  async findByDocument(documentId: number): Promise<QueueItemExtended[]> {
    const HAS_DB_ACCESS = (global as any)._ndaMemoryStore ? false : true;
    
    if (HAS_DB_ACCESS) {
      const rows = await this.executeCustomQuery<ProcessingQueueRow[]>(
        'SELECT * FROM processing_queue WHERE document_id = ? ORDER BY created_at DESC',
        [documentId],
        'findByDocument'
      );
      return rows.map(rowToQueueItem);
    } else {
      // In-memory filter
      return Array.from(this.config.memoryStore.values())
        .filter(task => task.document_id === documentId)
        .sort((a, b) => (b.created_at || new Date(0)).getTime() - (a.created_at || new Date(0)).getTime());
    }
  }
  
  /**
   * Find tasks by status
   */
  async findByStatus(status: QueueStatus, userId?: string): Promise<QueueItemExtended[]> {
    const HAS_DB_ACCESS = (global as any)._ndaMemoryStore ? false : true;
    
    if (HAS_DB_ACCESS) {
      let query = 'SELECT * FROM processing_queue WHERE status = ?';
      const values: any[] = [status];
      
      if (userId) {
        query += ' AND user_id = ?';
        values.push(userId);
      }
      
      query += ' ORDER BY created_at DESC';
      
      const rows = await this.executeCustomQuery<ProcessingQueueRow[]>(
        query,
        values,
        'findByStatus',
        userId
      );
      return rows.map(rowToQueueItem);
    } else {
      // In-memory filter
      let tasks = Array.from(this.config.memoryStore.values())
        .filter(task => task.status === status);
      
      if (userId) {
        tasks = tasks.filter(task => task.user_id === userId);
      }
      
      return tasks.sort((a, b) => (b.created_at || new Date(0)).getTime() - (a.created_at || new Date(0)).getTime());
    }
  }
  
  /**
   * Update task status with timestamps
   */
  async updateStatus(id: number, status: QueueStatus, startedAt?: Date, completedAt?: Date): Promise<boolean> {
    const updateData: Partial<QueueItemExtended> = { status };
    
    if (startedAt) updateData.started_at = startedAt;
    if (completedAt) updateData.completed_at = completedAt;
    
    return this.update(id, updateData);
  }
  
  /**
   * Increment attempts and optionally set error message
   */
  async incrementAttempts(id: number, errorMessage?: string): Promise<boolean> {
    const task = await this.findById(id);
    if (!task) return false;
    
    const updateData: Partial<QueueItemExtended> = {
      attempts: task.attempts + 1
    };
    
    if (errorMessage) {
      updateData.error_message = errorMessage;
    }
    
    // Mark as failed if max attempts reached
    if (task.attempts + 1 >= task.max_attempts) {
      updateData.status = QueueStatus.FAILED;
      updateData.completed_at = new Date();
    }
    
    return this.update(id, updateData);
  }
  
  /**
   * Find next task to process (atomic operation)
   */
  async findNextTask(): Promise<QueueItemExtended | null> {
    const tasks = await this.findPendingTasks(1);
    return tasks.length > 0 ? tasks[0] : null;
  }
  
  /**
   * Override create to set default values
   */
  async create(data: Omit<QueueItemExtended, 'id' | 'created_at' | 'updated_at'>): Promise<QueueItemExtended> {
    const queueData = {
      ...data,
      status: data.status || QueueStatus.PENDING,
      attempts: data.attempts || 0,
      max_attempts: data.max_attempts || 3,
      priority: data.priority || 1,
      scheduled_at: data.scheduled_at || null,
      started_at: data.started_at || null,
      completed_at: data.completed_at || null,
      error_message: data.error_message || null,
      metadata: data.metadata || null
    };
    
    return super.create(queueData);
  }
}