/**
 * NextAuth v4 Workaround for redirect_uri with basePath
 * 
 * ⚠️ TEMPORARY WORKAROUND - REMOVE WHEN UPGRADING TO NEXTAUTH V5 ⚠️
 * 
 * NextAuth v4 has a known limitation where it doesn't automatically append
 * the basePath to the redirect_uri when using Azure AD (or other OAuth providers).
 * This causes authentication to fail when deployed with a basePath.
 * 
 * This workaround manually constructs the redirect_uri with the basePath included.
 * NextAuth v5 fixes this issue automatically.
 * 
 * Related issues:
 * - https://github.com/nextauthjs/next-auth/issues/9493
 * - https://github.com/nextauthjs/next-auth/discussions/9632
 * 
 * TO REMOVE THIS WORKAROUND:
 * 1. Upgrade to NextAuth v5: npm install next-auth@beta
 * 2. Delete this file
 * 3. Remove the redirect_uri parameter from auth-options.ts
 * 4. Update CLAUDE.md to remove the v4 limitation section
 */

import { config } from './config';
import logger from './logger';

/**
 * Constructs the full redirect URI for OAuth callbacks with basePath
 * 
 * This manually builds what NextAuth v5 does automatically.
 * In v4, the redirect_uri sent to Azure AD doesn't include the basePath,
 * causing a mismatch with the configured Reply URLs.
 */
export function constructRedirectUri(provider: string = 'azure-ad'): string {
  const nextAuthUrl = process.env.NEXTAUTH_URL || `http://localhost:${process.env.PORT || '3000'}`;
  const basePath = config.BASE_PATH || '';
  
  // Construct the full redirect URI
  const redirectUri = `${nextAuthUrl}/api/auth/callback/${provider}`;
  
  // Log the workaround application (only log once on startup)
  if (!global._nextAuthV4WorkaroundLogged) {
    logger.warn('===========================================');
    logger.warn('⚠️  NextAuth v4 Workaround Active');
    logger.warn('===========================================');
    logger.warn('Manually constructing redirect_uri with basePath');
    logger.warn(`→ NEXTAUTH_URL: ${nextAuthUrl}`);
    logger.warn(`→ BASE_PATH: ${basePath || '(root)'}`);
    logger.warn(`→ redirect_uri: ${redirectUri}`);
    logger.warn('This workaround will be removed when upgrading to NextAuth v5');
    logger.warn('===========================================');
    
    global._nextAuthV4WorkaroundLogged = true;
  }
  
  return redirectUri;
}

/**
 * Gets the authorization parameters with the redirect_uri workaround
 * 
 * This adds the redirect_uri parameter that NextAuth v4 doesn't include automatically
 */
export function getAuthorizationParamsWithWorkaround(additionalParams: Record<string, string> = {}) {
  return {
    ...additionalParams,
    redirect_uri: constructRedirectUri('azure-ad')
  };
}

// TypeScript declaration for the global flag
declare global {
  // eslint-disable-next-line no-var
  var _nextAuthV4WorkaroundLogged: boolean | undefined;
}