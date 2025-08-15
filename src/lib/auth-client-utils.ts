'use client';

import { signIn as nextAuthSignIn, signOut as nextAuthSignOut } from 'next-auth/react';
import { NEXTAUTH_BASE_PATH, CLIENT_BASE_PATH } from './client-config';

/**
 * Get the auth base path for NextAuth client configuration
 * Returns just the basePath for NextAuth v4 SessionProvider
 */
export function getAuthBasePath() {
  return CLIENT_BASE_PATH;
}

/**
 * Custom signIn function that properly handles basePath
 * This works around NextAuth v4's limitation with basePath
 */
export async function signIn(
  provider?: string,
  options?: { callbackUrl?: string },
  authorizationParams?: Record<string, string>
) {
  // If we're already in a sign-in process, use NextAuth's signIn
  if (typeof window !== 'undefined' && window.location.pathname.includes('/sign-in')) {
    return nextAuthSignIn(provider, options, authorizationParams);
  }
  
  // Otherwise, redirect to our sign-in page with basePath
  const callbackUrl = options?.callbackUrl || `${CLIENT_BASE_PATH}/dashboard`;
  const signInUrl = `${CLIENT_BASE_PATH}/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  
  if (typeof window !== 'undefined') {
    window.location.href = signInUrl;
  }
}

/**
 * Custom signOut function that properly handles basePath
 */
export async function signOut(options?: { callbackUrl?: string }) {
  const callbackUrl = options?.callbackUrl || `${CLIENT_BASE_PATH}/`;
  return nextAuthSignOut({ callbackUrl });
}