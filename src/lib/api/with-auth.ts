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
import { simpleDocumentService as documentService } from '@/lib/services/document.service';
import { IDocumentService } from '@/lib/services/interfaces/document.service.interface';
import { ApiResponseUtil } from '@/lib/response';
import { EmailService, emailService } from '@/lib/services/email.service';
import { validateCsrf, isCsrfEnabled } from './csrf';
import { RateLimiter } from '@/lib/rate-limiter';
import { APP_CONSTANTS } from '@/lib/config';
import { MedtechProductService, medtechProductService } from '@/lib/services/medtech_product.service';
import { ApprovalProcessService, approvalProcessService } from '@/lib/services/approval_process.service';

/**
 * API Rate Limiter
 * Limits requests per user to prevent abuse.
 * Default: 100 requests per 15-minute window
 */
const apiRateLimiter = new RateLimiter(
  APP_CONSTANTS.RATE_LIMIT.MAX_REQUESTS,
  APP_CONSTANTS.RATE_LIMIT.WINDOW_SIZE / 60000 // Convert ms to minutes
);

/**
 * Services container for dependency injection
 */
export interface ServiceContainer {
  approvalProcessService: ApprovalProcessService;
  medtechProductService: MedtechProductService;
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
 * NOTE: This is named `withApiAuth` to distinguish it from next-auth's `withAuth` middleware.
 * - Use `withApiAuth` for API route handlers (this file)
 * - Use `withAuth` from 'next-auth/middleware' for page/middleware protection
 *
 * @param handler - The route handler function to wrap
 * @param options - Optional configuration including custom services for testing
 *
 * @example
 * ```typescript
 * export const GET = withApiAuth(async (request, { session, userEmail, services }) => {
 *   // Route handler has access to authenticated session and injected services
 *   const result = await services.documentService.getUserDocuments(userEmail);
 *   return ApiResponseUtil.success(result);
 * });
 * ```
 *
 * @example Custom services for testing:
 * ```typescript
 * const mockDocumentService = new MockDocumentService();
 * export const GET = withApiAuth(handler, { services: { documentService: mockDocumentService } });
 * ```
 */
export function withApiAuth(handler: AuthenticatedRouteHandler, options?: WithAuthOptions) {
  return async (request: NextRequest, params?: any) => {
    try {
      // Authenticate request using existing requireAuth utility
      const session = await requireAuth();

      // SECURITY: Validate CSRF token for state-changing requests
      if (isCsrfEnabled()) {
        const csrfResult = validateCsrf(request);
        if (!csrfResult.valid) {
          logger.base.warn({
            method: request.method,
            url: request.url,
            error: csrfResult.error,
          }, 'CSRF validation failed');
          return ApiResponseUtil.error(
            { code: 'CSRF_INVALID', message: csrfResult.error || 'CSRF validation failed' },
            403
          );
        }
      }

      // SECURITY: Check rate limit for this user
      const userEmail = session.user?.email || '';
      const isAllowed = apiRateLimiter.checkLimit(userEmail);

      if (!isAllowed) {
        const resetTime = apiRateLimiter.getResetTime(userEmail);
        const retryAfter = resetTime ? Math.ceil((resetTime - Date.now()) / 1000) : 60;

        logger.base.warn({
          method: request.method,
          url: request.url,
          userEmail,
        }, 'Rate limit exceeded');

        return new NextResponse(
          JSON.stringify({
            success: false,
            error: {
              code: 'RATE_LIMITED',
              message: `Too many requests. Please wait ${retryAfter} seconds before trying again.`,
              retryAfter,
            },
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'X-RateLimit-Limit': APP_CONSTANTS.RATE_LIMIT.MAX_REQUESTS.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': (resetTime || Date.now() + 60000).toString(),
              'Retry-After': retryAfter.toString(),
            },
          }
        );
      }

      // Log successful authentication (wrapped to prevent pino worker crashes)
      try {
        logger.base.info({
          method: request.method,
          url: request.url,
          userEmail,
        }, 'API route authenticated');
      } catch {
        // Ignore logger errors
      }

      // Create default services container
      const defaultServices: ServiceContainer = {
  approvalProcessService,
  medtechProductService,
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
        userEmail, // Already defined above during rate limit check
        services,
      };

      // Call the wrapped handler with auth context and injected services
      return await handler(request, context, params);
      
    } catch (error) {
      // Log authentication failure
      logger.base.warn({
        method: request.method,
        url: request.url,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'API route authentication failed');

      // Return 401 Unauthorized for auth failures using standardized response utility
      return ApiResponseUtil.unauthorized('Authentication required to access this resource');
    }
  };
}
