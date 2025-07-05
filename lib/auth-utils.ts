import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth-options";
import { redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";
import { parseDocumentId, isDocumentOwner, ApiErrors } from './utils';
import { documentDb } from './nda/database';
import type { NDADocument } from '@/types/nda';
import { ensureStorageInitialized } from './storage';
import { ErrorLogger, ApiError } from './error-logger';

/**
 * Server-side authentication check for server components.
 * Redirects to the sign-in page if the user is not authenticated.
 */
export async function requireAuth() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect("/sign-in");
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
  handler: (request: NextRequest, userEmail: string) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return handler(request, session.user.email);
  };
}

/**
 * Higher-order function that wraps API route handlers with authentication for dynamic routes.
 * Returns 401 if user is not authenticated, otherwise calls the handler with the user email.
 * Use this for routes WITH dynamic segments like [id].
 */
export function withAuthDynamic<T extends Record<string, any>>(
  handler: (request: NextRequest, userEmail: string, context: { params: T }) => Promise<NextResponse>
) {
  return async (request: NextRequest, context: { params: T }) => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return handler(request, session.user.email, context);
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
    document: NDADocument,
    context: { params: T }
  ) => Promise<NextResponse>
) {
  return withAuthDynamic<T>(async (request, userEmail, context) => {
    // Parse and validate document ID
    const documentId = parseDocumentId(context.params.id);
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
    return handler(request, userEmail, document, context);
  });
}

/**
 * Standard API response helpers
 */
export const ApiResponse = {
  /**
   * Success response with data
   */
  success<T>(data: T, message?: string): NextResponse {
    return NextResponse.json({
      success: true,
      message: message || 'Request completed successfully',
      data
    });
  },

  /**
   * Success response with list data and pagination
   */
  list<T>(items: T[], pagination?: { page: number; pageSize: number; total: number }): NextResponse {
    const response: any = {
      success: true,
      data: items,
      count: items.length
    };

    if (pagination) {
      response.pagination = {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total: pagination.total,
        totalPages: Math.ceil(pagination.total / pagination.pageSize)
      };
    }

    return NextResponse.json(response);
  },

  /**
   * Created response (201)
   */
  created<T>(data: T, message?: string): NextResponse {
    return NextResponse.json(
      {
        success: true,
        message: message || 'Resource created successfully',
        data
      },
      { status: 201 }
    );
  },

  /**
   * No content response (204)
   */
  noContent(): NextResponse {
    return new NextResponse(null, { status: 204 });
  }
};

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
  handler: (request: NextRequest, userEmail: string, context: { params: T }) => Promise<NextResponse>
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
  handler: (request: NextRequest, userEmail: string) => Promise<NextResponse>
) {
  return withAuth(withStorage(handler));
}

/**
 * Combined auth + storage initialization wrapper for dynamic routes
 */
export function withAuthDynamicAndStorage<T extends Record<string, any>>(
  handler: (request: NextRequest, userEmail: string, context: { params: T }) => Promise<NextResponse>
) {
  return withAuthDynamic<T>(withStorage(handler));
} 