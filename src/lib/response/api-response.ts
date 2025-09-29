/**
 * API Response Utilities
 * Standardized response creation for consistent API behavior
 */

import { NextResponse } from 'next/server';
import { ApiResponse, ApiError, ResponseMeta } from './types';

export class ApiResponseUtil {
  static success<T>(data: T, meta?: Partial<ResponseMeta>, status: number = 200): NextResponse {
    const response: ApiResponse<T> = {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta
      }
    };
    
    return NextResponse.json(response, { status });
  }

  static error(error: ApiError, status: number = 400): NextResponse {
    const response: ApiResponse = {
      success: false,
      error,
      meta: {
        timestamp: new Date().toISOString()
      }
    };
    
    return NextResponse.json(response, { status });
  }

  static notFound(message: string = 'Resource not found'): NextResponse {
    return this.error({
      code: 'NOT_FOUND',
      message
    }, 404);
  }

  static unauthorized(message: string = 'Unauthorized'): NextResponse {
    return this.error({
      code: 'UNAUTHORIZED',
      message
    }, 401);
  }

  static forbidden(message: string = 'Forbidden'): NextResponse {
    return this.error({
      code: 'FORBIDDEN',
      message
    }, 403);
  }

  static validationError(message: string, field?: string): NextResponse {
    return this.error({
      code: 'VALIDATION_ERROR',
      message,
      field
    }, 400);
  }

  static internalError(message: string = 'Internal server error'): NextResponse {
    return this.error({
      code: 'INTERNAL_ERROR',
      message
    }, 500);
  }
}