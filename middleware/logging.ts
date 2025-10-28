import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

/**
 * Shared logging middleware that stamps a request id header and emits request logs.
 * Accepts an optional response so callers can chain additional middleware logic.
 */
export function loggingMiddleware(request: NextRequest, existingResponse?: NextResponse) {
  const start = Date.now()

  console.log(`→ ${request.method} ${request.nextUrl.pathname}`)

  const response = existingResponse ?? NextResponse.next()

  const requestId = crypto.randomUUID()
  response.headers.set('X-Request-ID', requestId)

  const duration = Date.now() - start
  console.log(`← ${request.method} ${request.nextUrl.pathname} ${response.status || 200} ${duration}ms (requestId=${requestId})`)

  return response
}
