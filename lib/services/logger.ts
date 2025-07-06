/**
 * Centralized Logging Service
 * 
 * Consolidates all logging patterns used across API routes to follow DRY principle.
 * Replaces scattered console.log statements with standardized, categorized logging.
 */

interface LogContext {
  userEmail?: string;
  documentId?: number;
  endpoint?: string;
  [key: string]: any;
}

export const Logger = {
  /**
   * API endpoint operation logging
   */
  api: {
    start: (endpoint: string, userEmail: string, details?: any) => {
      console.log(`🔍 [${endpoint.toUpperCase()}] Endpoint called`);
      console.log(`🔍 [${endpoint.toUpperCase()}] User: ${userEmail}`);
      if (details) {
        Object.entries(details).forEach(([key, value]) => {
          console.log(`🔍 [${endpoint.toUpperCase()}] ${key}:`, value);
        });
      }
    },
    
    success: (endpoint: string, message: string, details?: any) => {
      console.log(`✅ [${endpoint.toUpperCase()}] ${message}`);
      if (details) {
        console.log(`✅ [${endpoint.toUpperCase()}] Details:`, details);
      }
    },
    
    error: (endpoint: string, message: string, error?: Error) => {
      console.log(`❌ [${endpoint.toUpperCase()}] ${message}`);
      if (error) {
        console.error(`❌ [${endpoint.toUpperCase()}] Error:`, error.message);
      }
    },
    
    step: (endpoint: string, step: string, details?: any) => {
      console.log(`🔍 [${endpoint.toUpperCase()}] ${step}`);
      if (details) {
        console.log(`🔍 [${endpoint.toUpperCase()}] ${step} details:`, details);
      }
    },
    
    warn: (endpoint: string, message: string, details?: any) => {
      console.warn(`⚠️  [${endpoint.toUpperCase()}] ${message}`);
      if (details) {
        console.warn(`⚠️  [${endpoint.toUpperCase()}] Details:`, details);
      }
    }
  },

  /**
   * Database operation logging
   */
  db: {
    operation: (operation: string, details?: any) => {
      console.log(`🗄️ [DB] ${operation}`);
      if (details) {
        console.log(`🗄️ [DB] Details:`, details);
      }
    },
    
    found: (resource: string, count: number, context?: LogContext) => {
      const userInfo = context?.userEmail ? ` for ${context.userEmail}` : '';
      console.log(`🔍 [DB] Found ${count} ${resource}${userInfo}`);
    },
    
    missing: (resource: string, context?: LogContext) => {
      const userInfo = context?.userEmail ? ` for ${context.userEmail}` : '';
      console.log(`❌ [DB] ${resource} not found${userInfo}`);
    },
    
    error: (message: string, error?: Error) => {
      console.error(`❌ [DB] ${message}`);
      if (error) {
        console.error(`❌ [DB] Error:`, error.message);
      }
    }
  },

  /**
   * Storage operation logging  
   */
  storage: {
    operation: (operation: string, details?: any) => {
      console.log(`📁 [STORAGE] ${operation}`);
      if (details) {
        console.log(`📁 [STORAGE] Details:`, details);
      }
    },
    
    initialized: (provider: string, path?: string) => {
      console.log(`📁 [STORAGE] Initialized ${provider} provider`);
      if (path) {
        console.log(`📁 [STORAGE] Path: ${path}`);
      }
    },

    success: (message: string, details?: any) => {
      console.log(`✅ [STORAGE] ${message}`);
      if (details) {
        console.log(`📁 [STORAGE] Details:`, details);
      }
    },
    
    error: (message: string, error?: Error) => {
      console.error(`❌ [STORAGE] ${message}`);
      if (error) {
        console.error(`❌ [STORAGE] Error:`, error.message);
      }
    }
  },

  /**
   * OpenAI operation logging
   */
  openai: {
    start: (operation: string) => {
      console.log(`🤖 [OPENAI] ${operation}`);
    },
    
    request: (details?: any) => {
      console.log(`🤖 [OPENAI] Sending request to OpenAI...`);
      if (details) {
        console.log(`🤖 [OPENAI] Request details:`, details);
      }
    },
    
    response: (content: string) => {
      console.log(`🤖 [OPENAI] Raw response content:`);
      console.log('---START RAW RESPONSE---');
      console.log(content);
      console.log('---END RAW RESPONSE---');
    },
    
    success: (message: string) => {
      console.log(`✅ [OPENAI] ${message}`);
    },
    
    error: (message: string, error?: Error) => {
      console.log(`❌ [OPENAI] ${message}`);
      if (error) {
        console.error(`❌ [OPENAI] Error:`, error.message);
      }
    }
  },

  /**
   * Text extraction logging
   */
  extraction: {
    start: (documentId: number, filename: string) => {
      console.log(`[Extraction] Starting text extraction for document ${documentId}`);
      console.log(`[Extraction] Processing: ${filename}`);
    },
    
    progress: (step: string, details?: any) => {
      console.log(`[Extraction] ${step}`);
      if (details) {
        console.log(`[Extraction] Details:`, details);
      }
    },
    
    success: (documentId: number, length: number) => {
      console.log(`[Extraction] Extracted ${length} characters`);
      console.log(`[Extraction] ✅ Completed for document ${documentId}`);
    },
    
    error: (documentId: number, error: Error) => {
      console.log(`[Extraction] ❌ Failed: ${error.message}`);
      console.error(`[Extraction] Error for document ${documentId}:`, error);
    }
  },

  /**
   * Queue processing logging
   */
  queue: {
    operation: (operation: string, details?: any) => {
      console.log(`[Queue] ${operation}`);
      if (details) {
        console.log(`[Queue] Details:`, details);
      }
    },
    
    task: (action: string, taskId: number, details?: any) => {
      console.log(`[Queue] ${action} task ${taskId}`);
      if (details) {
        console.log(`[Queue] Task details:`, details);
      }
    }
  },

  /**
   * Generic logging utilities
   */
  info: (message: string, context?: LogContext) => {
    console.log(`ℹ️ ${message}`);
    if (context) {
      console.log(`ℹ️ Context:`, context);
    }
  },
  
  warn: (message: string, context?: LogContext) => {
    console.warn(`⚠️ ${message}`);
    if (context) {
      console.warn(`⚠️ Context:`, context);
    }
  },
  
  error: (message: string, error?: Error, context?: LogContext) => {
    console.error(`❌ ${message}`);
    if (error) {
      console.error(`❌ Error:`, error.message);
      if (process.env.NODE_ENV === 'development') {
        console.error(`❌ Stack:`, error.stack);
      }
    }
    if (context) {
      console.error(`❌ Context:`, context);
    }
  },
  
  debug: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🐛 [DEBUG] ${message}`);
      if (data) {
        console.log(`🐛 [DEBUG] Data:`, data);
      }
    }
  }
};