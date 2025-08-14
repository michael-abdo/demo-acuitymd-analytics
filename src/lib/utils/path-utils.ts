/**
 * Path utilities for handling basePath in client and server components
 * 
 * These utilities ensure all navigation and API calls use the correct basePath
 * configured in the environment variables.
 */

// Get basePath from environment variable
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

/**
 * Build full URL for page navigation
 */
export function pagePath(path: string): string {
  // Handle external URLs
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // Ensure path starts with /
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  // Return path with basePath
  return `${basePath}${cleanPath}`;
}

/**
 * Build full URL for API calls
 */
export function apiPath(path: string): string {
  // Handle external URLs
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // Ensure path starts with /api/
  const cleanPath = path.startsWith('/api/') ? path : `/api/${path.replace(/^\//, '')}`;
  
  // Return path with basePath
  return `${basePath}${cleanPath}`;
}

/**
 * Build full URL for static assets
 */
export function assetPath(path: string): string {
  // Handle external URLs
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // Ensure path starts with /
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  // Return path with basePath
  return `${basePath}${cleanPath}`;
}

/**
 * Get the auth callback URL
 */
export function authCallbackPath(): string {
  return `${basePath}/api/auth/callback/azure-ad`;
}

/**
 * Get the sign out callback URL
 */
export function signOutCallbackPath(): string {
  return pagePath('/dashboard');
}