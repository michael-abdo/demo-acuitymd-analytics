/**
 * Centralized path utilities for basePath support
 * Ensures all paths work correctly regardless of deployment context
 */

// Get basePath from environment (build-time)
const BASE_PATH = process.env.BASE_PATH || '';

// Get client-side basePath (runtime)
const NEXT_PUBLIC_BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

/**
 * Add basePath prefix to a given path
 * Works for both server-side and client-side
 */
export function withBasePath(path: string): string {
  // Don't add basePath to external URLs or data URLs
  if (path.startsWith('http') || path.startsWith('//') || path.startsWith('data:')) {
    return path;
  }
  
  // Don't add basePath if it's already there
  const basePath = typeof window !== 'undefined' ? NEXT_PUBLIC_BASE_PATH : BASE_PATH;
  if (!basePath || path.startsWith(basePath)) {
    return path;
  }
  
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // Combine basePath with path, avoiding double slashes
  return `${basePath}${normalizedPath}`.replace(/\/+/g, '/');
}

/**
 * Create API path with basePath
 */
export function apiPath(path: string): string {
  return withBasePath(`/api${path.startsWith('/') ? path : `/${path}`}`);
}

/**
 * Create page path with basePath
 */
export function pagePath(path: string): string {
  return withBasePath(path);
}

/**
 * Create asset path with basePath (for images, etc.)
 */
export function assetPath(path: string): string {
  return withBasePath(path);
}

/**
 * Get the current basePath
 */
export function getBasePath(): string {
  return typeof window !== 'undefined' ? NEXT_PUBLIC_BASE_PATH : BASE_PATH;
}

/**
 * Remove basePath from a path (useful for routing)
 */
export function withoutBasePath(path: string): string {
  const basePath = getBasePath();
  if (!basePath || !path.startsWith(basePath)) {
    return path;
  }
  return path.slice(basePath.length) || '/';
}

/**
 * Get auth provider basePath (for SessionProvider)
 */
export function getAuthBasePath(): string {
  return withBasePath('/api/auth');
}