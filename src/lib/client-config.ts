/**
 * Client-Safe Configuration
 * 
 * This module provides configuration values that are safe to use in client components
 * and during server-side rendering. It only uses NEXT_PUBLIC_* environment variables
 * which are replaced at build time.
 * 
 * IMPORTANT: Do not import any server-side modules here to avoid SSR issues.
 */

// Client-safe base path configuration
export const CLIENT_BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

// NextAuth v4 SessionProvider expects just the app basePath, not the full auth path
// It will automatically append /api/auth when making requests
export const NEXTAUTH_BASE_PATH = CLIENT_BASE_PATH;

// Export other client-safe config values as needed
export const CLIENT_CONFIG = {
  basePath: CLIENT_BASE_PATH,
  authBasePath: NEXTAUTH_BASE_PATH,
} as const;