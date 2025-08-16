// Import Pino logger
import { logger as pinoLogger, apiLogger, dbLogger, chatLogger } from './pino-logger'

// Use the base Pino logger for backward compatibility
const logger = pinoLogger.base

// Re-export for modules that import the logger directly
export { apiLogger, dbLogger, chatLogger }

// Log startup information
export function logStartup() {
  // Only log startup info if enabled
  if (!pinoLogger.startup.isLevelEnabled('info')) return;
  
  const startupLogger = pinoLogger.startup;
  
  startupLogger.info('===========================================');
  startupLogger.info('Application Starting');
  startupLogger.info('===========================================');
  startupLogger.info({ env: process.env.NODE_ENV || 'development' }, 'Environment');
  startupLogger.info({ version: process.version }, 'Node Version');
  startupLogger.info({ url: process.env.NEXTAUTH_URL || 'http://localhost:3000' }, 'Next.js URL');
  startupLogger.info({ basePath: process.env.BASE_PATH || '(root)' }, 'Base Path');
  startupLogger.info({ pid: process.pid, platform: process.platform }, 'Process Info');
  
  // Only log detailed config in debug mode
  if (startupLogger.isLevelEnabled('debug')) {
    // Log authentication configuration
    startupLogger.debug({
      azureAD: !!process.env.AZURE_AD_TENANT_ID,
      azureClient: !!process.env.AZURE_AD_CLIENT_ID,
      nextAuthSecret: !!process.env.NEXTAUTH_SECRET
    }, 'Authentication Configuration');
    
    // Log database configuration
    startupLogger.debug({
      databaseUrl: !!process.env.DATABASE_URL
    }, 'Database Configuration');
    
    // Log feature flags
    startupLogger.debug({
      fileProcessing: true,
      documentComparison: true,
      ocrSupport: process.env.ENABLE_OCR === 'true'
    }, 'Feature Configuration');
    
    // Log memory usage
    const memUsage = process.memoryUsage();
    startupLogger.debug({
      rss: Math.round(memUsage.rss / 1024 / 1024 * 100) / 100,
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100,
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100,
      external: Math.round(memUsage.external / 1024 / 1024 * 100) / 100
    }, 'Memory Usage (MB)');
  }
  
  startupLogger.info('===========================================')
}

// Helper functions for different log types
export function logRequest(method: string, url: string, statusCode: number, duration: number) {
  // Use apiLogger for better control
  apiLogger.end(method, url, statusCode, duration);
}

export function logAuthentication(event: string, userId?: string, details?: any) {
  pinoLogger.auth.info({ event, userId, ...details }, `Auth: ${event}`);
}

export function logDatabase(operation: string, table: string, duration: number, details?: any) {
  dbLogger.query(`${operation} ${table}`, duration, details?.rows);
}

export function logFileOperation(operation: string, filename: string, size?: number, details?: any) {
  pinoLogger.documents.info({ operation, filename, size, ...details }, `File: ${operation} ${filename}`);
}

export function logError(error: Error, context?: any) {
  logger.error({ 
    err: error,
    ...context 
  }, error.message);
}

export function logPerformance(operation: string, duration: number, details?: any) {
  logger.debug({ operation, duration, ...details }, `Performance: ${operation} took ${duration}ms`);
}

export default logger