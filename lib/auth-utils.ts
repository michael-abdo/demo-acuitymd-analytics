import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth-options";
import { redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side authentication check for server components.
 * Redirects to the sign-in page if the user is not authenticated.
 */
export async function requireAuth() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect("/sign-in");
  }
  
  return session;
}

/**
 * Server-side authentication check that returns the session if authenticated
 * or null if not. Does not redirect.
 */
export async function getAuthSession() {
  return await getServerSession(authOptions);
}

/**
 * Checks if a user has the required permissions.
 * Can be extended with role-based access control.
 */
export async function checkPermission(requiredPermission: string) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return false;
  }
  
  // This is a placeholder for more complex permission checks
  // You would typically check against user roles or permissions stored in the session or a database
  return true;
}

/**
 * Higher-order function that wraps API route handlers with authentication.
 * Returns 401 if user is not authenticated, otherwise calls the handler with the user email.
 * Use this for routes WITHOUT dynamic segments.
 */
export function withAuth(
  handler: (request: NextRequest, userEmail: string) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return handler(request, session.user.email);
  };
}

/**
 * Higher-order function that wraps API route handlers with authentication for dynamic routes.
 * Returns 401 if user is not authenticated, otherwise calls the handler with the user email.
 * Use this for routes WITH dynamic segments like [id].
 */
export function withAuthDynamic<T extends Record<string, any>>(
  handler: (request: NextRequest, userEmail: string, context: { params: T }) => Promise<NextResponse>
) {
  return async (request: NextRequest, context: { params: T }) => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return handler(request, session.user.email, context);
  };
} 