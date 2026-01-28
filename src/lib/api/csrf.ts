/**
 * CSRF Protection Utility
 *
 * Validates CSRF tokens for state-changing requests (POST, PUT, DELETE).
 * Uses NextAuth's CSRF token from cookies for validation.
 */

import { NextRequest } from 'next/server';
import { createHash } from 'crypto';

// Methods that require CSRF protection
const PROTECTED_METHODS = new Set(['POST', 'PUT', 'DELETE', 'PATCH']);

// Header name for CSRF token
const CSRF_HEADER = 'x-csrf-token';

/**
 * Extract CSRF token hash from NextAuth cookie
 * NextAuth stores: `${token}|${hash}` in the cookie
 */
function getExpectedCsrfHash(request: NextRequest): string | null {
  const cookieValue = request.cookies.get('next-auth.csrf-token')?.value;
  if (!cookieValue) return null;

  // NextAuth format: token|hash
  const parts = cookieValue.split('|');
  if (parts.length !== 2) return null;

  return parts[1]; // Return the hash part
}

/**
 * Hash a token the same way NextAuth does
 */
function hashToken(token: string, secret: string): string {
  return createHash('sha256')
    .update(`${token}${secret}`)
    .digest('hex');
}

/**
 * Validate CSRF token from request header against cookie
 */
export function validateCsrf(request: NextRequest): { valid: boolean; error?: string } {
  // Only validate protected methods
  if (!PROTECTED_METHODS.has(request.method)) {
    return { valid: true };
  }

  // Get token from header
  const headerToken = request.headers.get(CSRF_HEADER);
  if (!headerToken) {
    return { valid: false, error: 'Missing CSRF token header' };
  }

  // Get expected hash from cookie
  const expectedHash = getExpectedCsrfHash(request);
  if (!expectedHash) {
    return { valid: false, error: 'Missing CSRF cookie' };
  }

  // Hash the provided token and compare
  const secret = process.env.NEXTAUTH_SECRET || '';
  const tokenHash = hashToken(headerToken, secret);

  if (tokenHash !== expectedHash) {
    return { valid: false, error: 'Invalid CSRF token' };
  }

  return { valid: true };
}

/**
 * Check if CSRF validation should be enforced
 * Disabled in development if DISABLE_CSRF=true
 */
export function isCsrfEnabled(): boolean {
  if (process.env.NODE_ENV === 'production') return true;
  return process.env.DISABLE_CSRF !== 'true';
}
