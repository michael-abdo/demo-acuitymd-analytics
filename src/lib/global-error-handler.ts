import { logError } from './logger'
import { ErrorLogger } from './error-logger'

// Global error handler for unhandled rejections and uncaught exceptions
export function setupGlobalErrorHandlers() {
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    const error = reason instanceof Error ? reason : new Error(String(reason))
    
    logError(error, {
      type: 'unhandledRejection',
      promise: String(promise),
      timestamp: new Date().toISOString()
    })
    
    ErrorLogger.log(error, {
      type: 'unhandledRejection',
      metadata: {
        promise: String(promise)
      }
    })
  })

  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    logError(error, {
      type: 'uncaughtException',
      timestamp: new Date().toISOString(),
      fatal: true
    })
    
    ErrorLogger.log(error, {
      type: 'uncaughtException',
      metadata: {
        fatal: true
      }
    })
    
    // Give logger time to write before exiting
    setTimeout(() => {
      process.exit(1)
    }, 1000)
  })

  // Handle SIGTERM and SIGINT
  const signals = ['SIGTERM', 'SIGINT'] as const
  signals.forEach(signal => {
    process.on(signal, () => {
      console.log(`Received ${signal}, shutting down gracefully...`)
      
      logError(new Error(`Process terminated by ${signal}`), {
        type: 'signal',
        signal,
        timestamp: new Date().toISOString()
      })
      
      // Perform cleanup here if needed
      setTimeout(() => {
        process.exit(0)
      }, 1000)
    })
  })
}

// Error boundary component for React
export function createErrorBoundary() {
  return {
    getDerivedStateFromError(error: Error) {
      logError(error, {
        type: 'react-error-boundary',
        timestamp: new Date().toISOString()
      })
      
      return { hasError: true, error }
    },
    
    componentDidCatch(error: Error, errorInfo: any) {
      logError(error, {
        type: 'react-error-boundary',
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString()
      })
      
      ErrorLogger.log(error, {
        type: 'react-error-boundary',
        metadata: {
          componentStack: errorInfo.componentStack
        }
      })
    }
  }
}