import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { EnvironmentHelpers } from "@/lib/config";

// Check if middleware should be disabled
const isDisabled = process.env.DISABLE_MIDDLEWARE === 'true';

// Export middleware - either pass-through or full auth middleware
export default isDisabled 
  ? function middleware() { 
      return NextResponse.next();
    }
  : withAuth(
      function middleware(req) {
        const start = Date.now();
        
        // Log incoming request
        console.log(`→ ${req.method} ${req.nextUrl.pathname}`);
        
        // Check for dev bypass header in development
        if (EnvironmentHelpers.isDevelopment() &&
            req.headers.get("X-Dev-Bypass") === "true") {
          const response = NextResponse.next();
          const duration = Date.now() - start;
          console.log(`← ${req.method} ${req.nextUrl.pathname} 200 ${duration}ms`);
          return response;
        }

        // Add inline security headers for all requests
        const response = NextResponse.next();
        response.headers.set('X-Content-Type-Options', 'nosniff');
        response.headers.set('X-Frame-Options', 'DENY');
        response.headers.set('X-XSS-Protection', '1; mode=block');
        
        // Add request ID for tracking
        const requestId = crypto.randomUUID();
        response.headers.set('X-Request-ID', requestId);
        
        // Log the request
        const duration = Date.now() - start;
        console.log(`← ${req.method} ${req.nextUrl.pathname} 200 ${duration}ms`);

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
        },
      }
    );

// Export config - protect ALL routes except specific public ones
// Note: Next.js requires static config, so we use a hardcoded matcher
export const config = {
  matcher: [
    // Protect ALL routes except specific public ones (blacklist pattern)
    "/((?!api/auth|sign-in|sign-up|_next/static|_next/image|favicon.ico|public).*)",
  ],
};
