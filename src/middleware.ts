import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { EnvironmentHelpers } from "@/lib/config";
import { loggingMiddleware } from "../middleware/logging";

// Check if middleware should be disabled
const isDisabled = process.env.DISABLE_MIDDLEWARE === 'true';

// Export middleware - either pass-through or full auth middleware
export default isDisabled 
  ? function middleware() { 
      return NextResponse.next();
    }
  : withAuth(
      function middleware(req) {
        const response = loggingMiddleware(req, NextResponse.next());
        
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
    '/((?!api/auth|sign-in|sign-up|auth/error|auth/signout|_next/static|_next/image|favicon.ico|public).+)',
    // Also match root-level auth routes that NextAuth might use
    '/api/auth/:path*',
  ],
};
