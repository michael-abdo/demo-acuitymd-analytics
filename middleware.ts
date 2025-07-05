import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // Additional custom middleware logic could be added here if needed
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/sign-in",
    },
  }
);

// Update the matcher to only protect specific routes
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/(api/(?!auth|test-db|migrate-db|test-crud|debug-db|seed-dev|process-queue|test-extraction|test-upload|test-compare).*)", 
    // Exclude authentication-related routes from protection
    "/((?!api/auth|api/test-db|api/migrate-db|api/test-crud|api/debug-db|api/seed-dev|api/process-queue|api/test-extraction|api/test-upload|api/test-compare|_next/static|_next/image|favicon.ico|sign-in|auth).*)"
  ],
}; 