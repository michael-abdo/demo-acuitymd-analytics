/**
 * API Route Authentication Wrapper
 * 
 * This implements the Data Access Layer (DAL) pattern for API route authentication.
 * Instead of middleware-based auth, each route explicitly handles authentication
 * at the data access level, following 2025 best practices.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session-validator';
import { Session } from 'next-auth';
import logger from '@/lib/pino-logger';

/**
 * Context passed to authenticated route handlers
 */
export interface AuthContext {
  session: Session;
  userEmail: string;
}

/**
 * Route handler function type that receives authenticated context
 */
type AuthenticatedRouteHandler = (
  request: NextRequest,
  context: AuthContext,
  params?: any
) => Promise<Response> | Response;

/**
 * Wraps an API route handler with authentication
 * 
 * @example
 * ```typescript
 * export const GET = withAuth(async (request, { session, userEmail }) => {
 *   // Route handler has access to authenticated session
 *   return NextResponse.json({ user: userEmail });
 * });
 * ```
 */
export function withAuth(handler: AuthenticatedRouteHandler) {
  return async (request: NextRequest, params?: any) => {
    try {
      // Authenticate request using existing requireAuth utility
      const session = await requireAuth();
      
      // Log successful authentication
      logger.base.info('API route authenticated', {
        method: request.method,
        url: request.url,
        userEmail: session.user?.email,
      });

      // Create auth context
      const context: AuthContext = {
        session,
        userEmail: session.user?.email || '',
      };

      // Call the wrapped handler with auth context
      return await handler(request, context, params);
      
    } catch (error) {
      // Log authentication failure
      logger.base.warn('API route authentication failed', {
        method: request.method,
        url: request.url,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Return 401 Unauthorized for auth failures
      return NextResponse.json(
        { 
          error: 'Unauthorized',
          message: 'Authentication required to access this resource'
        },
        { status: 401 }
      );
    }
  };
}