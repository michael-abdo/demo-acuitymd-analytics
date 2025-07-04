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
    "/(api/(?!auth|test-db|migrate-db|test-crud).*)", 
    // Exclude authentication-related routes from protection
    "/((?!api/auth|api/test-db|api/migrate-db|api/test-crud|_next/static|_next/image|favicon.ico|sign-in|auth).*)"
  ],
}; 