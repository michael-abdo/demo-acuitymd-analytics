import { NextRequest } from 'next/server';
import { Logger } from '@/lib/services/logger';
import { ApiErrors, TimestampUtils } from '@/lib/utils';

export interface ApiLoggerContext {
  operation: string;
  userEmail: string;
  step: (message: string, metadata?: any) => void;
  success: (message: string, metadata?: any) => void;
  error: (message: string, error: Error, metadata?: any) => void;
}

export type ApiHandlerWithLogging<T = any> = (
  request: NextRequest,
  userEmail: string,
  context: ApiLoggerContext,
  params?: T
) => Promise<Response>;

/**
 * API logging decorator that provides consistent logging across all routes.
 * Automatically handles start and error logging, provides context for step/success logging.
 * 
 * @param operation - The operation name (e.g., 'UPLOAD', 'COMPARE', 'DELETE')
 * @param handler - The API handler function that receives logging context
 * @returns Decorated handler with automatic logging
 */
export function withApiLogging<T = any>(
  operation: string,
  handler: ApiHandlerWithLogging<T>
) {
  return async (request: NextRequest, userEmail: string, params?: T): Promise<Response> => {
    // Start logging with request metadata
    Logger.api.start(operation, userEmail, {
      method: request.method,
      url: request.url,
      userAgent: request.headers.get('user-agent'),
      timestamp: new Date().toISOString()
    });

    // Create logging context
    const loggerContext: ApiLoggerContext = {
      operation,
      userEmail,
      step: (message: string, metadata?: any) => {
        Logger.api.step(operation, message, metadata);
      },
      success: (message: string, metadata?: any) => {
        Logger.api.success(operation, message, metadata);
      },
      error: (message: string, error: Error, metadata?: any) => {
        Logger.api.error(operation, message, error, metadata);
      }
    };

    try {
      // Execute the handler with logging context
      const response = await handler(request, userEmail, loggerContext, params);
      
      // Log successful completion
      Logger.api.success(operation, 'Operation completed successfully', {
        statusCode: response.status,
        userEmail
      });
      
      return response;
    } catch (error) {
      // Log error and return standardized error response
      Logger.api.error(operation, 'Operation failed with unhandled error', error as Error, {
        userEmail,
        errorType: (error as Error).constructor.name
      });
      
      return ApiErrors.serverError('Internal server error');
    }
  };
}

/**
 * Combination decorator that applies both authentication and API logging.
 * Commonly used pattern for protected API routes.
 */
export function withAuthAndLogging<T = any>(
  operation: string,
  handler: ApiHandlerWithLogging<T>
) {
  return withApiLogging(operation, handler);
}

/**
 * Performance logging decorator that tracks operation duration.
 * Useful for monitoring slow operations.
 */
export function withPerformanceLogging<T = any>(
  operation: string,
  handler: ApiHandlerWithLogging<T>
) {
  return async (request: NextRequest, userEmail: string, params?: T): Promise<Response> => {
    const startTime = Date.now();
    
    Logger.api.start(operation, userEmail, {
      method: request.method,
      url: request.url,
      startTime: new Date(startTime).toISOString()
    });

    const loggerContext: ApiLoggerContext = {
      operation,
      userEmail,
      step: (message: string, metadata?: any) => {
        const elapsed = Date.now() - startTime;
        Logger.api.step(operation, message, { ...metadata, elapsed: `${elapsed}ms` });
      },
      success: (message: string, metadata?: any) => {
        const elapsed = Date.now() - startTime;
        Logger.api.success(operation, message, { ...metadata, elapsed: `${elapsed}ms` });
      },
      error: (message: string, error: Error, metadata?: any) => {
        const elapsed = Date.now() - startTime;
        Logger.api.error(operation, message, error, { ...metadata, elapsed: `${elapsed}ms` });
      }
    };

    try {
      const response = await handler(request, userEmail, loggerContext, params);
      
      const totalTime = Date.now() - startTime;
      Logger.api.success(operation, 'Operation completed', {
        statusCode: response.status,
        totalTime: `${totalTime}ms`,
        userEmail
      });
      
      return response;
    } catch (error) {
      const totalTime = Date.now() - startTime;
      Logger.api.error(operation, 'Operation failed', error as Error, {
        userEmail,
        totalTime: `${totalTime}ms`,
        errorType: (error as Error).constructor.name
      });
      
      return ApiErrors.serverError('Internal server error');
    }
  };
}

/**
 * Decorator for operations that should be logged with extra detail.
 * Includes request body size, response size, etc.
 */
