/**
 * Next.js Instrumentation
 * 
 * This file runs once when the Next.js server starts
 * Used for application initialization and environment validation
 * 
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Import and run initialization only on server
    await import('./lib/init');
  }
}