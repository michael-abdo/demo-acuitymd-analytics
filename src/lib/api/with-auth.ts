/**
 * API Route Authentication Wrapper
 * 
 * This implements the Data Access Layer (DAL) pattern for API route authentication.
 * Instead of middleware-based auth, each route explicitly handles authentication
 * at the data access level, following 2025 best practices.
 */

import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/session-validator';
import { Session } from 'next-auth';
import logger from '@/lib/pino-logger';
import { simpleDocumentService as documentService } from '@/lib/services/document.service.simple';
import { IDocumentService } from '@/lib/services/interfaces/document.service.interface';
import { ApiResponseUtil } from '@/lib/response';
import { EmailService, emailService } from '@/lib/services/email.service';

/**
 * Services container for dependency injection
 */
export interface ServiceContainer {
  documentService: IDocumentService;
  emailService: EmailService;
}

/**
 * Context passed to authenticated route handlers
 */
export interface AuthContext {
  session: Session;
  userEmail: string;
  services: ServiceContainer;
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
 * Optional configuration for withAuth wrapper
 */
export interface WithAuthOptions {
  services?: Partial<ServiceContainer>;
}

/**
 * Wraps an API route handler with authentication and service dependency injection
 * 
 * @param handler - The route handler function to wrap
 * @param options - Optional configuration including custom services for testing
 * 
 * @example
 * ```typescript
 * export const GET = withAuth(async (request, { session, userEmail, services }) => {
 *   // Route handler has access to authenticated session and injected services
 *   const result = await services.documentService.getUserDocuments(userEmail);
 *   return ApiResponseUtil.success(result);
 * });
 * ```
 * 
 * @example Custom services for testing:
 * ```typescript
 * const mockDocumentService = new MockDocumentService();
 * export const GET = withAuth(handler, { services: { documentService: mockDocumentService } });
 * ```
 */
export function withAuth(handler: AuthenticatedRouteHandler, options?: WithAuthOptions) {
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

      // Create default services container
      const defaultServices: ServiceContainer = {
        documentService,
        emailService,
      };

      // Merge with custom services if provided (useful for testing)
      const services: ServiceContainer = {
        ...defaultServices,
        ...options?.services,
      };

      // Create auth context with injected services
      const context: AuthContext = {
        session,
        userEmail: session.user?.email || '',
        services,
      };

      // Call the wrapped handler with auth context and injected services
      return await handler(request, context, params);
      
    } catch (error) {
      // Log authentication failure
      logger.base.warn('API route authentication failed', {
        method: request.method,
        url: request.url,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Return 401 Unauthorized for auth failures using standardized response utility
      return ApiResponseUtil.unauthorized('Authentication required to access this resource');
    }
  };
}
