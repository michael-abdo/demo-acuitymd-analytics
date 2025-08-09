import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { logRequest } from '@/lib/logger'

export function loggingMiddleware(request: NextRequest) {
  const start = Date.now()
  
  // Log incoming request
  console.log(`→ ${request.method} ${request.nextUrl.pathname}`)
  
  // Create a response handler
  const response = NextResponse.next()
  
  // Log response time when available
  const duration = Date.now() - start
  
  // Add request ID header for tracking
  const requestId = crypto.randomUUID()
  response.headers.set('X-Request-ID', requestId)
  
  // Log the request details
  logRequest(
    request.method,
    request.nextUrl.pathname,
    response.status || 200,
    duration
  )
  
  return response
}