/**
 * Centralized Logging Service
 * 
 * Consolidates all logging patterns used across API routes to follow DRY principle.
 * Uses Pino for high-performance structured logging with conditional verbosity.
 */

import { EnvironmentHelpers } from '../config';
import { apiLogger, dbLogger, chatLogger, logger as pinoLogger, logIfEnabled } from '../pino-logger';

interface LogContext {
  userEmail?: string;
  documentId?: number;
  endpoint?: string;
  [key: string]: any;
}

// Check if API steps logging is enabled
const LOG_API_STEPS = process.env.LOG_API_STEPS === 'true';

export const Logger = {
  /**
   * API endpoint operation logging
   */
  api: {
    start: (endpoint: string, userEmail: string, details?: any) => {
      apiLogger.start('POST', endpoint);
      if (LOG_API_STEPS || pinoLogger.api.isLevelEnabled('debug')) {
        pinoLogger.api.debug({ endpoint, userEmail, ...details }, `Endpoint called: ${endpoint}`);
      }
    },
    
    success: (endpoint: string, message: string, details?: any) => {
      pinoLogger.api.info({ endpoint, ...details }, message);
    },
    
    error: (endpoint: string, message: string, error?: Error) => {
      apiLogger.error(error || new Error(message), { endpoint });
    },
    
    step: (endpoint: string, step: string, details?: any) => {
      apiLogger.step(step, { endpoint, ...details });
    },
    
    warn: (endpoint: string, message: string, details?: any) => {
      pinoLogger.api.warn({ endpoint, ...details }, message);
    }
  },

  /**
   * Database operation logging
   */
  db: {
    operation: (operation: string, details?: any) => {
      logIfEnabled(pinoLogger.db, 'debug', operation, details);
    },
    
    found: (resource: string, count: number, context?: LogContext) => {
      logIfEnabled(pinoLogger.db, 'debug', `Found ${count} ${resource}`, context);
    },
    
    missing: (resource: string, context?: LogContext) => {
      logIfEnabled(pinoLogger.db, 'debug', `${resource} not found`, context);
    },
    
    error: (message: string, error?: Error) => {
      dbLogger.error(error || new Error(message));
    }
  },

  /**
   * Storage operation logging  
   */
  storage: {
    operation: (operation: string, details?: any) => {
      pinoLogger.documents.debug({ operation, ...details }, operation);
    },
    
    initialized: (provider: string, path?: string) => {
      pinoLogger.documents.info({ provider, path }, `Initialized ${provider} provider`);
    },

    success: (message: string, details?: any) => {
      pinoLogger.documents.info(details || {}, message);
    },
    
    error: (message: string, error?: Error) => {
      pinoLogger.documents.error({ err: error }, message);
    }
  },

  /**
   * OpenAI operation logging
   */
  openai: {
    start: (operation: string) => {
      chatLogger.request(operation);
    },
    
    request: (details?: any) => {
      chatLogger.request(details?.model || 'unknown', details?.promptTokens);
    },
    
    response: (content: string) => {
      // Only log content if chat details are enabled
      chatLogger.content(content);
    },
    
    success: (message: string) => {
      logIfEnabled(pinoLogger.chat, 'info', message);
    },
    
    error: (message: string, error?: Error) => {
      chatLogger.error(error || new Error(message));
    }
  },

  /**
   * Text extraction logging
   */
  extraction: {
    start: (documentId: number, filename: string) => {
      pinoLogger.documents.info({ documentId, filename }, 'Starting text extraction');
    },
    
    progress: (step: string, details?: any) => {
      pinoLogger.documents.debug({ step, ...details }, step);
    },
    
    success: (documentId: number, length: number) => {
      pinoLogger.documents.info({ documentId, length }, `Extracted ${length} characters`);
    },
    
    error: (documentId: number, error: Error) => {
      pinoLogger.documents.error({ documentId, err: error }, 'Text extraction failed');
    }
  },

  /**
   * Queue processing logging
   */
  queue: {
    operation: (operation: string, details?: any) => {
      pinoLogger.queue.info({ operation, ...details }, operation);
    },
    
    task: (action: string, taskId: number, details?: any) => {
      pinoLogger.queue.info({ action, taskId, ...details }, `${action} task ${taskId}`);
    }
  },

  /**
   * Generic logging utilities
   */
  info: (message: string, context?: LogContext) => {
    pinoLogger.base.info(context || {}, message);
  },
  
  warn: (message: string, context?: LogContext) => {
    pinoLogger.base.warn(context || {}, message);
  },
  
  error: (message: string, error?: Error, context?: LogContext) => {
    pinoLogger.base.error({ err: error, ...context }, message);
  },
  
  debug: (message: string, data?: any) => {
    pinoLogger.base.debug(data || {}, message);
  }
};

/**
 * Frontend logging utilities for consistent client-side logging
 * Note: These still use console methods as Pino is server-side only
 */
export const ClientLogger = {
  error: (context: string, message: string, error?: any) => {
    if (typeof window !== 'undefined') {
      console.error(`[${context}] ${message}`, error);
    }
  },
  
  warn: (context: string, message: string, data?: any) => {
    if (typeof window !== 'undefined') {
      console.warn(`[${context}] ${message}`, data);
    }
  },
  
  info: (context: string, message: string, data?: any) => {
    if (typeof window !== 'undefined' && EnvironmentHelpers.isDevelopment()) {
      console.info(`[${context}] ${message}`, data);
    }
  },
  
  debug: (context: string, message: string, data?: any) => {
    if (typeof window !== 'undefined' && EnvironmentHelpers.isDevelopment()) {
      console.debug(`[${context}] ${message}`, data);
    }
  },
  
  apiError: (operation: string, error: any) => {
    if (typeof window !== 'undefined') {
      console.error(`[API] ${operation} failed:`, error);
    }
  },
  
  userAction: (action: string, data?: any) => {
    if (typeof window !== 'undefined' && EnvironmentHelpers.isDevelopment()) {
      console.info(`[USER] ${action}`, data);
    }
  }
};