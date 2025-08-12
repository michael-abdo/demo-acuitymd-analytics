/**
 * BasePath Configuration Layer
 * 
 * This layer sits between next.config.mjs and lib/config.ts in the call stack:
 * 1. .env.{environment} → Next.js loads environment variables
 * 2. next.config.mjs → BASE_PATH resolution with fallbacks
 * 3. THIS FILE → Path normalization and validation
 * 4. lib/config.ts → Main config hub with comprehensive validation
 */

/**
 * Normalizes and validates basePath from environment variables
 */
export function normalizeBasePath(basePath?: string): string {
  // Handle empty or undefined basePath
  if (!basePath || basePath === '' || basePath === '/') {
    return '';
  }
  
  // Normalize path format
  let normalized = basePath.trim();
  
  // Ensure starts with slash
  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`;
  }
  
  // Ensure does NOT end with slash (Next.js requirement)
  if (normalized.endsWith('/') && normalized.length > 1) {
    normalized = normalized.slice(0, -1);
  }
  
  return normalized;
}

/**
 * Validates basePath against Next.js requirements
 */
export function validateBasePath(basePath: string): void {
  if (basePath === '') return; // Empty is valid
  
  // Check format requirements
  if (!basePath.startsWith('/')) {
    throw new Error(`BasePath must start with '/'. Got: ${basePath}`);
  }
  
  if (basePath.endsWith('/')) {
    throw new Error(`BasePath must NOT end with '/'. Got: ${basePath}`);
  }
  
  // Check for invalid characters
  const invalidChars = /[^a-zA-Z0-9\-_\/]/;
  if (invalidChars.test(basePath)) {
    throw new Error(`BasePath contains invalid characters. Use only: a-z, A-Z, 0-9, -, _, /. Got: ${basePath}`);
  }
  
  // Check for double slashes
  if (basePath.includes('//')) {
    throw new Error(`BasePath cannot contain double slashes. Got: ${basePath}`);
  }
  
  // Check length
  if (basePath.length > 100) {
    throw new Error(`BasePath too long (max 100 chars). Got: ${basePath.length} chars`);
  }
}

/**
 * Resolves basePath with environment-aware fallbacks
 */
export function resolveBasePath(): string {
  const env = process.env.NODE_ENV;
  
  // Get basePath from environment variables
  const basePath = process.env.BASE_PATH || process.env.NEXT_PUBLIC_BASE_PATH;
  
  // Normalize the path
  const normalized = normalizeBasePath(basePath);
  
  // Validate the normalized path
  validateBasePath(normalized);
  
  // Environment-specific warnings
  if (env === 'development' && normalized !== '') {
    console.log(`🌐 [BasePath] Development using basePath: ${normalized}`);
  }
  
  if (env === 'production' && normalized === '') {
    console.warn(`⚠️ [BasePath] Production running at root path (no basePath)`);
  }
  
  return normalized;
}

/**
 * Creates path utilities with the resolved basePath
 */
export function createPathUtilities(basePath: string) {
  return {
    basePath,
    
    /**
     * Build full URL for pages (used by Next.js internally)
     */
    buildPagePath: (path: string): string => {
      if (path.startsWith('http')) return path; // External URL
      const cleanPath = path.startsWith('/') ? path : `/${path}`;
      return `${basePath}${cleanPath}`;
    },
    
    /**
     * Build full URL for API calls (used by fetch)
     */
    buildApiPath: (path: string): string => {
      if (path.startsWith('http')) return path; // External URL
      const cleanPath = path.startsWith('/api/') ? path : `/api/${path.replace(/^\//, '')}`;
      return `${basePath}${cleanPath}`;
    },
    
    /**
     * Build full URL for static assets
     */
    buildAssetPath: (path: string): string => {
      if (path.startsWith('http')) return path; // External URL
      const cleanPath = path.startsWith('/') ? path : `/${path}`;
      return `${basePath}${cleanPath}`;
    },
    
    /**
     * Remove basePath from URL (for callbacks, etc.)
     */
    stripBasePath: (url: string): string => {
      if (!basePath || !url.startsWith(basePath)) return url;
      return url.slice(basePath.length) || '/';
    }
  };
}

/**
 * Global basePath configuration
 * This is imported by lib/config.ts and other modules
 */
export const BASEPATH_CONFIG = {
  resolved: resolveBasePath(),
  utilities: null as ReturnType<typeof createPathUtilities> | null
};

// Initialize utilities
BASEPATH_CONFIG.utilities = createPathUtilities(BASEPATH_CONFIG.resolved);

// Export for use in next.config.mjs
export default BASEPATH_CONFIG.resolved;