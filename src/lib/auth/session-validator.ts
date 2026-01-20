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
 * Check if test auth is enabled and valid
 * Returns a mock session if valid, null otherwise
 */
async function checkTestAuth(): Promise<Session | null> {
  // Only allow in non-production when explicitly enabled
  if (process.env.NODE_ENV === 'production') return null;
  if (process.env.ALLOW_TEST_AUTH !== 'true') return null;

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

  // Return mock session
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