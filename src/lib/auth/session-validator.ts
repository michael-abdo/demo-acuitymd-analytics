/**
 * Session Validator (Fail Fast)
 * Required authentication - no guest mode
 */

import { getServerSession } from 'next-auth';
import { authOptions } from './auth-options';

export async function requireAuth() {
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