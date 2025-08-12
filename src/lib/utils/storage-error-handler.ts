/**
 * Storage Error Handler Utility
 * 
 * Centralizes storage error handling and provides consistent error responses
 * across different storage operations.
 */

import { Logger } from '../services/logger';

/**
 * Storage operation types
 */
export type StorageOperation = 'upload' | 'download' | 'delete' | 'list' | 'head' | 'copy' | 'exists';

/**
 * Storage error context
 */
export interface StorageErrorContext {
  operation: StorageOperation;
  key?: string;
  provider?: string;
  metadata?: Record<string, any>;
}

/**
 * Storage error classification
 */
export interface StorageErrorClassification {
  type: 'network' | 'permission' | 'notFound' | 'quota' | 'timeout' | 'unknown';
  isRetryable: boolean;
  suggestedAction: string;
}

/**
 * Storage Error Handler
 */
export class StorageErrorHandler {
  
  /**
   * Handle storage error and return appropriate response
   */
  static handle(error: Error, context: StorageErrorContext): {
    error: Error;
    classification: StorageErrorClassification;
    shouldRetry: boolean;
  } {
    const classification = this.classifyError(error, context);
    
    // Log the error with context
    Logger.storage?.error?.(
      `Storage ${context.operation} failed (${context.key || 'unknown'})`,
      error
    );
    
    return {
      error,
      classification,
      shouldRetry: classification.isRetryable
    };
  }
  
  /**
   * Classify error type and determine retry strategy
   */
  private static classifyError(error: Error, _context: StorageErrorContext): StorageErrorClassification {
    const message = error.message.toLowerCase();
    
    // Network/connectivity errors
    if (message.includes('network') || message.includes('timeout') || message.includes('connection')) {
      return {
        type: 'network',
        isRetryable: true,
        suggestedAction: 'Retry the operation after a brief delay'
      };
    }
    
    // Permission/access errors
    if (message.includes('access denied') || message.includes('forbidden') || message.includes('unauthorized')) {
      return {
        type: 'permission',
        isRetryable: false,
        suggestedAction: 'Check storage credentials and permissions'
      };
    }
    
    // File not found errors
    if (message.includes('not found') || message.includes('does not exist') || message.includes('enoent')) {
      return {
        type: 'notFound',
        isRetryable: false,
        suggestedAction: 'Verify the file key/path exists'
      };
    }
    
    // Quota exceeded errors
    if (message.includes('quota') || message.includes('limit') || message.includes('storage full')) {
      return {
        type: 'quota',
        isRetryable: false,
        suggestedAction: 'Free up storage space or upgrade storage plan'
      };
    }
    
    // Timeout errors (specific case)
    if (message.includes('timeout')) {
      return {
        type: 'timeout',
        isRetryable: true,
        suggestedAction: 'Retry with longer timeout or smaller chunks'
      };
    }
    
    // Unknown error
    return {
      type: 'unknown',
      isRetryable: false,
      suggestedAction: 'Check error details and storage configuration'
    };
  }
  
  /**
   * Wrap storage operation with error handling
   */
  static async wrapOperation<T>(
    operation: () => Promise<T>,
    context: StorageErrorContext
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const handled = this.handle(error as Error, context);
      throw handled.error;
    }
  }
  
  /**
   * Check if error is retryable
   */
  static isRetryableError(error: Error, context: StorageErrorContext): boolean {
    const classification = this.classifyError(error, context);
    return classification.isRetryable;
  }
}

/**
 * Convenience function for handling storage errors
 */
export function storageErrorHandler(error: Error, context: StorageErrorContext) {
  return StorageErrorHandler.handle(error, context);
}