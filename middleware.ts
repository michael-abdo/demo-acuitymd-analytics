import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // Check for dev bypass header in development
    if (process.env.NODE_ENV === 'development' && 
        req.headers.get('X-Dev-Bypass') === 'true') {
      return NextResponse.next();
    }
    
    // Additional custom middleware logic could be added here if needed
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow dev bypass in development
        if (process.env.NODE_ENV === 'development' && 
            req.headers.get('X-Dev-Bypass') === 'true') {
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

// Update the matcher to only protect specific routes
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/(api/(?!auth|process-queue|seed-dev).*)", 
    // Exclude authentication-related routes from protection
    "/((?!api/auth|api/process-queue|api/seed-dev|_next/static|_next/image|favicon.ico|sign-in|auth).*)"
  ],
}; 