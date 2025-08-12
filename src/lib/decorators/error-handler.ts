import { Logger } from '@/lib/services/logger';

export interface ErrorHandlerOptions {
  operation: string;
  logLevel?: 'error' | 'warn' | 'info';
  rethrow?: boolean;
  returnOnError?: any;
  transformError?: (error: Error) => any;
}

export interface AsyncErrorResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: any;
}

/**
 * Decorator for consistent error handling across service methods.
 * Provides logging, error transformation, and standardized error responses.
 */
export function withErrorHandler<T extends any[], R>(
  options: ErrorHandlerOptions
) {
  return function decorator(
    _target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: T): Promise<R> {
      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        const errorObj = error as Error;
        
        // Log the error with appropriate level
        switch (options.logLevel || 'error') {
          case 'error':
            Logger.api.error(options.operation, `${propertyKey} failed`, errorObj);
            break;
          case 'warn':
            Logger.api.warn(options.operation, `${propertyKey} warning`, errorObj);
            break;
          case 'info':
            Logger.api.step(options.operation, `${propertyKey} info`, { error: errorObj.message });
            break;
        }

        // Transform error if transformer provided
        if (options.transformError) {
          const transformed = options.transformError(errorObj);
          if (options.rethrow) {
            throw transformed;
          }
          return transformed;
        }

        // Return specific value on error
        if (options.returnOnError !== undefined) {
          return options.returnOnError;
        }

        // Rethrow if specified
        if (options.rethrow) {
          throw error;
        }

        // Default: return null/undefined
        return undefined as R;
      }
    };

    return descriptor;
  };
}

/**
 * Function wrapper for error handling without decorators.
 * Useful for standalone functions or when decorators aren't suitable.
 */
export function handleErrors<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  options: ErrorHandlerOptions
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      const errorObj = error as Error;
      
      // Log the error
      switch (options.logLevel || 'error') {
        case 'error':
          Logger.api.error(options.operation, `Function failed`, errorObj);
          break;
        case 'warn':
          Logger.api.warn(options.operation, `Function warning`, errorObj);
          break;
        case 'info':
          Logger.api.step(options.operation, `Function info`, { error: errorObj.message });
          break;
      }

      // Transform error if transformer provided
      if (options.transformError) {
        const transformed = options.transformError(errorObj);
        if (options.rethrow) {
          throw transformed;
        }
        return transformed;
      }

      // Return specific value on error
      if (options.returnOnError !== undefined) {
        return options.returnOnError;
      }

      // Rethrow if specified
      if (options.rethrow) {
        throw error;
      }

      return undefined as R;
    }
  };
}

/**
 * Wrapper for operations that should return success/error objects.
 * Common pattern for service methods that need detailed error reporting.
 */
export function withAsyncErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  operation: string
): (...args: T) => Promise<AsyncErrorResult<R>> {
  return async (...args: T): Promise<AsyncErrorResult<R>> => {
    try {
      const data = await fn(...args);
      Logger.api.success(operation, 'Operation completed successfully');
      return {
        success: true,
        data
      };
    } catch (error) {
      const errorObj = error as Error;
      Logger.api.error(operation, 'Operation failed', errorObj);
      return {
        success: false,
        error: errorObj.message,
        details: {
          name: errorObj.name,
          stack: errorObj.stack
        }
      };
    }
  };
}

/**
 * Database operation error handler.
 * Specialized for database operations with specific error types.
 */
export function withDatabaseErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  operation: string
): (...args: T) => Promise<R | null> {
  return async (...args: T): Promise<R | null> => {
    try {
      return await fn(...args);
    } catch (error) {
      const errorObj = error as any;
      
      // Enhanced logging for database errors
      const errorDetails = {
        code: errorObj.code,
        errno: errorObj.errno,
        sqlState: errorObj.sqlState,
        sqlMessage: errorObj.sqlMessage,
        sql: errorObj.sql
      };
      
      console.error(`Database operation failed: ${operation}`, errorObj, errorDetails);
      
      // Check for specific database error types
      if (errorObj.code === 'ER_DUP_ENTRY') {
        console.warn('Duplicate entry detected', errorObj);
      } else if (errorObj.code === 'ER_NO_SUCH_TABLE') {
        console.error('Table does not exist', errorObj);
      } else if (errorObj.code === 'ECONNREFUSED') {
        console.error('Database connection refused', errorObj);
      }
      
      return null;
    }
  };
}

/**
 * Storage operation error handler.
 * Specialized for file storage operations.
 */
export function withStorageErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  operation: string
): (...args: T) => Promise<AsyncErrorResult<R>> {
  return async (...args: T): Promise<AsyncErrorResult<R>> => {
    try {
      const data = await fn(...args);
      Logger.storage.success(`Storage operation successful: ${operation}`);
      return {
        success: true,
        data
      };
    } catch (error) {
      const errorObj = error as any;
      
      // Enhanced logging for storage errors
      const errorDetails = {
        code: errorObj.code,
        statusCode: errorObj.statusCode,
        region: errorObj.region,
        bucketName: errorObj.Bucket
      };
      
      console.error(`Storage operation failed: ${operation}`, errorObj, errorDetails);
      
      // Map common storage errors to user-friendly messages
      let userMessage = 'Storage operation failed';
      
      switch (errorObj.code) {
        case 'NoSuchBucket':
          userMessage = 'Storage bucket not found';
          break;
        case 'AccessDenied':
          userMessage = 'Storage access denied';
          break;
        case 'NoSuchKey':
          userMessage = 'File not found in storage';
          break;
        case 'ENOSPC':
          userMessage = 'Insufficient storage space';
          break;
        case 'ENOENT':
          userMessage = 'File or directory not found';
          break;
      }
      
      return {
        success: false,
        error: userMessage,
        details: errorDetails
      };
    }
  };
}

/**
 * Validation error handler.
 * For operations that need input validation.
 */
export function withValidationErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  operation: string
): (...args: T) => Promise<{ valid: boolean; data?: R; errors?: string[] }> {
  return async (...args: T): Promise<{ valid: boolean; data?: R; errors?: string[] }> => {
    try {
      const data = await fn(...args);
      Logger.api.step(operation, 'Validation passed');
      return {
        valid: true,
        data
      };
    } catch (error) {
      const errorObj = error as Error;
      Logger.api.warn(operation, 'Validation failed', errorObj);
      
      // Extract validation errors if it's a validation error object
      const errors = Array.isArray((error as any).errors) 
        ? (error as any).errors 
        : [errorObj.message];
      
      return {
        valid: false,
        errors
      };
    }
  };
}

/**
 * Retry wrapper with exponential backoff.
 * For operations that might succeed on retry.
 */
export function withRetryErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  operation: string,
  maxRetries: number = 3,
  baseDelay: number = 1000
): (...args: T) => Promise<AsyncErrorResult<R>> {
  return async (...args: T): Promise<AsyncErrorResult<R>> => {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const data = await fn(...args);
        if (attempt > 1) {
          Logger.api.success(operation, `Operation succeeded on attempt ${attempt}`);
        }
        return {
          success: true,
          data
        };
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt - 1);
          Logger.api.warn(operation, `Attempt ${attempt} failed, retrying in ${delay}ms`, lastError);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          Logger.api.error(operation, `All ${maxRetries} attempts failed`, lastError);
        }
      }
    }
    
    return {
      success: false,
      error: lastError?.message || 'Unknown error',
      details: {
        attempts: maxRetries,
        lastError: lastError?.stack
      }
    };
  };
}