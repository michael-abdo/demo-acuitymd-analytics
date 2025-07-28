/**
 * Status Manager Utility
 * 
 * Centralizes status transition logic and validation across all entities.
 * Eliminates ~80 lines of duplicated status validation code.
 * 
 * Follows the DRY principle by providing a single source of truth for
 * valid status transitions and their validation rules.
 */

import { DocumentStatus, ComparisonStatus, QueueStatus } from '@/types/nda';

/**
 * Valid status transitions for each entity type
 */
const STATUS_TRANSITIONS = {
  document: {
    [DocumentStatus.UPLOADED]: [DocumentStatus.PROCESSING, DocumentStatus.ERROR],
    [DocumentStatus.PROCESSING]: [DocumentStatus.PROCESSED, DocumentStatus.ERROR],
    [DocumentStatus.PROCESSED]: [], // Terminal state
    [DocumentStatus.ERROR]: [DocumentStatus.PROCESSING] // Can retry processing
  },
  
  comparison: {
    [ComparisonStatus.PENDING]: [ComparisonStatus.PROCESSING, ComparisonStatus.ERROR],
    [ComparisonStatus.PROCESSING]: [ComparisonStatus.COMPLETED, ComparisonStatus.ERROR],
    [ComparisonStatus.COMPLETED]: [], // Terminal state
    [ComparisonStatus.ERROR]: [ComparisonStatus.PROCESSING] // Can retry processing
  },
  
  queue: {
    // Note: Supporting both QUEUED and PENDING for backward compatibility
    'queued': ['processing', 'failed'],
    'pending': ['processing', 'failed'],
    'processing': ['completed', 'failed'],
    'completed': [], // Terminal state
    'failed': ['pending', 'queued'] // Can retry by requeueing
  }
} as const;

/**
 * Entity type for status transitions
 */
export type EntityType = 'document' | 'comparison' | 'queue';

/**
 * All possible status values
 */
export type AllStatusTypes = DocumentStatus | ComparisonStatus | QueueStatus | string;

/**
 * Status transition validation result
 */
export interface StatusTransitionResult {
  isValid: boolean;
  reason?: string;
  suggestedActions?: string[];
}

/**
 * Status transition context for logging and validation
 */
export interface StatusTransitionContext {
  entityType: EntityType;
  entityId: number | string;
  currentStatus: AllStatusTypes;
  targetStatus: AllStatusTypes;
  metadata?: Record<string, any>;
  userId?: string;
}

/**
 * Status Manager for centralized status transition logic
 */
export class StatusManager {
  
  /**
   * Validate if a status transition is allowed
   */
  static validateTransition(
    entityType: EntityType,
    currentStatus: AllStatusTypes,
    targetStatus: AllStatusTypes
  ): StatusTransitionResult {
    // Get valid transitions for the entity type
    const transitions = STATUS_TRANSITIONS[entityType];
    
    if (!transitions) {
      return {
        isValid: false,
        reason: `Unknown entity type: ${entityType}`
      };
    }
    
    // Normalize status values for queue (handle both queued/pending)
    const normalizedCurrent = this.normalizeQueueStatus(entityType, currentStatus);
    const normalizedTarget = this.normalizeQueueStatus(entityType, targetStatus);
    
    // Check if current status exists in transitions
    const validTargets = transitions[normalizedCurrent as keyof typeof transitions] as string[];
    
    if (!validTargets) {
      return {
        isValid: false,
        reason: `Invalid current status: ${currentStatus}`,
        suggestedActions: this.getSuggestedActionsForStatus(entityType, currentStatus)
      };
    }
    
    // Check if target status is in valid transitions
    if (!validTargets.includes(normalizedTarget as any)) {
      return {
        isValid: false,
        reason: `Invalid transition from ${currentStatus} to ${targetStatus}`,
        suggestedActions: validTargets.length > 0 
          ? [`Valid transitions: ${validTargets.join(', ')}`]
          : ['No valid transitions available (terminal state)']
      };
    }
    
    return { isValid: true };
  }
  
  /**
   * Normalize queue status to handle QUEUED/PENDING inconsistency
   */
  private static normalizeQueueStatus(entityType: EntityType, status: AllStatusTypes): string {
    if (entityType !== 'queue') return status as string;
    
    // Convert enum values to string
    if (status === QueueStatus.QUEUED || status === 'queued') return 'queued';
    if (status === 'pending') return 'pending'; // Handle string literal
    
    return status as string;
  }
  
  /**
   * Get suggested actions for a given status
   */
  private static getSuggestedActionsForStatus(
    entityType: EntityType,
    status: AllStatusTypes
  ): string[] {
    const transitions = STATUS_TRANSITIONS[entityType];
    const normalizedStatus = this.normalizeQueueStatus(entityType, status);
    const validTargets = transitions[normalizedStatus as keyof typeof transitions] as string[];
    
    if (!validTargets || validTargets.length === 0) {
      return ['Entity is in terminal state - no further transitions possible'];
    }
    
    return validTargets.map(target => `Transition to: ${target}`);
  }
  
