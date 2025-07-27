/**
 * Error Suggestion Utility
 * 
 * Consolidates AWS/storage error handling patterns and suggestions across the application.
 * Eliminates ~25 lines of duplicated error mapping logic.
 */

export interface ErrorSuggestion {
  userMessage: string;
  errorCode: string;
  isRetryable: boolean;
  suggestion?: string;
}

export interface ErrorContext {
  operation?: string;
  resource?: string;
  code?: string;
  statusCode?: number;
}

/**
 * Maps storage and AWS error codes to user-friendly messages with suggestions
 * Consolidates patterns from upload/route.ts, error-handler.ts, and storage/index.ts
 */
export const ErrorSuggestionService = {
  /**
   * Check if error is a file not found error
   * Consolidates ENOENT checks across storage providers
   */
  isFileNotFoundError(error: any): boolean {
    return error?.code === 'ENOENT' || 
           error?.code === 'NoSuchKey' || 
           error?.message?.includes('not found') ||
           error?.statusCode === 404;
  },

  /**
   * Check if error is a database connection error
   * Consolidates connection error checks
   */
  isDatabaseConnectionError(error: any): boolean {
    return error?.code === 'ECONNREFUSED' || 
           error?.code === 'ER_CON_COUNT_ERROR' ||
           error?.message?.includes('connection refused');
  },

  /**
   * Check if error is a duplicate entry error
   * Consolidates duplicate detection across databases
   */
  isDuplicateError(error: any): boolean {
    return error?.code === 'ER_DUP_ENTRY' || 
           error?.code === '23505' || // PostgreSQL duplicate
           error?.message?.includes('duplicate');
  },

  /**
   * Get error category for unified error handling
   */
  getErrorCategory(error: any): 'not_found' | 'connection' | 'duplicate' | 'permission' | 'validation' | 'unknown' {
    if (this.isFileNotFoundError(error)) return 'not_found';
    if (this.isDatabaseConnectionError(error)) return 'connection';
    if (this.isDuplicateError(error)) return 'duplicate';
    if (error?.code === 'AccessDenied' || error?.code === 'Forbidden') return 'permission';
    if (error?.code?.startsWith('ER_') || error?.name === 'ValidationError') return 'validation';
    return 'unknown';
  },

  /**
   * Get comprehensive error suggestion for AWS/storage errors
   */
  getErrorSuggestion(error: any, context: ErrorContext = {}): ErrorSuggestion {
    const errorCode = error.code || error.Code || 'UNKNOWN_ERROR';
    const statusCode = error.statusCode || error.$metadata?.httpStatusCode;
    
    // AWS S3 specific errors
    switch (errorCode) {
      case 'NoSuchBucket':
        return {
          userMessage: 'Storage bucket not found',
          errorCode: 'STORAGE_BUCKET_NOT_FOUND',
          isRetryable: false,
          suggestion: 'Please check your storage configuration and bucket name.'
        };
        
      case 'AccessDenied':
      case 'Forbidden':
        return {
          userMessage: 'Storage access denied',
          errorCode: 'STORAGE_ACCESS_DENIED',
          isRetryable: false,
          suggestion: 'Please check your storage credentials and bucket permissions.'
        };
        
      case 'NoSuchKey':
        return {
          userMessage: context.resource ? `File '${context.resource}' not found in storage` : 'File not found in storage',
          errorCode: 'STORAGE_FILE_NOT_FOUND',
          isRetryable: false,
          suggestion: 'The requested file may have been moved or deleted.'
        };
        
      case 'InvalidBucketName':
        return {
          userMessage: 'Invalid storage bucket name',
          errorCode: 'STORAGE_INVALID_BUCKET',
          isRetryable: false,
          suggestion: 'Please check your storage configuration for valid bucket naming.'
        };
        
      // AWS throttling and rate limiting
      case 'SlowDown':
      case 'RequestLimitExceeded':
      case 'TooManyRequests':
        return {
          userMessage: 'Storage service is being throttled',
          errorCode: 'STORAGE_THROTTLED',
          isRetryable: true,
          suggestion: 'Please wait a moment and try again. The service is experiencing high load.'
        };
        
      case 'ServiceUnavailable':
        return {
          userMessage: 'Storage service temporarily unavailable',
          errorCode: 'STORAGE_SERVICE_UNAVAILABLE', 
          isRetryable: true,
          suggestion: 'The storage service is temporarily down. Please try again in a few minutes.'
        };
        
      case 'RequestTimeout':
        return {
          userMessage: 'Storage operation timed out',
          errorCode: 'STORAGE_TIMEOUT',
          isRetryable: true,
          suggestion: 'The operation took too long to complete. Please try again.'
        };
        
      // File system errors
      case 'ENOSPC':
        return {
          userMessage: 'Insufficient storage space',
          errorCode: 'STORAGE_QUOTA_EXCEEDED',
          isRetryable: false,
          suggestion: 'Please free up storage space or contact your administrator.'
        };
        
      case 'ENOENT':
        return {
          userMessage: 'File or directory not found',
          errorCode: 'STORAGE_PATH_NOT_FOUND',
          isRetryable: false,
          suggestion: 'The file path may be incorrect or the file may have been moved.'
        };
        
      // Network errors
      case 'ECONNREFUSED':
        return {
          userMessage: 'Cannot connect to storage service',
          errorCode: 'STORAGE_CONNECTION_REFUSED',
          isRetryable: true,
          suggestion: 'Please check your network connection and storage service configuration.'
        };
        
      case 'ETIMEDOUT':
        return {
          userMessage: 'Connection to storage service timed out',
          errorCode: 'STORAGE_CONNECTION_TIMEOUT',
          isRetryable: true,
          suggestion: 'Please check your network connection and try again.'
        };
        
      case 'ENOTFOUND':
        return {
          userMessage: 'Storage service not found',
          errorCode: 'STORAGE_SERVICE_NOT_FOUND',
          isRetryable: true,
          suggestion: 'Please check your storage service configuration and DNS settings.'
        };
        
      default:
        // Handle HTTP status codes for generic errors
        if (statusCode) {
          if (statusCode >= 500 && statusCode < 600) {
            return {
              userMessage: 'Storage service error',
              errorCode: 'STORAGE_SERVER_ERROR',
              isRetryable: true,
              suggestion: 'A server error occurred. Please try again in a few moments.'
            };
          }
          
          if (statusCode >= 400 && statusCode < 500) {
            return {
              userMessage: 'Storage request error',
              errorCode: 'STORAGE_CLIENT_ERROR',
              isRetryable: false,
              suggestion: 'Please check your request parameters and try again.'
            };
          }
        }
        
        // Generic fallback
        return {
          userMessage: context.operation ? `${context.operation} operation failed` : 'Storage operation failed',
          errorCode: 'STORAGE_UNKNOWN_ERROR',
          isRetryable: false,
          suggestion: 'An unexpected error occurred. Please try again or contact support.'
        };
    }
  },

  /**
   * Check if an error is retryable based on error codes and status
   * Consolidates retry logic from storage/index.ts
   */
  isRetryableError(error: any): boolean {
    const suggestion = this.getErrorSuggestion(error);
    return suggestion.isRetryable;
  },

  /**
   * Get user-friendly error message for storage operations
   * Consolidates messaging patterns from error-handler.ts and upload/route.ts
   */
  getUserMessage(error: any, context: ErrorContext = {}): string {
    const suggestion = this.getErrorSuggestion(error, context);
    return suggestion.userMessage;
  },

  /**
   * Get standardized error code for storage operations
   * Provides consistent error codes across the application
   */
  getErrorCode(error: any): string {
    const suggestion = this.getErrorSuggestion(error);
    return suggestion.errorCode;
  },

  /**
   * Get helpful suggestion text for error resolution
   */
  getSuggestion(error: any, context: ErrorContext = {}): string | undefined {
    const suggestion = this.getErrorSuggestion(error, context);
    return suggestion.suggestion;
  }
};