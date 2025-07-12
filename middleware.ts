import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { config as appConfig } from "@/lib/config";

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
      signIn: appConfig.template.paths.pages.signIn,
    },
  }
);

// Update the matcher to protect routes both with and without basePath
export const config = {
  matcher: [
    // Protect dashboard routes (both with and without basePath)
    "/dashboard/:path*",
    "/${PROJECT_NAME}/dashboard/:path*",
    // Protect specific pages
    "/upload",
    "/documents", 
    "/compare",
    "/${PROJECT_NAME}/upload",
    "/${PROJECT_NAME}/documents",
    "/${PROJECT_NAME}/compare",
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
    "/${PROJECT_NAME}/api/upload",
    "/${PROJECT_NAME}/api/documents/:path*",
    "/${PROJECT_NAME}/api/compare/:path*",
    "/${PROJECT_NAME}/api/dashboard/:path*",
    "/${PROJECT_NAME}/api/migrate-db",
    "/${PROJECT_NAME}/api/protected-example",
    "/${PROJECT_NAME}/api/storage-health",
    "/${PROJECT_NAME}/api/db-health",
    "/${PROJECT_NAME}/api/validate-url"
  ],
};
