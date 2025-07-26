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
import { RequestParser } from './services/request-parser';
import type { RateLimiter } from './rate-limiter';

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
  options?: { allowDevBypass?: boolean; trackTiming?: boolean }
) {
  return async (request: NextRequest) => {
    const startTime = Date.now();
    
    // Development bypass for testing (when explicitly allowed)
    if (options?.allowDevBypass && 
        config.IS_DEVELOPMENT && 
        request.headers.get(APP_CONSTANTS.HEADERS.DEV_BYPASS) === 'true') {
      const testEmail = config.TEST_USER_EMAIL;
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
    document: NDADocument,
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
    const documentId = parseDocumentId(params.id);
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
 * Operation types for type-safe API responses
 */
export type ApiOperationType = 
  | 'document.upload' | 'document.list' | 'document.get' | 'document.update' | 'document.delete' | 'document.extract'
  | 'comparison.create' | 'comparison.list' | 'comparison.get' | 'comparison.update' | 'comparison.delete'
  | 'queue.process' | 'queue.list' | 'queue.retry'
  | 'auth.login' | 'auth.logout' | 'auth.verify'
  | 'health.check' | 'health.db' | 'health.storage'
  | 'admin.seed' | 'admin.migrate' | 'admin.stats';

/**
 * Operation status types
 */
export type ApiOperationStatus = 'success' | 'created' | 'updated' | 'deleted' | 'partial' | 'queued';

/**
 * Standard operation response structure
 */
export interface ApiOperationResponse<T = any> {
  success: boolean;
  operation: ApiOperationType;
  status: ApiOperationStatus;
  message: string;
  timestamp: string;
  data?: T;
  metadata?: Record<string, any>;
  warnings?: string[];
  timing?: {
    duration: string;
    operations?: Record<string, number>;
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
    operationName: ApiOperationType, 
    options: {
      result?: T;
      metadata?: Record<string, any>;
      message?: string;
      status?: ApiOperationStatus;
      httpStatus?: number;
      timing?: { start: number; operations?: Record<string, number> };
      warnings?: string[];
    } = {}
  ): NextResponse<ApiOperationResponse<T>> {
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
  },

  /**
   * Document-specific response helpers
   */
  document: {
    uploaded<T>(document: T, metadata?: Record<string, any>): NextResponse<ApiOperationResponse<T>> {
      return ApiResponse.operation('document.upload', {
        result: document,
        metadata,
        status: 'created'
      });
    },
    
    listed<T>(documents: T[], pagination?: { page: number; pageSize: number; total: number }): NextResponse<ApiOperationResponse<T[]>> {
      return ApiResponse.operation('document.list', {
        result: documents,
        metadata: pagination ? {
          pagination: {
            ...pagination,
            totalPages: Math.ceil(pagination.total / pagination.pageSize)
          },
          count: documents.length
        } : { count: documents.length }
      });
    },
    
    extracted<T>(document: T, extractedText: string): NextResponse<ApiOperationResponse<T>> {
      return ApiResponse.operation('document.extract', {
        result: document,
        metadata: {
          textLength: extractedText.length,
          hasContent: extractedText.length > 0
        }
      });
    }
  },

  /**
   * Comparison-specific response helpers
   */
  comparison: {
    created<T>(comparison: T, metadata?: Record<string, any>): NextResponse<ApiOperationResponse<T>> {
      return ApiResponse.operation('comparison.create', {
        result: comparison,
        metadata,
        status: 'created'
      });
    },
    
    completed<T>(comparison: T, differences: number): NextResponse<ApiOperationResponse<T>> {
      return ApiResponse.operation('comparison.update', {
        result: comparison,
        metadata: {
          differencesFound: differences,
          status: 'completed'
        },
        status: 'updated'
      });
    }
  },

  /**
   * Queue-specific response helpers
   */
  queue: {
    processed<T>(task: T, processingTime: number): NextResponse<ApiOperationResponse<T>> {
      return ApiResponse.operation('queue.process', {
        result: task,
        metadata: {
          processingTime: `${processingTime}ms`
        }
      });
    },
    
    queued<T>(task: T, queuePosition?: number): NextResponse<ApiOperationResponse<T>> {
      return ApiResponse.operation('queue.process', {
        result: task,
        metadata: queuePosition ? { queuePosition } : {},
        status: 'queued'
      });
    }
  },

  /**
   * Health check response helpers
   */
  health: {
    ok(service: string, metadata?: Record<string, any>): NextResponse<ApiOperationResponse<void>> {
      return ApiResponse.operation('health.check', {
        metadata: {
          service,
          status: 'healthy',
          ...metadata
        }
      });
    },
    
    degraded(service: string, issues: string[]): NextResponse<ApiOperationResponse<void>> {
      return ApiResponse.operation('health.check', {
        metadata: {
          service,
          status: 'degraded'
        },
        warnings: issues,
        status: 'partial'
      });
    }
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
      partial: 'Document operation partially completed',
      queued: 'Document operation queued for processing'
    },
    comparison: {
      success: 'Comparison completed successfully',
      created: 'Comparison created successfully',
      updated: 'Comparison updated successfully',
      deleted: 'Comparison deleted successfully',
      partial: 'Comparison partially completed',
      queued: 'Comparison queued for processing'
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
    case 'queued':
      return 202; // Accepted
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

/**
 * Wrapper for comparison routes that validates ownership of two documents
 * Consolidates ownership validation logic for DRY compliance
 */
export function withComparisonAccess(
  handler: (
    request: NextRequest,
    userEmail: string,
    doc1: NDADocument,
    doc2: NDADocument
  ) => Promise<NextResponse>,
  options?: { trackTiming?: boolean }
) {
  return withAuth(async (request: NextRequest, userEmail: string) => {
    const startTime = Date.now();
    
    try {
      // Parse comparison request
      const { doc1Id, doc2Id } = await RequestParser.parseComparisonRequest(request);
      
      // Validate not comparing document with itself
      if (doc1Id === doc2Id) {
        return ApiErrors.badRequest('Cannot compare a document with itself');
      }
      
      // Fetch both documents in parallel
      const [doc1, doc2] = await Promise.all([
        documentDb.findById(doc1Id),
        documentDb.findById(doc2Id)
      ]);
      
      // Check existence
      if (!doc1 || !doc2) {
        return ApiErrors.notFound('One or both documents not found');
      }
      
      // Check ownership of both documents
      if (!isDocumentOwner(doc1, userEmail) || !isDocumentOwner(doc2, userEmail)) {
        return ApiErrors.forbidden();
      }
      
      // Call the actual handler with both documents
      const response = await handler(request, userEmail, doc1, doc2);
      
      // Add timing header if tracking is enabled (default: true)
      if (options?.trackTiming !== false) {
        response.headers.set('X-Processing-Time', `${Date.now() - startTime}ms`);
      }
      
      return response;
      
    } catch (error) {
      // If it's already an API error response, return it
      if (error instanceof NextResponse) {
        return error;
      }
      throw error;
    }
  }, options);
}

/**
 * Wrapper that adds rate limiting to routes
 * Consolidates rate limiting logic for DRY compliance
 */
export function withRateLimit(
  rateLimiter: RateLimiter,
  handler: (request: NextRequest, userEmail: string) => Promise<NextResponse>,
  options?: { 
    allowDevBypass?: boolean;
    trackTiming?: boolean;
    includeHeaders?: boolean;
  }
) {
  return withAuth(async (request: NextRequest, userEmail: string) => {
    // Check rate limit
    if (!rateLimiter.checkLimit(userEmail)) {
      const resetTime = rateLimiter.getResetTime(userEmail);
      return ApiErrors.rateLimitExceeded(resetTime ? new Date(resetTime) : undefined);
    }
    
    // Call the handler
    const response = await handler(request, userEmail);
    
    // Add rate limit headers if requested (default: true)
    if (options?.includeHeaders !== false) {
      const remaining = rateLimiter.getRemainingRequests(userEmail);
      const resetTime = rateLimiter.getResetTime(userEmail);
      
      response.headers.set(APP_CONSTANTS.HEADERS.RATE_LIMIT.LIMIT, rateLimiter['maxRequests'].toString());
      response.headers.set(APP_CONSTANTS.HEADERS.RATE_LIMIT.REMAINING, remaining.toString());
      if (resetTime) {
        response.headers.set(APP_CONSTANTS.HEADERS.RATE_LIMIT.RESET, new Date(resetTime).toISOString());
      }
    }
    
    return response;
  }, options);
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

/**
 * Standardized API response patterns for consistency across routes
 */
export const StandardResponses = {
  created: <T>(data: T, message?: string, headers?: HeadersInit) => 
    new Response(JSON.stringify({
      success: true,
      message: message || 'Resource created successfully',
      data,
      timestamp: new Date().toISOString()
    }), { 
      status: StatusCodes.CREATED, 
      headers: { 'Content-Type': 'application/json', ...headers }
    }),
    
  badRequest: (message: string, details?: any) =>
    new Response(JSON.stringify({
      success: false,
      error: message,
      details,
      timestamp: new Date().toISOString()
    }), { 
      status: StatusCodes.BAD_REQUEST,
      headers: { 'Content-Type': 'application/json' }
    }),
    
  unauthorized: (message: string = 'Unauthorized') =>
    new Response(JSON.stringify({
      success: false,
      error: message,
      timestamp: new Date().toISOString()
    }), { 
      status: StatusCodes.UNAUTHORIZED,
      headers: { 'Content-Type': 'application/json' }
    }),
    
  forbidden: (message: string = 'Access forbidden') =>
    new Response(JSON.stringify({
      success: false,
      error: message,
      timestamp: new Date().toISOString()
    }), {
      status: StatusCodes.FORBIDDEN,
      headers: { 'Content-Type': 'application/json' }
    }),
    
  notFound: (resource: string = 'Resource') =>
    new Response(JSON.stringify({
      success: false,
      error: `${resource} not found`,
      timestamp: new Date().toISOString()
    }), {
      status: StatusCodes.NOT_FOUND,
      headers: { 'Content-Type': 'application/json' }
    }),
    
  conflict: (message: string, details?: any) =>
    new Response(JSON.stringify({
      success: false,
      error: message,
      details,
      timestamp: new Date().toISOString()
    }), {
      status: StatusCodes.CONFLICT,
      headers: { 'Content-Type': 'application/json' }
    }),
    
  rateLimited: (resetTime?: Date, message?: string) =>
    new Response(JSON.stringify({
      success: false,
      error: message || 'Rate limit exceeded',
      resetTime: resetTime?.toISOString(),
      timestamp: new Date().toISOString()
    }), {
      status: StatusCodes.RATE_LIMITED,
      headers: { 'Content-Type': 'application/json' }
    }),
    
  serverError: (message: string = 'Internal server error', details?: any) =>
    new Response(JSON.stringify({
      success: false,
      error: message,
      details: config.IS_DEVELOPMENT ? details : undefined,
      timestamp: new Date().toISOString()
    }), {
      status: StatusCodes.INTERNAL_ERROR,
      headers: { 'Content-Type': 'application/json' }
    }),
};

/**
 * API Route Handler type definitions for consistency
 */
export interface ApiRouteHandler<T = any> {
  (request: NextRequest, userEmail: string, params?: T): Promise<Response>;
}

export interface ApiRouteHandlerDynamic<T = any> {
  (request: NextRequest, userEmail: string, context: { params: Promise<T> }): Promise<Response>;
}

/**
 * Create API route with standardized patterns - consolidates boilerplate
 */
export function createApiRoute<T = any>(
  handler: ApiRouteHandler<T>,
  options: {
    requireAuth?: boolean;
    rateLimiter?: RateLimiter;
    allowDevBypass?: boolean;
    trackTiming?: boolean;
    requireStorage?: boolean;
  } = {}
): (request: NextRequest, context?: { params: T }) => Promise<Response> {
  
  // Build the middleware chain
  let wrappedHandler = handler;
  
  // Add storage initialization if required
  if (options.requireStorage) {
    wrappedHandler = withStorage(wrappedHandler);
  }
  
  // Add rate limiting if specified
  if (options.rateLimiter) {
    wrappedHandler = withRateLimit(options.rateLimiter, wrappedHandler, {
      allowDevBypass: options.allowDevBypass,
      trackTiming: options.trackTiming
    });
  } else if (options.requireAuth) {
    // Add auth if required and no rate limiter (rate limiter includes auth)
    wrappedHandler = withAuth(wrappedHandler, {
      allowDevBypass: options.allowDevBypass,
      trackTiming: options.trackTiming
    });
  }
  
  // Add error handling
  wrappedHandler = withErrorHandler(wrappedHandler);
  
  return async (request: NextRequest, context?: { params: T }) => {
    // Set dynamic behavior for all routes
    const response = await wrappedHandler(request, '', context?.params);
    
    // Ensure consistent response headers
    if (!response.headers.get('Content-Type')) {
      response.headers.set('Content-Type', 'application/json');
    }
    
    return response;
  };
}

/**
 * Create dynamic API route with standardized patterns - consolidates boilerplate
 */
export function createDynamicApiRoute<T = any>(
  handler: ApiRouteHandlerDynamic<T>,
  options: {
    requireAuth?: boolean;
    rateLimiter?: RateLimiter;
    allowDevBypass?: boolean;
    trackTiming?: boolean;
    requireStorage?: boolean;
  } = {}
): (request: NextRequest, context: { params: Promise<T> }) => Promise<Response> {
  
  return async (request: NextRequest, context: { params: Promise<T> }) => {
    const startTime = Date.now();
    
    try {
      // Initialize storage if required
      if (options.requireStorage) {
        await ensureStorageInitialized();
      }
      
      // Handle authentication
      if (options.requireAuth) {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
          return StandardResponses.unauthorized();
        }
        
        // Handle rate limiting if specified
        if (options.rateLimiter && !options.rateLimiter.checkLimit(session.user.email)) {
          const resetTime = options.rateLimiter.getResetTime(session.user.email);
          return StandardResponses.rateLimited(resetTime ? new Date(resetTime) : undefined);
        }
        
        const response = await handler(request, session.user.email, context);
        
        // Add timing header if tracking is enabled
        if (options.trackTiming !== false) {
          response.headers.set('X-Processing-Time', `${Date.now() - startTime}ms`);
        }
        
        return response;
      } else {
        // Non-auth route
        const response = await handler(request, '', context);
        
        // Add timing header if tracking is enabled
        if (options.trackTiming !== false) {
          response.headers.set('X-Processing-Time', `${Date.now() - startTime}ms`);
        }
        
        return response;
      }
      
    } catch (error) {
      // Consistent error handling
      if (error instanceof NextResponse) {
        return error;
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Internal server error';
      return StandardResponses.serverError(errorMessage, config.IS_DEVELOPMENT ? error : undefined);
    }
  };
}

/**
 * Export declarations for Next.js API routes - eliminates repetitive exports
 */
export const createExports = {
  /**
   * Standard exports for non-dynamic routes
   */
  standard: (handlers: {
    GET?: ApiRouteHandler;
    POST?: ApiRouteHandler;
    PUT?: ApiRouteHandler;
    PATCH?: ApiRouteHandler;
    DELETE?: ApiRouteHandler;
  }, options?: {
    requireAuth?: boolean;
    rateLimiter?: RateLimiter;
    allowDevBypass?: boolean;
    trackTiming?: boolean;
    requireStorage?: boolean;
  }) => {
    const exports: any = { dynamic: "force-dynamic" };
    
    Object.entries(handlers).forEach(([method, handler]) => {
      if (handler) {
        exports[method] = createApiRoute(handler, options);
      }
    });
    
    return exports;
  },
  
  /**
   * Standard exports for dynamic routes
   */
  dynamic: <T = any>(handlers: {
    GET?: ApiRouteHandlerDynamic<T>;
    POST?: ApiRouteHandlerDynamic<T>;
    PUT?: ApiRouteHandlerDynamic<T>;
    PATCH?: ApiRouteHandlerDynamic<T>;
    DELETE?: ApiRouteHandlerDynamic<T>;
  }, options?: {
    requireAuth?: boolean;
    rateLimiter?: RateLimiter;
    allowDevBypass?: boolean;
    trackTiming?: boolean;
    requireStorage?: boolean;
  }) => {
    const exports: any = { dynamic: "force-dynamic" };
    
    Object.entries(handlers).forEach(([method, handler]) => {
      if (handler) {
        exports[method] = createDynamicApiRoute(handler, options);
      }
    });
    
    return exports;
  }
};

