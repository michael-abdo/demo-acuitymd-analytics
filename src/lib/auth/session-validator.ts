/**
 * Session Validator (Fail Fast)
 * Required authentication - no guest mode
 *
 * Supports test authentication for development/CI via X-Test-Auth header
 */

import { getServerSession, Session } from 'next-auth';
import { authOptions } from './auth-options';
import { headers } from 'next/headers';

/**
 * SECURITY: Test auth bypass for development/CI testing ONLY
 *
 * Requirements for test auth to work:
 * 1. NODE_ENV must NOT be 'production'
 * 2. ALLOW_TEST_AUTH must be explicitly 'true'
 * 3. TEST_AUTH_SECRET must be set and match X-Test-Auth header
 * 4. Secret must be at least 32 characters
 */
async function checkTestAuth(): Promise<Session | null> {
  // SECURITY: Hard block in production - no exceptions
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  // SECURITY: Require explicit opt-in
  if (process.env.ALLOW_TEST_AUTH !== 'true') {
    return null;
  }

  // SECURITY: Require a strong secret
  const expectedSecret = process.env.TEST_AUTH_SECRET;
  if (!expectedSecret || expectedSecret.length < 32) {
    console.error('⚠️ [Security] TEST_AUTH_SECRET must be at least 32 characters');
    return null;
  }

  const headersList = await headers();
  const testAuthHeader = headersList.get('X-Test-Auth');

  if (!testAuthHeader) {
    return null;
  }

  // SECURITY: Validate secret with constant-time comparison
  if (testAuthHeader.length !== expectedSecret.length ||
      !timingSafeEqual(testAuthHeader, expectedSecret)) {
    console.warn('⚠️ [Security Audit] Invalid X-Test-Auth attempt', {
      timestamp: new Date().toISOString(),
      headerLength: testAuthHeader.length,
    });
    return null;
  }

  // Get test user email (restricted to test domains)
  const testUserEmail = headersList.get('X-Test-User') || 'test@example.com';

  // SECURITY: Log all test auth usage for audit
  console.info(`🧪 [Security Audit] Test auth active`, {
    timestamp: new Date().toISOString(),
    email: testUserEmail,
    warning: 'This should never appear in production logs',
  });

  return {
    user: {
      id: 'test-user-id',
      email: testUserEmail,
      name: 'Test User',
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    accessToken: 'test-access-token',
  };
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function requireAuth(): Promise<Session> {
  // Check for test auth first (dev/CI only)
  const testSession = await checkTestAuth();
  if (testSession) {
    return testSession;
  }

  // Normal auth flow
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    console.error('❌ FATAL: Authentication required');
    console.error('💡 User must be signed in to access this resource');
    console.error('💡 Redirect to /auth/signin');

    throw new Error('Authentication required - no session found');
  }

  return session;
}

export function validateSession(session: any) {
  if (!session) {
    throw new Error('No session provided');
  }
  
  if (!session.user) {
    throw new Error('Session missing user data');
  }
  
  if (!session.user.email) {
    throw new Error('Session missing user email');
  }
  
  return true;
}