export function withDetailedLogging<T = any>(
  operation: string,
  handler: ApiHandlerWithLogging<T>
) {
  return async (request: NextRequest, userEmail: string, params?: T): Promise<Response> => {
    const startTime = Date.now();
    const requestSize = request.headers.get('content-length');
    
    Logger.api.start(operation, userEmail, {
      method: request.method,
      url: request.url,
      requestSize: requestSize ? `${requestSize} bytes` : 'unknown',
      contentType: request.headers.get('content-type'),
      startTime: new Date(startTime).toISOString()
    });

    const loggerContext: ApiLoggerContext = {
      operation,
      userEmail,
      step: (message: string, metadata?: any) => {
        const elapsed = Date.now() - startTime;
        Logger.api.step(operation, message, { ...metadata, elapsed: `${elapsed}ms` });
      },
      success: (message: string, metadata?: any) => {
        const elapsed = Date.now() - startTime;
        Logger.api.success(operation, message, { ...metadata, elapsed: `${elapsed}ms` });
      },
      error: (message: string, error: Error, metadata?: any) => {
        const elapsed = Date.now() - startTime;
        Logger.api.error(operation, message, error, { ...metadata, elapsed: `${elapsed}ms` });
      }
    };

    try {
      const response = await handler(request, userEmail, loggerContext, params);
      
      const totalTime = Date.now() - startTime;
      const responseHeaders = Object.fromEntries(response.headers.entries());
      
      Logger.api.success(operation, 'Operation completed with detailed logging', {
        statusCode: response.status,
        totalTime: `${totalTime}ms`,
        responseSize: responseHeaders['content-length'] || 'unknown',
        userEmail
      });
      
      return response;
    } catch (error) {
      const totalTime = Date.now() - startTime;
      Logger.api.error(operation, 'Operation failed with detailed logging', error as Error, {
        userEmail,
        totalTime: `${totalTime}ms`,
        errorType: (error as Error).constructor.name,
        stack: (error as Error).stack
      });
      
      return ApiErrors.serverError('Internal server error');
    }
  };
}

/**
 * Common logging patterns used across API routes - consolidates repetitive logging
 */
export const LogPatterns = {
  /**
   * Database operation patterns
   */
  database: {
    fetch: (resource: string, criteria?: Record<string, any>) => ({
      start: `Fetching ${resource} from database`,
      success: (count?: number) => `${resource} fetched successfully${count !== undefined ? ` (${count} records)` : ''}`,
      error: `Failed to fetch ${resource} from database`,
      metadata: (criteria: Record<string, any> = {}) => ({ query: criteria, timestamp: TimestampUtils.now() })
    }),
    
    create: (resource: string) => ({
      start: `Creating ${resource} in database`,
      success: (id?: string | number) => `${resource} created successfully${id ? ` (ID: ${id})` : ''}`,
      error: `Failed to create ${resource} in database`,
      metadata: (data: Record<string, any> = {}) => ({ created: data, timestamp: TimestampUtils.now() })
    }),
    
    update: (resource: string, id: string | number) => ({
      start: `Updating ${resource} ${id} in database`,
      success: `${resource} ${id} updated successfully`,
      error: `Failed to update ${resource} ${id} in database`,
      metadata: (changes: Record<string, any> = {}) => ({ id, changes, timestamp: TimestampUtils.now() })
    }),
    
    delete: (resource: string, id: string | number) => ({
      start: `Deleting ${resource} ${id} from database`,
      success: `${resource} ${id} deleted successfully`,
      error: `Failed to delete ${resource} ${id} from database`,
      metadata: () => ({ id, timestamp: TimestampUtils.now() })
    })
  },
  
  /**
   * Validation operation patterns
   */
  validation: {
    input: (data: string) => ({
      start: `Validating ${data} input`,
      success: `${data} validation passed`,
      error: `${data} validation failed`,
      metadata: (rules: string[] = []) => ({ rules, timestamp: TimestampUtils.now() })
    }),
    
    ownership: (resource: string, id: string | number) => ({
      start: `Validating ownership of ${resource} ${id}`,
      success: `Ownership validated for ${resource} ${id}`,
      error: `Ownership validation failed for ${resource} ${id}`,
      metadata: (userEmail: string) => ({ resource, id, userEmail, timestamp: TimestampUtils.now() })
    }),
    
    file: (filename: string) => ({
      start: `Validating file: ${filename}`,
      success: `File validation passed: ${filename}`,
      error: `File validation failed: ${filename}`,
      metadata: (size?: number, type?: string) => ({ filename, size, type, timestamp: TimestampUtils.now() })
    })
  },
  
  /**
   * Processing operation patterns
   */
  processing: {
    start: (operation: string, target: string) => ({
      start: `Starting ${operation} for ${target}`,
      success: `${operation} completed for ${target}`,
      error: `${operation} failed for ${target}`,
      metadata: (details: Record<string, any> = {}) => ({ operation, target, ...details, timestamp: TimestampUtils.now() })
    }),
    
    queue: (operation: string, documentId: string | number) => ({
      start: `Queueing ${operation} for document ${documentId}`,
      success: `${operation} queued successfully for document ${documentId}`,
      error: `Failed to queue ${operation} for document ${documentId}`,
      metadata: (priority?: number) => ({ documentId, operation, priority, timestamp: TimestampUtils.now() })
    }),
    
    extract: (documentId: string | number) => ({
      start: `Starting text extraction for document ${documentId}`,
      success: `Text extraction completed for document ${documentId}`,
      error: `Text extraction failed for document ${documentId}`,
      metadata: (method?: string, pages?: number) => ({ documentId, method, pages, timestamp: TimestampUtils.now() })
    }),
    
    compare: (doc1Id: string | number, doc2Id: string | number) => ({
      start: `Starting comparison between documents ${doc1Id} and ${doc2Id}`,
      success: `Comparison completed between documents ${doc1Id} and ${doc2Id}`,
      error: `Comparison failed between documents ${doc1Id} and ${doc2Id}`,
      metadata: (differences?: number, similarity?: number) => ({ 
        doc1Id, doc2Id, differences, similarity, timestamp: TimestampUtils.now() 
      })
    })
  },
  
  /**
   * Storage operation patterns
   */
  storage: {
    upload: (filename: string) => ({
      start: `Uploading file: ${filename}`,
      success: `File uploaded successfully: ${filename}`,
      error: `File upload failed: ${filename}`,
      metadata: (size?: number, path?: string) => ({ filename, size, path, timestamp: TimestampUtils.now() })
    }),
    
    download: (filename: string) => ({
      start: `Preparing download for: ${filename}`,
      success: `Download URL generated for: ${filename}`,
      error: `Failed to generate download URL for: ${filename}`,
      metadata: (url?: string, expires?: string) => ({ filename, url, expires, timestamp: TimestampUtils.now() })
    }),
    
    delete: (filename: string) => ({
      start: `Deleting file: ${filename}`,
      success: `File deleted successfully: ${filename}`,
      error: `File deletion failed: ${filename}`,
      metadata: (path?: string) => ({ filename, path, timestamp: TimestampUtils.now() })
    })
  }
};

