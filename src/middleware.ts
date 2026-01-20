import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { EnvironmentHelpers } from "@/lib/config";
import { loggingMiddleware } from "../middleware/logging";

// Check if middleware should be disabled
const isDisabled = process.env.DISABLE_MIDDLEWARE === 'true';

/**
 * Simple in-memory rate limiter for middleware
 * Note: For production edge deployments, use Redis or similar distributed store
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 100; // requests per window
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  // Cleanup old entries periodically (every 1000 checks)
  if (rateLimitMap.size > 10000) {
    for (const [key, val] of rateLimitMap.entries()) {
      if (now > val.resetTime) rateLimitMap.delete(key);
    }
  }

  // No entry or expired - create new window
  if (!entry || now > entry.resetTime) {
    const resetTime = now + RATE_LIMIT_WINDOW_MS;
    rateLimitMap.set(ip, { count: 1, resetTime });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1, resetTime };
  }

  // Check if over limit
  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0, resetTime: entry.resetTime };
  }

  // Increment and allow
  entry.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX - entry.count, resetTime: entry.resetTime };
}

/**
 * Check if test auth is allowed and header is valid
 * Used for development/CI testing without real sessions
 */
function isTestAuthValid(req: { headers: { get: (key: string) => string | null } }): boolean {
  // Only allow in non-production when explicitly enabled
  if (process.env.NODE_ENV === 'production') return false;
  if (process.env.ALLOW_TEST_AUTH !== 'true') return false;

  const testAuthHeader = req.headers.get('X-Test-Auth');
  if (!testAuthHeader) return false;

  const expectedSecret = process.env.TEST_AUTH_SECRET;
  return expectedSecret === testAuthHeader;
}

// Export middleware - either pass-through or full auth middleware
export default isDisabled
  ? function middleware() {
      return NextResponse.next();
    }
  : withAuth(
      function middleware(req) {
        // Global rate limiting by IP
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
          || req.headers.get('x-real-ip')
          || 'unknown';

        const rateLimit = checkRateLimit(ip);

        if (!rateLimit.allowed) {
          return new NextResponse(
            JSON.stringify({
              error: 'Too many requests',
              message: 'Rate limit exceeded. Please try again later.',
              retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
            }),
            {
              status: 429,
              headers: {
                'Content-Type': 'application/json',
                'X-RateLimit-Limit': RATE_LIMIT_MAX.toString(),
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': rateLimit.resetTime.toString(),
                'Retry-After': Math.ceil((rateLimit.resetTime - Date.now()) / 1000).toString(),
              }
            }
          );
        }

        const response = loggingMiddleware(req);

        // Add rate limit headers to response
        response.headers.set('X-RateLimit-Limit', RATE_LIMIT_MAX.toString());
        response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
        response.headers.set('X-RateLimit-Reset', rateLimit.resetTime.toString());

        // Check for dev bypass header in development
        if (EnvironmentHelpers.isDevelopment() &&
            req.headers.get("X-Dev-Bypass") === "true") {
          return response;
        }

        // Add inline security headers for all requests
        response.headers.set('X-Content-Type-Options', 'nosniff');
        response.headers.set('X-Frame-Options', 'DENY');
        response.headers.set('X-XSS-Protection', '1; mode=block');

        // Additional custom middleware logic could be added here if needed
        return response;
      },
      {
        callbacks: {
          authorized: ({ token, req }) => {
            // Allow dev bypass in development
            if (EnvironmentHelpers.isDevelopment() &&
                req.headers.get("X-Dev-Bypass") === "true") {
              return true;
            }
            // Allow test auth header for API testing (dev/CI)
            if (isTestAuthValid(req)) {
              return true;
            }
            return !!token;
          },
        },
        pages: {
          signIn: "/sign-in",
          error: "/auth/error",
        },
      }
    );

// Export config - protect ALL routes except specific public ones
// Note: Next.js requires static config at build time
// Protect all routes (root-level deployment)
export const config = {
  matcher: [
    '/',
    '/((?!api/auth|api/health|api/db-health|api/storage-health|sign-in|sign-up|auth/error|auth/signout|_next/static|_next/image|favicon.ico|public).+)',
    // Also match root-level auth routes that NextAuth might use
    '/api/auth/:path*',
  ],
};
