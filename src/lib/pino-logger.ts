import pino from 'pino';

// Determine if we're in production
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

// Get log level from environment or default based on NODE_ENV
const LOG_LEVEL = process.env.LOG_LEVEL || (isProduction ? 'warn' : 'info');

// Feature flags for verbose logging
const LOG_DB_QUERIES = process.env.LOG_DB_QUERIES === 'true';
const LOG_CHAT_DETAILS = process.env.LOG_CHAT_DETAILS === 'true';
const LOG_API_STEPS = process.env.LOG_API_STEPS === 'true';
const LOG_STARTUP = process.env.LOG_STARTUP === 'true' || isDevelopment;

// Create base logger configuration
const baseLogger = pino({
  level: LOG_LEVEL,
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
  redact: {
    paths: [
      'password',
      'token',
      'apiKey',
      'secret',
      'authorization',
      'cookie',
      'api_key',
      'access_token',
      'refresh_token',
      'DATABASE_URL',
      'AWS_SECRET_ACCESS_KEY',
      'AZURE_AD_CLIENT_SECRET',
      'NEXTAUTH_SECRET',
      'OPENAI_API_KEY',
    ],
    censor: '[REDACTED]',
  },
  ...(isDevelopment && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
        messageFormat: '{msg}',
        errorLikeObjectKeys: ['err', 'error'],
      },
    },
  }),
});

// Create module-specific child loggers
export const logger = {
  // Base logger for general use
  base: baseLogger,

  // API request/response logging
  api: baseLogger.child({ 
    module: 'api',
    enabled: true 
  }),

  // Database operations (conditional)
  db: baseLogger.child({ 
    module: 'db',
    enabled: LOG_DB_QUERIES 
  }),

  // Chat/OpenAI operations (conditional)
  chat: baseLogger.child({ 
    module: 'chat',
    enabled: LOG_CHAT_DETAILS 
  }),

  // Queue processing
  queue: baseLogger.child({ 
    module: 'queue',
    enabled: true 
  }),

  // Document processing
  documents: baseLogger.child({ 
    module: 'documents',
    enabled: true 
  }),

  // Authentication
  auth: baseLogger.child({ 
    module: 'auth',
    enabled: true 
  }),

  // Startup logging (conditional)
  startup: baseLogger.child({ 
    module: 'startup',
    enabled: LOG_STARTUP 
  }),
};

// Helper functions for conditional logging
export const logIfEnabled = (loggerInstance: pino.Logger, level: string, msg: string, obj?: any) => {
  const moduleConfig = loggerInstance.bindings();
  if (moduleConfig.enabled === false) return;
  
  if (obj) {
    (loggerInstance as any)[level](obj, msg);
  } else {
    (loggerInstance as any)[level](msg);
  }
};

// Log sampling function for high-volume debug logs
export const sampleLog = (loggerInstance: pino.Logger, sampleRate: number = 0.1) => {
  if (Math.random() <= sampleRate) {
    return loggerInstance;
  }
  // Return a no-op logger
  return {
    trace: () => {},
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
    fatal: () => {},
    child: () => sampleLog(loggerInstance, sampleRate),
  } as unknown as pino.Logger;
};

// API-specific logging helpers
export const apiLogger = {
  start: (method: string, path: string, requestId?: string) => {
    if (!LOG_API_STEPS && logger.api.level !== 'debug') {
      // Only log start/end in production, not steps
      logger.api.info({ method, path, requestId }, `→ ${method} ${path}`);
    }
  },

  step: (step: string, metadata?: any) => {
    if (LOG_API_STEPS || logger.api.level === 'debug') {
      logger.api.debug({ step, ...metadata }, step);
    }
  },

  end: (method: string, path: string, status: number, duration: number, requestId?: string) => {
    logger.api.info(
      { method, path, status, duration, requestId },
      `← ${method} ${path} ${status} ${duration}ms`
    );
  },

  error: (error: Error, context?: any) => {
    logger.api.error({ err: error, ...context }, error.message);
  },
};

// Database logging helpers
export const dbLogger = {
  query: (query: string, duration?: number, rows?: number) => {
    logIfEnabled(logger.db, 'debug', 'Query executed', { query, duration, rows });
  },

  error: (error: Error, query?: string) => {
    // Always log database errors regardless of LOG_DB_QUERIES
    logger.db.error({ err: error, query }, 'Database error');
  },

  connection: (status: string, details?: any) => {
    logIfEnabled(logger.db, 'info', `Database connection ${status}`, details);
  },
};

// Chat/OpenAI logging helpers
export const chatLogger = {
  request: (model: string, promptTokens?: number) => {
    logIfEnabled(logger.chat, 'debug', 'OpenAI request', { model, promptTokens });
  },

  response: (model: string, completionTokens?: number, totalTokens?: number) => {
    logIfEnabled(logger.chat, 'debug', 'OpenAI response', { 
      model, 
      completionTokens, 
      totalTokens 
    });
  },

  content: (content: string) => {
    if (LOG_CHAT_DETAILS) {
      // Only log first 200 chars of content to avoid massive logs
      const preview = content.length > 200 ? content.substring(0, 200) + '...' : content;
      logger.chat.debug({ preview }, 'Chat content');
    }
  },

  error: (error: Error, context?: any) => {
    logger.chat.error({ err: error, ...context }, 'Chat API error');
  },
};

// Export configuration for runtime access
export const logConfig = {
  level: LOG_LEVEL,
  features: {
    dbQueries: LOG_DB_QUERIES,
    chatDetails: LOG_CHAT_DETAILS,
    apiSteps: LOG_API_STEPS,
    startup: LOG_STARTUP,
  },
};

// Function to update log level at runtime
export const setLogLevel = (level: string) => {
  baseLogger.level = level;
  Object.values(logger).forEach((childLogger) => {
    if (childLogger && typeof childLogger.level === 'string') {
      childLogger.level = level;
    }
  });
};

export default logger;