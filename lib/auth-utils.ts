import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth-options";
import { redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";
import { parseDocumentId, isDocumentOwner, ApiErrors } from './utils';
import { documentDb } from './nda/database';
import type { NDADocument } from '@/types/nda';
import { ensureStorageInitialized } from './storage';
import { ErrorLogger, ApiError } from './error-logger';
import { APP_CONSTANTS, config } from './config';

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
  handler: (request: NextRequest, userEmail: string) => Promise<NextResponse>,
  options?: { allowDevBypass?: boolean }
) {
  return async (request: NextRequest) => {
    // Development bypass for testing (when explicitly allowed)
    if (options?.allowDevBypass && 
        config.IS_DEVELOPMENT && 
        request.headers.get(APP_CONSTANTS.HEADERS.DEV_BYPASS) === 'true') {
      const testEmail = config.TEST_USER_EMAIL;
      return handler(request, testEmail);
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: APP_CONSTANTS.MESSAGES.ERROR.UNAUTHORIZED }, { status: 401 });
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
      return NextResponse.json({ error: APP_CONSTANTS.MESSAGES.ERROR.UNAUTHORIZED }, { status: 401 });
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
  return async (request: NextRequest, context: { params: T }) => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: APP_CONSTANTS.MESSAGES.ERROR.UNAUTHORIZED }, { status: 401 });
    }
    const userEmail = session.user.email;
    
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
  };
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
  },

  /**
   * Updated response for resource updates
   */
  updated<T>(data: T, message?: string): NextResponse {
    return NextResponse.json({
      success: true,
      message: message || 'Resource updated successfully',
      data
    });
  },

  /**
   * Deleted response for resource deletion
   */
  deleted(message?: string): NextResponse {
    return NextResponse.json({
      success: true,
      message: message || 'Resource deleted successfully'
    });
  },

  /**
   * Response with additional metadata
   */
  successWithMeta<T>(data: T, metadata: Record<string, any>, message?: string): NextResponse {
    return NextResponse.json({
      success: true,
      message: message || 'Request completed successfully',
      data,
      ...metadata
    });
  },

  /**
   * Response with custom headers
   */
  successWithHeaders<T>(data: T, headers: Record<string, string>, message?: string): NextResponse {
    const response = NextResponse.json({
      success: true,
      message: message || 'Request completed successfully',
      data
    });
    
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    return response;
  },

  /**
   * Standardized operation response (DRY: consistent operation responses)
   * 
   * @example
   * return ApiResponse.operation('document.upload', {
   *   result: document,
   *   metadata: { size: file.size, type: file.type }
   * });
   */
  operation<T = any>(
    operationName: string, 
    options: {
      result?: T;
      metadata?: Record<string, any>;
      message?: string;
      status?: 'success' | 'created' | 'updated' | 'deleted' | 'partial';
      httpStatus?: number;
      timing?: { start: number; operations?: Record<string, number> };
      warnings?: string[];
    } = {}
  ): NextResponse {
    const {
      result,
      metadata = {},
      message,
      status = 'success',
      httpStatus,
      timing,
      warnings = []
    } = options;

    const response: any = {
      success: true,
      operation: operationName,
      status,
      message: message || getOperationMessage(operationName, status),
      timestamp: new Date().toISOString()
    };

    // Add result if provided
    if (result !== undefined) {
      response.data = result;
    }

    // Add metadata if provided
    if (Object.keys(metadata).length > 0) {
      response.metadata = metadata;
    }

    // Add warnings if any
    if (warnings.length > 0) {
      response.warnings = warnings;
    }

    // Add timing information if provided
    if (timing) {
      const duration = Date.now() - timing.start;
      response.timing = {
        duration: `${duration}ms`,
        operations: timing.operations
      };
    }

    // Determine HTTP status code
    const statusCode = httpStatus || getHttpStatusForOperation(status);

    return NextResponse.json(response, { status: statusCode });
  }
};

/**
 * Helper function to generate operation-specific messages
 */
function getOperationMessage(operationName: string, status: string): string {
  const [resource, action] = operationName.split('.');
  
  const messages: Record<string, Record<string, string>> = {
    document: {
      success: 'Document operation completed successfully',
      created: 'Document uploaded successfully',
      updated: 'Document updated successfully',
      deleted: 'Document deleted successfully',
      partial: 'Document operation partially completed'
    },
    comparison: {
      success: 'Comparison completed successfully',
      created: 'Comparison created successfully',
      updated: 'Comparison updated successfully',
      deleted: 'Comparison deleted successfully',
      partial: 'Comparison partially completed'
    },
    extraction: {
      success: 'Text extraction completed successfully',
      created: 'Extraction task created successfully',
      updated: 'Extraction task updated successfully',
      deleted: 'Extraction task deleted successfully',
      partial: 'Text extraction partially completed'
    }
  };

  // Try to find a specific message
  if (messages[resource]?.[status]) {
    return messages[resource][status];
  }

  // Fallback to generic message
  return `${operationName} ${status}`;
}

/**
 * Helper function to determine HTTP status code based on operation status
 */
function getHttpStatusForOperation(status: string): number {
  switch (status) {
    case 'created':
      return 201;
    case 'deleted':
      return 200; // Could be 204, but we return JSON body
    case 'partial':
      return 206;
    case 'success':
    case 'updated':
    default:
      return 200;
  }
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
  handler: (request: NextRequest, userEmail: string) => Promise<NextResponse>,
  options?: { allowDevBypass?: boolean }
) {
  return withAuth(withStorage(handler), options);
}

/**
 * Combined auth + storage initialization wrapper for dynamic routes
 */
export function withAuthDynamicAndStorage<T extends Record<string, any>>(
  handler: (request: NextRequest, userEmail: string, context: { params: T }) => Promise<NextResponse>
) {
  return withAuthDynamic<T>(withStorage(handler));
}

