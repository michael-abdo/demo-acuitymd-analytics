import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { EnvironmentHelpers } from "@/lib/config";

export default withAuth(
  function middleware(req) {
    // Check for dev bypass header in development
    if (EnvironmentHelpers.isDevelopment() &&
        req.headers.get("X-Dev-Bypass") === "true") {
      return NextResponse.next();
    }

    // Add inline security headers for all requests
    const response = NextResponse.next();
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
    },
  }
);

// Protect routes - Next.js basePath automatically handles path prefixing
export const config = {
  matcher: [
    // Protect ALL routes except specific public ones (blacklist pattern)
    "/((?!api/auth|sign-in|sign-up|_next/static|_next/image|favicon.ico|public).*)",
  ],
};
