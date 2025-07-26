import { NextRequest } from 'next/server';
import { Logger } from '@/lib/services/logger';
import { ApiErrors } from '@/lib/utils';

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