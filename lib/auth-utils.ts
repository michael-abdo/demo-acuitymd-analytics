import { NextRequest, NextResponse } from "next/server";
import { getOptionalSession } from './dal';
import { ApiErrors, TimestampUtils } from './utils';

/**
 * Consolidated API imports - eliminates duplicate import statements across API routes
 * Re-exports commonly used utilities to create single import source
 */
export { ApiErrors, TimestampUtils, FileValidation } from './utils';
export { Logger } from './services/logger';
export { APP_CONSTANTS, config } from './config';

// NOTE: Server-side authentication is now handled by the DAL (lib/dal.ts)
// Use verifySession() for pages that require auth
// Use getOptionalSession() for optional auth checks

/**
 * Simplified API route authentication wrapper
 * Industry Standard 2025: Single authentication layer using DAL
 * 
 * Returns 401 if user is not authenticated, otherwise calls the handler with the user email.
 */
export function withAuth(
  handler: (request: NextRequest, userEmail: string) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const session = await getOptionalSession();
    
    if (!session?.user?.email) {
      return NextResponse.json({ 
        error: 'Authentication required' 
      }, { status: 401 });
    }
    
    return handler(request, session.user.email);
  };
}

// Removed redundant auth wrapper functions to follow 2025 industry standards
// Use the single withAuth() function and handle specific logic in individual routes

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
 * Development-only access wrapper
 * Blocks access in production environments
 */
export function withDevOnlyAccess<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    if (process.env.NODE_ENV === 'production') {
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
      if (error instanceof NextResponse) {
        // Already a formatted response
        return error;
      } else {
        // Unknown error
        console.error('Unknown API error:', error, context);
        return ApiErrors.serverError(
          error instanceof Error ? error.message : 'An unexpected error occurred'
        );
      }
    }
  };
}

// Removed redundant auth wrapper combinations
// Industry Standard 2025: Use single withAuth() and compose functionality in routes as needed

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






