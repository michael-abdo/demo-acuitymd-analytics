'use client';

import { signIn as nextAuthSignIn, signOut as nextAuthSignOut } from 'next-auth/react';
import { config } from './config';

/**
 * Get the auth base path for NextAuth client configuration
 */
export function getAuthBasePath() {
  return process.env.NEXT_PUBLIC_BASE_PATH ? `${process.env.NEXT_PUBLIC_BASE_PATH}/api/auth` : '/api/auth';
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
  const callbackUrl = options?.callbackUrl || `${config.BASE_PATH}/dashboard`;
  const signInUrl = `${config.BASE_PATH}/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  
  if (typeof window !== 'undefined') {
    window.location.href = signInUrl;
  }
}

/**
 * Custom signOut function that properly handles basePath
 */
export async function signOut(options?: { callbackUrl?: string }) {
  const callbackUrl = options?.callbackUrl || `${config.BASE_PATH}/`;
  return nextAuthSignOut({ callbackUrl });
}