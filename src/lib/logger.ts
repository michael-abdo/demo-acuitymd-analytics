// Graceful fallback logger when winston is not available
let winston: any = null
let logger: any = null

try {
  winston = require('winston')
  const path = require('path')

  // Define log levels
  const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
  }

  // Define log colors
  const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white',
  }

  // Tell winston about our colors
  winston.addColors(colors)

  // Define log format
  const format = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  )

  // Define which transports to use
  const transports = []

  // Always use console transport
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
        winston.format.printf(
          (info: any) => `${info.timestamp} ${info.level}: ${info.message}`
        )
      ),
    })
  )

  // In production, also write to files
  if (process.env.NODE_ENV === 'production') {
    // Error logs
    transports.push(
      new winston.transports.File({
        filename: path.join(process.cwd(), 'logs', 'error.log'),
        level: 'error',
        maxsize: 10485760, // 10MB
        maxFiles: 5,
      })
    )
    // Combined logs
    transports.push(
      new winston.transports.File({
        filename: path.join(process.cwd(), 'logs', 'combined.log'),
        maxsize: 10485760, // 10MB
        maxFiles: 5,
      })
    )
  }

  // Create the winston logger
  logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    levels,
    format,
    transports,
  })
} catch (error) {
  // Winston not available, use console fallback
  console.warn('Winston not available, using console fallback logging')
  
  logger = {
    error: (message: string, meta?: any) => {
      console.error(`[ERROR] ${new Date().toISOString()} ${message}`, meta ? JSON.stringify(meta) : '')
    },
    warn: (message: string, meta?: any) => {
      console.warn(`[WARN] ${new Date().toISOString()} ${message}`, meta ? JSON.stringify(meta) : '')
    },
    info: (message: string, meta?: any) => {
      console.log(`[INFO] ${new Date().toISOString()} ${message}`, meta ? JSON.stringify(meta) : '')
    },
    http: (message: string, meta?: any) => {
      console.log(`[HTTP] ${new Date().toISOString()} ${message}`, meta ? JSON.stringify(meta) : '')
    },
    debug: (message: string, meta?: any) => {
      if (process.env.LOG_LEVEL === 'debug') {
        console.log(`[DEBUG] ${new Date().toISOString()} ${message}`, meta ? JSON.stringify(meta) : '')
      }
    }
  }
}

// Log startup information
export function logStartup() {
  logger.info('===========================================')
  logger.info('Application Starting')
  logger.info('===========================================')
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`)
  logger.info(`Node Version: ${process.version}`)
  logger.info(`Next.js URL: ${process.env.NEXTAUTH_URL || 'http://localhost:3000'}`)
  logger.info(`Base Path: ${process.env.BASE_PATH || '(root)'}`)
  logger.info(`Process ID: ${process.pid}`)
  logger.info(`Platform: ${process.platform}`)
  logger.info(`Working Directory: ${process.cwd()}`)
  
  // Log authentication configuration
  logger.info('Authentication Configuration:')
  logger.info(`- Azure AD Tenant: ${process.env.AZURE_AD_TENANT_ID ? '✓ Configured' : '✗ Not configured'}`)
  logger.info(`- Azure AD Client: ${process.env.AZURE_AD_CLIENT_ID ? '✓ Configured' : '✗ Not configured'}`)
  logger.info(`- NextAuth Secret: ${process.env.NEXTAUTH_SECRET ? '✓ Configured' : '✗ Not configured'}`)
  
  // Log database configuration
  logger.info('Database Configuration:')
  logger.info(`- Database URL: ${process.env.DATABASE_URL ? '✓ Configured' : '✗ Not configured'}`)
  
  // Log feature flags
  logger.info('Feature Configuration:')
  logger.info(`- File Processing: Enabled`)
  logger.info(`- Document Comparison: Enabled`)
  logger.info(`- OCR Support: ${process.env.ENABLE_OCR === 'true' ? 'Enabled' : 'Disabled'}`)
  
  // Log environment variables (non-sensitive ones)
  logger.info('Environment Variables:')
  const envVars = [
    'NODE_ENV', 'PORT', 'LOG_LEVEL', 'BASE_PATH', 'NEXTAUTH_URL',
    'MYSQL_HOST', 'MYSQL_PORT', 'MYSQL_DATABASE', 'MYSQL_USER',
    'STORAGE_PROVIDER', 'AWS_REGION', 'S3_BUCKET_NAME',
    'ENABLE_OCR', 'RATE_LIMIT_REQUESTS', 'RATE_LIMIT_WINDOW'
  ]
  
  envVars.forEach(envVar => {
    const value = process.env[envVar]
    if (value !== undefined) {
      // Mask potentially sensitive values
      let displayValue = value
      if (envVar.includes('SECRET') || envVar.includes('PASSWORD') || envVar.includes('KEY')) {
        displayValue = '***MASKED***'
      } else if (envVar.includes('URL') && value.includes('://')) {
        // Mask credentials in URLs
        displayValue = value.replace(/\/\/[^@]*@/, '//***:***@')
      }
      logger.info(`- ${envVar}: ${displayValue}`)
    } else {
      logger.info(`- ${envVar}: (not set)`)
    }
  })
  
  // Log memory usage
  const memUsage = process.memoryUsage()
  logger.info('Memory Usage:')
  logger.info(`- RSS: ${Math.round(memUsage.rss / 1024 / 1024 * 100) / 100} MB`)
  logger.info(`- Heap Used: ${Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100} MB`)
  logger.info(`- Heap Total: ${Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100} MB`)
  logger.info(`- External: ${Math.round(memUsage.external / 1024 / 1024 * 100) / 100} MB`)
  
  logger.info('===========================================')
}

// Helper functions for different log types
export function logRequest(method: string, url: string, statusCode: number, duration: number) {
  logger.http(`${method} ${url} ${statusCode} ${duration}ms`)
}

export function logAuthentication(event: string, userId?: string, details?: any) {
  logger.info(`Auth: ${event}`, { userId, ...details })
}

export function logDatabase(operation: string, table: string, duration: number, details?: any) {
  logger.debug(`DB: ${operation} ${table} ${duration}ms`, details)
}

export function logFileOperation(operation: string, filename: string, size?: number, details?: any) {
  logger.info(`File: ${operation} ${filename}`, { size, ...details })
}

export function logError(error: Error, context?: any) {
  logger.error(error.message, { 
    stack: error.stack,
    name: error.name,
    ...context 
  })
}

export function logPerformance(operation: string, duration: number, details?: any) {
  logger.debug(`Performance: ${operation} took ${duration}ms`, details)
}

export default logger