  /**
   * Check if a status is a terminal state (no valid transitions)
   */
  static isTerminalState(entityType: EntityType, status: AllStatusTypes): boolean {
    const transitions = STATUS_TRANSITIONS[entityType];
    const normalizedStatus = this.normalizeQueueStatus(entityType, status);
    const validTargets = transitions[normalizedStatus as keyof typeof transitions] as string[];
    
    return !validTargets || validTargets.length === 0;
  }
  
  /**
   * Check if a status is an error state
   */
  static isErrorState(entityType: EntityType, status: AllStatusTypes): boolean {
    const errorStates = {
      document: [DocumentStatus.ERROR] as string[],
      comparison: [ComparisonStatus.ERROR] as string[],
      queue: ['failed', QueueStatus.FAILED] as string[]
    };
    
    return errorStates[entityType].includes(status as string);
  }
  
  /**
   * Check if a status is a processing state
   */
  static isProcessingState(entityType: EntityType, status: AllStatusTypes): boolean {
    const processingStates = {
      document: [DocumentStatus.PROCESSING] as string[],
      comparison: [ComparisonStatus.PROCESSING] as string[],
      queue: ['processing', QueueStatus.PROCESSING] as string[]
    };
    
    return processingStates[entityType].includes(status as string);
  }
  
  /**
   * Get all valid next statuses for a given current status
   */
  static getValidNextStatuses(
    entityType: EntityType,
    currentStatus: AllStatusTypes
  ): AllStatusTypes[] {
    const transitions = STATUS_TRANSITIONS[entityType];
    const normalizedStatus = this.normalizeQueueStatus(entityType, currentStatus);
    return transitions[normalizedStatus as keyof typeof transitions] || [];
  }
  
  /**
   * Perform a validated status transition with logging
   */
  static async performTransition(
    context: StatusTransitionContext,
    updateFunction: (id: number | string, status: AllStatusTypes) => Promise<boolean>
  ): Promise<{ success: boolean; error?: string }> {
    // Validate the transition
    const validation = this.validateTransition(
      context.entityType,
      context.currentStatus,
      context.targetStatus
    );
    
    if (!validation.isValid) {
      console.warn(`Status transition blocked: ${validation.reason}`, {
        entityType: context.entityType,
        entityId: context.entityId,
        transition: `${context.currentStatus} → ${context.targetStatus}`,
        suggestions: validation.suggestedActions
      });
      
      return {
        success: false,
        error: validation.reason
      };
    }
    
    try {
      // Log the transition attempt
      console.log(`Status transition: ${context.entityType}:${context.entityId}`, {
        from: context.currentStatus,
        to: context.targetStatus,
        userId: context.userId,
        metadata: context.metadata
      });
      
      // Perform the update
      const result = await updateFunction(context.entityId, context.targetStatus);
      
      if (result) {
        console.log(`Status transition successful: ${context.entityType}:${context.entityId}`, {
          newStatus: context.targetStatus
        });
      } else {
        console.error(`Status transition failed: ${context.entityType}:${context.entityId}`, {
          reason: 'Update function returned false'
        });
      }
      
      return { success: result };
    } catch (error) {
      console.error(`Status transition error: ${context.entityType}:${context.entityId}`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Get status progression percentage (for UI progress indicators)
   */
  static getProgressPercentage(entityType: EntityType, status: AllStatusTypes): number {
    const progressMap = {
      document: {
        [DocumentStatus.UPLOADED]: 25,
        [DocumentStatus.PROCESSING]: 75,
        [DocumentStatus.PROCESSED]: 100,
        [DocumentStatus.ERROR]: 0
      },
      comparison: {
        [ComparisonStatus.PENDING]: 25,
        [ComparisonStatus.PROCESSING]: 75,
        [ComparisonStatus.COMPLETED]: 100,
        [ComparisonStatus.ERROR]: 0
      },
      queue: {
        'queued': 25,
        'pending': 25,
        'processing': 75,
        'completed': 100,
        'failed': 0
      }
    };
    
    const normalizedStatus = this.normalizeQueueStatus(entityType, status);
    return progressMap[entityType][normalizedStatus as keyof typeof progressMap[typeof entityType]] || 0;
  }
}

/**
 * Convenience functions for common status operations
 */
export const StatusUtils = {
  /**
   * Check if transition is valid (shorthand)
   */
  canTransition: (
    entityType: EntityType,
    from: AllStatusTypes,
    to: AllStatusTypes
  ): boolean => {
    return StatusManager.validateTransition(entityType, from, to).isValid;
  },
  
  /**
   * Check if status indicates success
   */
  isSuccessStatus: (entityType: EntityType, status: AllStatusTypes): boolean => {
    const successStates = {
      document: [DocumentStatus.PROCESSED] as string[],
      comparison: [ComparisonStatus.COMPLETED] as string[],
      queue: ['completed', QueueStatus.COMPLETED] as string[]
    };
    
    return successStates[entityType].includes(status as string);
  },
  
  /**
   * Check if status indicates pending/waiting state
   */
  isPendingStatus: (entityType: EntityType, status: AllStatusTypes): boolean => {
    const pendingStates = {
      document: [DocumentStatus.UPLOADED] as string[],
      comparison: [ComparisonStatus.PENDING] as string[],
      queue: ['queued', 'pending', QueueStatus.QUEUED] as string[]
    };
    
    return pendingStates[entityType].includes(status as string);
  }
};