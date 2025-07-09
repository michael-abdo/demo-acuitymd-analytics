import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // Check for dev bypass header in development
    if (process.env.NODE_ENV === "development" &&
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
        if (process.env.NODE_ENV === "development" &&
            req.headers.get("X-Dev-Bypass") === "true") {
          return true;
        }
        return !!token;
      },
    },
    pages: {
      signIn: "/nda-analyzer/sign-in",
    },
  }
);

// Update the matcher to protect routes both with and without basePath
export const config = {
  matcher: [
    // Protect dashboard routes (both with and without basePath)
    "/dashboard/:path*",
    "/nda-analyzer/dashboard/:path*",
    // Protect specific pages
    "/upload",
    "/documents", 
    "/compare",
    "/nda-analyzer/upload",
    "/nda-analyzer/documents",
    "/nda-analyzer/compare",
    // Protect API routes except public ones
    "/api/upload",
    "/api/documents/:path*",
    "/api/compare/:path*",
    "/api/dashboard/:path*",
    "/api/migrate-db",
    "/api/protected-example",
    "/api/storage-health",
    "/api/db-health",
    "/api/validate-url",
    "/nda-analyzer/api/upload",
    "/nda-analyzer/api/documents/:path*",
    "/nda-analyzer/api/compare/:path*",
    "/nda-analyzer/api/dashboard/:path*",
    "/nda-analyzer/api/migrate-db",
    "/nda-analyzer/api/protected-example",
    "/nda-analyzer/api/storage-health",
    "/nda-analyzer/api/db-health",
    "/nda-analyzer/api/validate-url"
  ],
};
