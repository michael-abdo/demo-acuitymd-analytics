'use client';

import { useMemo } from 'react';

/**
 * Client-side hook for basePath utilities
 * Provides reactive basePath helpers for client components
 */

// Define the return type for the hook
interface UseBasePathReturn {
  basePath: string;
  withBasePath: (path: string) => string;
  apiPath: (path: string) => string;
  pagePath: (path: string) => string;
  assetPath: (path: string) => string;
  withoutBasePath: (path: string) => string;
  getAuthBasePath: () => string;
}

/**
 * Hook for client-side basePath utilities
 * 
 * @example
 * ```tsx
 * const { pagePath, apiPath } = useBasePath();
 * 
 * return (
 *   <Link href={pagePath('/dashboard')}>Dashboard</Link>
 * );
 * ```
 */
export function useBasePath(): UseBasePathReturn {
  // Get basePath from Next.js runtime config or environment
  const basePath = useMemo(() => {
    // Try to get from Next.js publicRuntimeConfig first
    if (typeof window !== 'undefined' && (window.__NEXT_DATA__ as any)?.publicRuntimeConfig?.basePath) {
      return (window.__NEXT_DATA__ as any).publicRuntimeConfig.basePath;
    }
    
    // Fall back to NEXT_PUBLIC_BASE_PATH environment variable
    return process.env.NEXT_PUBLIC_BASE_PATH || '';
  }, []);

  return useMemo(() => ({
    basePath,
    
    /**
     * Add basePath prefix to a given path
     */
    withBasePath: (path: string): string => {
      // Don't add basePath to external URLs or data URLs
      if (path.startsWith('http') || path.startsWith('//') || path.startsWith('data:')) {
        return path;
      }
      
      // Don't add basePath if it's already there
      if (!basePath || path.startsWith(basePath)) {
        return path;
      }
      
      // Ensure path starts with /
      const normalizedPath = path.startsWith('/') ? path : `/${path}`;
      
      // Combine basePath with path, avoiding double slashes
      return `${basePath}${normalizedPath}`.replace(/\/+/g, '/');
    },
    
    /**
     * Create API path with basePath
     */
    apiPath: (path: string): string => {
      const normalizedPath = path.startsWith('/') ? path : `/${path}`;
      const fullPath = `/api${normalizedPath}`;
      return basePath ? `${basePath}${fullPath}`.replace(/\/+/g, '/') : fullPath;
    },
    
    /**
     * Create page path with basePath
     */
    pagePath: (path: string): string => {
      // Don't add basePath to external URLs
      if (path.startsWith('http') || path.startsWith('//')) {
        return path;
      }
      
      if (!basePath || path.startsWith(basePath)) {
        return path;
      }
      
      const normalizedPath = path.startsWith('/') ? path : `/${path}`;
      return `${basePath}${normalizedPath}`.replace(/\/+/g, '/');
    },
    
    /**
     * Create asset path with basePath (for images, etc.)
     */
    assetPath: (path: string): string => {
      // Don't add basePath to external URLs or data URLs
      if (path.startsWith('http') || path.startsWith('//') || path.startsWith('data:')) {
        return path;
      }
      
      if (!basePath || path.startsWith(basePath)) {
        return path;
      }
      
      const normalizedPath = path.startsWith('/') ? path : `/${path}`;
      return `${basePath}${normalizedPath}`.replace(/\/+/g, '/');
    },
    
    /**
     * Remove basePath from a path (useful for routing)
     */
    withoutBasePath: (path: string): string => {
      if (!basePath || !path.startsWith(basePath)) {
        return path;
      }
      return path.slice(basePath.length) || '/';
    },
    
    /**
     * Get auth provider basePath (for SessionProvider)
     */
    getAuthBasePath: (): string => {
      const authPath = '/api/auth';
      return basePath ? `${basePath}${authPath}` : authPath;
    },
  }), [basePath]);
}

/**
 * Usage Examples:
 * 
 * 1. In Navigation Components:
 * ```tsx
 * const { pagePath } = useBasePath();
 * <Link href={pagePath('/dashboard')}>Dashboard</Link>
 * ```
 * 
 * 2. In API Calls:
 * ```tsx
 * const { apiPath } = useBasePath();
 * const response = await fetch(apiPath('/documents'));
 * ```
 * 
 * 3. For Images/Assets:
 * ```tsx
 * const { assetPath } = useBasePath();
 * <Image src={assetPath('/logo.png')} alt="Logo" />
 * ```
 * 
 * 4. For Dynamic Routing:
 * ```tsx
 * const router = useRouter();
 * const { pagePath } = useBasePath();
 * router.push(pagePath(`/document/${id}`));
 * ```
 */