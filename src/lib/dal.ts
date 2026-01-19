import { cache } from 'react';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth-options';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

/**
 * Single Data Access Layer for Authentication
 *
 * Industry Standard 2025: Single point of authentication truth
 * Eliminates multi-layer authentication vulnerabilities
 * Replaces client-side auth checks with server-side verification
 *
 * Supports test authentication for development/CI via X-Test-Auth header
 */

/**
 * Mock session for development environment
 * Used when DISABLE_AUTH=true in development
 */
const mockSession = {
  user: {
    id: 'dev-user-123',
    name: 'Development User',
    email: 'dev@example.com',
    image: null
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
};

/**
 * Check for test auth header (development/CI only)
 * Returns a mock session if valid test auth header is present
 */
async function checkTestAuth() {
  // Only allow in non-production when explicitly enabled
  if (process.env.NODE_ENV === 'production') return null;
  if (process.env.ALLOW_TEST_AUTH !== 'true') return null;

  try {
    const headersList = await headers();
    const testAuthHeader = headersList.get('X-Test-Auth');

    if (!testAuthHeader) return null;

    // Validate the secret
    const expectedSecret = process.env.TEST_AUTH_SECRET;
    if (!expectedSecret || testAuthHeader !== expectedSecret) {
      console.warn('⚠️ Invalid X-Test-Auth header received');
      return null;
    }

    // Check for custom test user email
    const testUserEmail = headersList.get('X-Test-User') || 'test@example.com';

    console.info(`🧪 Test auth active for: ${testUserEmail}`);

    return {
      user: {
        id: 'test-user-123',
        name: 'Test User',
        email: testUserEmail,
        image: null
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };
  } catch {
    // headers() might throw in some contexts
    return null;
  }
}

/**
 * Cached server-side authentication verification
 * 
 * This is the SINGLE source of authentication truth for the application.
 * Replaces all client-side and multi-layer authentication patterns.
 * 
 * Features:
 * - ✅ Server-side only (no client-side bypasses)
 * - ✅ Cached for performance (React cache)
 * - ✅ Development bypass for testing
 * - ✅ Automatic redirect to sign-in
 * - ✅ Single point of truth
 * 
 * @returns Verified session object
 * @throws Redirects to /sign-in if not authenticated
 */
export const verifySession = cache(async () => {
  // Check for test auth first (dev/CI only)
  const testSession = await checkTestAuth();
  if (testSession) {
    return testSession;
  }

  const session = await getServerSession(authOptions);

  if (!session) {
    // Development bypass - only in development with explicit flag
    if (process.env.NODE_ENV === 'development' &&
        process.env.DISABLE_AUTH === 'true') {
      return mockSession;
    }

    // Production: redirect to sign-in
    redirect('/sign-in');
  }

  return session;
});

/**
 * Optional session check without redirect
 * Use when you need to check auth status without forcing authentication
 * 
 * @returns Session object or null if not authenticated
 */
export const getOptionalSession = cache(async () => {
  // Check for test auth first (dev/CI only)
  const testSession = await checkTestAuth();
  if (testSession) {
    return testSession;
  }

  const session = await getServerSession(authOptions);

  // Development bypass
  if (!session &&
      process.env.NODE_ENV === 'development' &&
      process.env.DISABLE_AUTH === 'true') {
    return mockSession;
  }

  return session;
});

/**
 * Get user email from verified session
 * Convenience method for common use case
 * 
 * @returns User email string
 * @throws Redirects to /sign-in if not authenticated
 */
export const getUserEmail = cache(async () => {
  const session = await verifySession();
  return session.user?.email || '';
});

/**
 * Check if user is authenticated without redirecting
 * 
 * @returns Boolean indicating authentication status
 */
export const isAuthenticated = cache(async () => {
  const session = await getOptionalSession();
  return !!session;
});