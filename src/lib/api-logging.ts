import { NextRequest, NextResponse } from 'next/server'
import { logError } from './logger'
import { apiLogger } from './pino-logger'

type ApiHandler = (req: NextRequest, context?: any) => Promise<NextResponse> | NextResponse

export function withLogging(handler: ApiHandler, operationName: string): ApiHandler {
  return async (req: NextRequest, context?: any) => {
    const start = Date.now()
    const requestId = crypto.randomUUID()
    
    try {
      // Log incoming API request
      const startUrl = new URL(req.url)
      apiLogger.start(req.method, startUrl.pathname, requestId)
      
      // Execute the handler
      const response = await handler(req, context)
      
      // Calculate duration
      const duration = Date.now() - start
      
      // Log the API response
      const endUrl = new URL(req.url)
      apiLogger.end(req.method, endUrl.pathname, response.status, duration, requestId)
      
      // Add request ID to response headers
      response.headers.set('X-Request-ID', requestId)
      response.headers.set('X-Response-Time', `${duration}ms`)
      
      return response
    } catch (error: any) {
      const duration = Date.now() - start
      
      // Log the error
      const errorUrl = new URL(req.url)
      apiLogger.error(error, {
        requestId,
        operation: operationName,
        method: req.method,
        path: errorUrl.pathname,
        duration
      })
      
      // Return error response
      return NextResponse.json(
        { 
          error: 'Internal server error',
          requestId,
          message: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        { 
          status: 500,
          headers: {
            'X-Request-ID': requestId,
            'X-Response-Time': `${duration}ms`
          }
        }
      )
    }
  }
}

// Helper for logging API route errors
export function logApiError(error: any, req: NextRequest, context?: any) {
  const url = new URL(req.url)
  logError(error, {
    method: req.method,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams),
    headers: Object.fromEntries(req.headers),
    context
  })
}