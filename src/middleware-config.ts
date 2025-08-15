/**
 * Middleware Configuration Helper
 * 
 * Since Next.js requires static middleware config, we need to generate
 * the correct matcher based on the BASE_PATH at build time.
 * 
 * IMPORTANT: When changing BASE_PATH, you must rebuild the application!
 */

const BASE_PATH = process.env.BASE_PATH || '';

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  'api/auth',
  'sign-in',
  'sign-up',
  'auth/error',
  'auth/signout',
  '_next/static',
  '_next/image',
  'favicon.ico',
  'public'
];

/**
 * Generate middleware matcher patterns based on BASE_PATH
 */
export function generateMiddlewareMatcher() {
  if (!BASE_PATH) {
    // No basePath - protect everything except public routes
    return [
      `/((?!${PUBLIC_ROUTES.join('|')}).*)`
    ];
  }
  
  // With basePath - protect basePath routes except public ones
  return [
    `${BASE_PATH}/((?!${PUBLIC_ROUTES.join('|')}).*)`,
    // Also match root-level auth routes that NextAuth might use
    '/api/auth/:path*'
  ];
}

// Export for use in build scripts
export const MIDDLEWARE_MATCHER = generateMiddlewareMatcher();

console.log('Middleware matcher generated for BASE_PATH:', BASE_PATH);
console.log('Patterns:', MIDDLEWARE_MATCHER);