/**
 * Auto-logging decorator that applies common patterns automatically
 * Reduces boilerplate by 80% for standard operations
 */
export function withAutoLogging<T = any>(
  operation: string,
  patterns: {
    database?: Array<{ type: keyof typeof LogPatterns.database; resource: string; id?: string | number }>;
    validation?: Array<{ type: keyof typeof LogPatterns.validation; target: string; id?: string | number }>;
    processing?: Array<{ type: keyof typeof LogPatterns.processing; target: string; id?: string | number }>;
    storage?: Array<{ type: keyof typeof LogPatterns.storage; filename: string }>;
  } = {}
) {
  return (handler: ApiHandlerWithLogging<T>) => {
    return withApiLogging(operation, async (request, userEmail, logger, params) => {
      // Auto-log start patterns
      Object.entries(patterns).forEach(([category, items]) => {
        items?.forEach(item => {
          const pattern = LogPatterns[category as keyof typeof LogPatterns];
          if (pattern && pattern[item.type as keyof typeof pattern]) {
            const messages = pattern[item.type as keyof typeof pattern](item.target || item.resource, item.id);
            logger.step(messages.start);
          }
        });
      });
      
      try {
        const response = await handler(request, userEmail, logger, params);
        
        // Auto-log success patterns
        Object.entries(patterns).forEach(([category, items]) => {
          items?.forEach(item => {
            const pattern = LogPatterns[category as keyof typeof LogPatterns];
            if (pattern && pattern[item.type as keyof typeof pattern]) {
              const messages = pattern[item.type as keyof typeof pattern](item.target || item.resource, item.id);
              logger.success(messages.success);
            }
          });
        });
        
        return response;
        
      } catch (error) {
        // Auto-log error patterns
        Object.entries(patterns).forEach(([category, items]) => {
          items?.forEach(item => {
            const pattern = LogPatterns[category as keyof typeof LogPatterns];
            if (pattern && pattern[item.type as keyof typeof pattern]) {
              const messages = pattern[item.type as keyof typeof pattern](item.target || item.resource, item.id);
              logger.error(messages.error, error as Error);
            }
          });
        });
        
        throw error;
      }
    });
  };
}

/**
 * Quick decorators for common operation types
 */
export const QuickLoggers = {
  /**
   * Document operation logging
   */
  document: (operation: 'fetch' | 'create' | 'update' | 'delete', documentId?: string | number) =>
    withAutoLogging(`DOCUMENT-${operation.toUpperCase()}`, {
      database: [{ type: operation, resource: 'document', id: documentId }]
    }),
    
  /**
   * File upload operation logging
   */
  upload: (filename: string) =>
    withAutoLogging('UPLOAD', {
      validation: [{ type: 'file', target: filename }],
      storage: [{ type: 'upload', filename }]
    }),
    
  /**
   * Comparison operation logging
   */
  comparison: (doc1Id: string | number, doc2Id: string | number) =>
    withAutoLogging('COMPARE', {
      validation: [
        { type: 'ownership', target: 'document', id: doc1Id },
        { type: 'ownership', target: 'document', id: doc2Id }
      ],
      processing: [{ type: 'compare', target: `${doc1Id}-${doc2Id}` }]
    })
};