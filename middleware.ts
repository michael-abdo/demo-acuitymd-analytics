import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { config as appConfig, EnvironmentHelpers } from "@/lib/config";

export default withAuth(
  function middleware(req) {
    // Check for dev bypass header in development
    if (EnvironmentHelpers.isDevelopment() &&
        req.headers.get("X-Dev-Bypass") === "true") {
      return NextResponse.next();
    }

    // Additional custom middleware logic could be added here if needed
    return NextResponse.next();
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
    // Protect dashboard routes
    "/dashboard/:path*",
    // Protect specific pages
    "/upload",
    "/documents", 
    "/compare",
    // Protect API routes except public ones
    "/api/upload",
    "/api/documents/:path*",
    "/api/compare/:path*",
    "/api/dashboard/:path*",
    "/api/migrate-db",
    "/api/protected-example",
    "/api/storage-health",
    "/api/db-health",
    "/api/validate-url"
  ],
};
