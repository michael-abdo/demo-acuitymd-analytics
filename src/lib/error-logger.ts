/**
 * Centralized error logging and monitoring
 */

import { config } from './config';
import { TimestampUtils } from './utils';
import { logError as winstonLogError } from './logger';

export interface ErrorContext {
  userId?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  documentId?: number;
  type?: string;
  metadata?: Record<string, any>;
}

export class ApiError extends Error {
  public statusCode: number;
  public context?: ErrorContext;

  constructor(message: string, statusCode: number, context?: ErrorContext) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.context = context;
  }
}

/**
 * Central error logger
 */
export const ErrorLogger = {
  /**
   * Log an error with context
   */
  log(error: Error | ApiError, context?: ErrorContext): void {
    const timestamp = TimestampUtils.now();
    const isApiError = error instanceof ApiError;
    const statusCode = isApiError ? error.statusCode : 500;
    
    // Use winston logger for comprehensive error logging
    winstonLogError(error, {
      statusCode,
      errorType: isApiError ? error.name : 'Error',
      context: isApiError ? error.context : context,
      endpoint: context?.endpoint,
      method: context?.method,
      userId: context?.userId,
      documentId: context?.documentId,
      metadata: context?.metadata
    });
    
    // In development, also log to console with formatting
    if (config.IS_DEVELOPMENT) {
      console.error(`\n[${timestamp}] API Error:`, {
        message: error.message,
        statusCode,
        stack: error.stack,
        context: isApiError ? error.context : context,
        endpoint: context?.endpoint,
        method: context?.method,
        userId: context?.userId
      });
    }
    
    // Here you could integrate with external error tracking services like Sentry
    // if (config.SENTRY_DSN) {
    //   Sentry.captureException(error, { extra: context });
    // }
  },

  /**
   * Log a warning
   */
  warn(message: string, context?: ErrorContext): void {
    const timestamp = TimestampUtils.now();
    
    if (config.IS_DEVELOPMENT) {
      console.warn(`\n[${timestamp}] Warning:`, message, context);
    } else {
      console.warn(JSON.stringify({
        timestamp,
        level: 'warn',
        message,
        context
      }));
    }
  },

  /**
   * Log info (for important events)
   */
  info(message: string, context?: ErrorContext): void {
    const timestamp = TimestampUtils.now();
    
    if (config.IS_DEVELOPMENT) {
      console.log(`\n[${timestamp}] Info:`, message, context);
    } else {
      console.log(JSON.stringify({
        timestamp,
        level: 'info',
        message,
        context
      }));
    }
  }
};

/**
 * Common error types
 */
export const ErrorTypes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  STORAGE_ERROR: 'STORAGE_ERROR',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR'
} as const;

/**
 * Error factory functions
 */
export const createError = {
  validation: (message: string, context?: ErrorContext) => 
    new ApiError(message, 422, { ...context, type: ErrorTypes.VALIDATION_ERROR }),
  
  notFound: (resource: string, context?: ErrorContext) => 
    new ApiError(`${resource} not found`, 404, { ...context, type: ErrorTypes.NOT_FOUND_ERROR }),
  
  unauthorized: (message: string = 'Unauthorized', context?: ErrorContext) => 
    new ApiError(message, 401, { ...context, type: ErrorTypes.AUTHENTICATION_ERROR }),
  
  forbidden: (message: string = 'Access denied', context?: ErrorContext) => 
    new ApiError(message, 403, { ...context, type: ErrorTypes.AUTHORIZATION_ERROR }),
  
  database: (message: string, context?: ErrorContext) => 
    new ApiError(message, 500, { ...context, type: ErrorTypes.DATABASE_ERROR }),
  
  storage: (message: string, context?: ErrorContext) => 
    new ApiError(message, 500, { ...context, type: ErrorTypes.STORAGE_ERROR }),
  
  external: (message: string, context?: ErrorContext) => 
    new ApiError(message, 502, { ...context, type: ErrorTypes.EXTERNAL_API_ERROR }),
  
  rateLimit: (message: string = 'Too many requests', context?: ErrorContext) => 
    new ApiError(message, 429, { ...context, type: ErrorTypes.RATE_LIMIT_ERROR })
};