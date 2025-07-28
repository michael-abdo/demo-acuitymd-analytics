import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth-options";
import { redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";
import { isDocumentOwner, ApiErrors, TimestampUtils } from './utils';
import { documentDb } from './template/database';
import type { TemplateDocument } from '@/types/template';
import { ensureStorageInitialized } from './storage';
import { ErrorLogger, ApiError } from './error-logger';
import { APP_CONSTANTS, config, EnvironmentHelpers } from './config';
import { RequestParser } from './services/request-parser';
import type { RateLimiter } from './rate-limiter';
import { pagePath } from './utils/path-utils';

/**
 * Consolidated API imports - eliminates duplicate import statements across API routes
 * Re-exports commonly used utilities to create single import source
 */
export { ApiErrors, TimestampUtils, FileValidation } from './utils';
export { Logger } from './services/logger';
export { APP_CONSTANTS, config } from './config';

/**
 * Server-side authentication check for server components.
 * Redirects to the sign-in page if the user is not authenticated.
 */
export async function requireAuth() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect(pagePath("/sign-in"));
  }
  
  return session;
}

/**
 * Server-side authentication check that returns the session if authenticated
 * or null if not. Does not redirect.
 */
export async function getAuthSession() {
  return await getServerSession(authOptions);
}

/**
 * Checks if a user has the required permissions.
 * Can be extended with role-based access control.
 */
export async function checkPermission(requiredPermission: string) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return false;
  }
  
  // This is a placeholder for more complex permission checks
  // You would typically check against user roles or permissions stored in the session or a database
  return true;
}

/**
 * Higher-order function that wraps API route handlers with authentication.
 * Returns 401 if user is not authenticated, otherwise calls the handler with the user email.
 * Use this for routes WITHOUT dynamic segments.
 */
export function withAuth(
  handler: (request: NextRequest, userEmail: string) => Promise<NextResponse>,
  options?: { allowDevBypass?: boolean; trackTiming?: boolean }
) {
  return async (request: NextRequest) => {
    const startTime = Date.now();
    
    // Development bypass for testing (when explicitly allowed)
    if (options?.allowDevBypass && 
        config.IS_DEVELOPMENT && 
        request.headers.get(APP_CONSTANTS.HEADERS.DEV_BYPASS) === 'true') {
      const testEmail = 'test@example.com';
      const response = await handler(request, testEmail);
      
      // Add timing header if tracking is enabled (default: true)
      if (options?.trackTiming !== false) {
        response.headers.set('X-Processing-Time', `${Date.now() - startTime}ms`);
      }
      
      return response;
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: APP_CONSTANTS.MESSAGES.ERROR.UNAUTHORIZED }, { status: 401 });
    }
    
    const response = await handler(request, session.user.email);
    
    // Add timing header if tracking is enabled (default: true)
    if (options?.trackTiming !== false) {
      response.headers.set('X-Processing-Time', `${Date.now() - startTime}ms`);
    }
    
    return response;
  };
}

/**
 * Higher-order function that wraps API route handlers with authentication for dynamic routes.
 * Returns 401 if user is not authenticated, otherwise calls the handler with the user email.
 * Use this for routes WITH dynamic segments like [id].
 */
export function withAuthDynamic<T extends Record<string, any>>(
  handler: (request: NextRequest, userEmail: string, context: { params: Promise<T> }) => Promise<NextResponse>,
  options?: { trackTiming?: boolean }
) {
  return async (request: NextRequest, context: { params: Promise<T> }) => {
    const startTime = Date.now();
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: APP_CONSTANTS.MESSAGES.ERROR.UNAUTHORIZED }, { status: 401 });
    }
    
    const response = await handler(request, session.user.email, context);
    
    // Add timing header if tracking is enabled (default: true)
    if (options?.trackTiming !== false) {
      response.headers.set('X-Processing-Time', `${Date.now() - startTime}ms`);
    }
    
    return response;
  };
}

/**
 * Middleware for document access - combines auth + document retrieval + ownership check
 * This reduces boilerplate in all document-related endpoints
 * 
 * @example
 * export const GET = withDocumentAccess(async (request, userEmail, document, context) => {
 *   // document is already validated and ownership checked
 *   return NextResponse.json(document);
 * });
 */
export function withDocumentAccess<T extends { id: string }>(
  handler: (
    request: NextRequest,
    userEmail: string,
    document: TemplateDocument,
    context: { params: Promise<T> }
  ) => Promise<NextResponse>,
  options?: { trackTiming?: boolean }
) {
  return async (request: NextRequest, context: { params: Promise<T> }) => {
    const startTime = Date.now();
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: APP_CONSTANTS.MESSAGES.ERROR.UNAUTHORIZED }, { status: 401 });
    }
    const userEmail = session.user.email;
    
    // Parse and validate document ID
    const params = await context.params;
    const documentId = RequestParser.parseDocumentId(params.id);
    if (!documentId) {
      return ApiErrors.badRequest('Invalid document ID');
    }

    // Retrieve document from database
    const document = await documentDb.findById(documentId);
    if (!document) {
      return ApiErrors.notFound('Document');
    }

    // Check ownership
    if (!isDocumentOwner(document, userEmail)) {
      return ApiErrors.forbidden();
    }

    // Call the actual handler with the document
    const response = await handler(request, userEmail, document, context);
    
    // Add timing header if tracking is enabled (default: true)
    if (options?.trackTiming !== false) {
      response.headers.set('X-Processing-Time', `${Date.now() - startTime}ms`);
    }
    
    return response;
  };
}

/**
 * Simple API response structure
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  timestamp?: string;
}

/**
 * Simple API response helpers
 */
export const ApiResponseHelpers = {
  /**
   * Success response with data
   */
  success<T>(data: T, message?: string): NextResponse {
    return NextResponse.json({
      success: true,
      message: message || 'Request completed successfully',
      data,
      timestamp: TimestampUtils.now()
    });
  },

  /**
   * Created response (201)
   */
  created<T>(data: T, message?: string): NextResponse {
    return NextResponse.json(
      {
        success: true,
        message: message || 'Resource created successfully',
        data,
        timestamp: TimestampUtils.now()
      },
      { status: 201 }
    );
  },

  /**
   * Updated response
   */
  updated<T>(data: T, message?: string): NextResponse {
    return NextResponse.json({
      success: true,
      message: message || 'Resource updated successfully',
      data,
      timestamp: TimestampUtils.now()
    });
  },

  /**
   * Deleted response
   */
  deleted(message?: string): NextResponse {
    return NextResponse.json({
      success: true,
      message: message || 'Resource deleted successfully',
      timestamp: TimestampUtils.now()
    });
  }
};


/**
 * Development-only access wrapper (DRY: consolidates dev environment guards)
 * Ensures consistent production protection across development endpoints
 */
export function withDevOnlyAccess<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    // FAIL FAST: Block access in production
    if (EnvironmentHelpers.isProduction()) {
      return new NextResponse(null, { status: 404 });
    }
    return handler(...args);
  };
}

/**
 * Wrap any handler with consistent error handling
 */
export function withErrorHandler<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      // Extract context from request if available
      const request = args[0] as NextRequest | undefined;
      const context = {
        endpoint: request?.nextUrl?.pathname,
        method: request?.method,
        userId: args[1] as string | undefined // userEmail is typically the second argument
      };
      
      // Log the error with context
      if (error instanceof ApiError) {
        ErrorLogger.log(error, { ...context, ...error.context });
        return NextResponse.json(
          { error: error.message },
          { status: error.statusCode }
        );
      } else if (error instanceof NextResponse) {
        // Already a formatted response
        return error;
      } else {
        // Unknown error
        ErrorLogger.log(error as Error, context);
        return ApiErrors.serverError(
          error instanceof Error ? error.message : 'An unexpected error occurred'
        );
      }
    }
  };
}

/**
 * Combined auth + error handling wrapper
 */
export function withAuthAndErrorHandling(
  handler: (request: NextRequest, userEmail: string) => Promise<NextResponse>
) {
  return withAuth(withErrorHandler(handler));
}

/**
 * Combined auth + error handling wrapper for dynamic routes
 */
export function withAuthDynamicAndErrorHandling<T extends Record<string, any>>(
  handler: (request: NextRequest, userEmail: string, context: { params: Promise<T> }) => Promise<NextResponse>
) {
  return withAuthDynamic<T>(withErrorHandler(handler));
}

/**
 * Middleware that ensures storage is initialized
 */
export function withStorage<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    await ensureStorageInitialized();
    return handler(...args);
  };
}

/**
 * Combined auth + storage initialization wrapper
 */
export function withAuthAndStorage(
  handler: (request: NextRequest, userEmail: string) => Promise<NextResponse>,
  options?: { allowDevBypass?: boolean }
) {
  return withAuth(withStorage(handler), options);
}

/**
 * Combined auth + storage initialization wrapper for dynamic routes
 */
export function withAuthDynamicAndStorage<T extends Record<string, any>>(
  handler: (request: NextRequest, userEmail: string, context: { params: Promise<T> }) => Promise<NextResponse>
) {
  return withAuthDynamic<T>(withStorage(handler));
}



/**
 * HTTP Status Codes - Consolidated constants for consistency
 */
export const StatusCodes = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  PARTIAL_CONTENT: 206,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;






