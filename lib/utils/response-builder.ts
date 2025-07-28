/**
 * ResponseBuilder Utility
 * 
 * Consolidates all API response patterns into a single, consistent interface.
 * Eliminates ~50+ lines of duplicated response construction patterns across routes.
 * Provides standardized structure, metadata handling, and timing information.
 */

import { NextResponse } from 'next/server';
import { TimestampUtils } from '@/lib/utils';

/**
 * Standard response structure for all API endpoints
 */
export interface StandardApiResponse<T = any> {
  success: boolean;
  operation?: string;
  status?: ResponseStatus;
  message?: string;
  data?: T;
  metadata?: Record<string, any>;
  warnings?: string[];
  errors?: string[];
  timestamp?: string;
  timing?: {
    duration: string;
    operations?: Record<string, number>;
  };
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Response status types
 */
export type ResponseStatus = 
  | 'success' | 'created' | 'updated' | 'deleted' | 'queued' | 'processing'
  | 'completed' | 'failed' | 'partial' | 'pending' | 'cancelled' | 'error';

/**
 * HTTP status code mappings for response statuses
 */
const STATUS_CODES: Record<ResponseStatus, number> = {
  success: 200,
  created: 201,
  updated: 200,
  deleted: 200,
  queued: 202,
  processing: 202,
  completed: 200,
  failed: 500,
  partial: 206,
  pending: 202,
  cancelled: 200,
  error: 500
};

/**
 * Response builder options
 */
export interface ResponseOptions<T = any> {
  data?: T;
  message?: string;
  status?: ResponseStatus;
  httpStatus?: number;
  metadata?: Record<string, any>;
  warnings?: string[];
  errors?: string[];
  operation?: string;
  timing?: {
    start: number;
    operations?: Record<string, number>;
  };
  headers?: Record<string, string>;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages?: number;
  };
}

/**
 * Error response options
 */
export interface ErrorResponseOptions {
  message?: string;
  code?: string;
  statusCode?: number;
  details?: any;
  suggestion?: string;
  context?: Record<string, any>;
  operation?: string;
}

/**
 * File response options
 */
export interface FileResponseOptions {
  filename?: string;
  contentType?: string;
  disposition?: 'inline' | 'attachment';
  cacheControl?: string;
  lastModified?: Date;
  etag?: string;
}

/**
 * Centralized Response Builder
 */
export class ResponseBuilder {
  
  /**
   * Build a successful response
   */
  static success<T>(options: ResponseOptions<T> = {}): NextResponse<StandardApiResponse<T>> {
    return this.buildResponse({
      ...options,
      status: options.status || 'success'
    });
  }
  
  /**
   * Build a created response (201)
   */
  static created<T>(data: T, options: Omit<ResponseOptions<T>, 'data'> = {}): NextResponse<StandardApiResponse<T>> {
    return this.buildResponse({
      ...options,
      data,
      status: 'created',
      message: options.message || 'Resource created successfully'
    });
  }
  
  /**
   * Build an updated response
   */
  static updated<T>(data: T, options: Omit<ResponseOptions<T>, 'data'> = {}): NextResponse<StandardApiResponse<T>> {
    return this.buildResponse({
      ...options,
      data,
      status: 'updated',
      message: options.message || 'Resource updated successfully'
    });
  }
  
  /**
   * Build a deleted response
   */
  static deleted(options: ResponseOptions = {}): NextResponse<StandardApiResponse<void>> {
    return this.buildResponse({
      ...options,
      status: 'deleted',
      message: options.message || 'Resource deleted successfully'
    });
  }
  
  /**
   * Build a list response with pagination
   */
  static list<T>(
    items: T[], 
    pagination?: { page: number; pageSize: number; total: number },
    options: Omit<ResponseOptions<T[]>, 'data' | 'pagination'> = {}
  ): NextResponse<StandardApiResponse<T[]>> {
    const responseData: ResponseOptions<T[]> = {
      ...options,
      data: items,
      metadata: {
        count: items.length,
        ...options.metadata
      }
    };
    
    if (pagination) {
      responseData.pagination = {
        ...pagination,
        totalPages: Math.ceil(pagination.total / pagination.pageSize)
      };
    }
    
    return this.buildResponse(responseData);
  }
  
  /**
   * Build a queued/async response (202)
   */
  static queued<T>(data: T, options: Omit<ResponseOptions<T>, 'data'> = {}): NextResponse<StandardApiResponse<T>> {
    return this.buildResponse({
      ...options,
      data,
      status: 'queued',
      httpStatus: 202,
      message: options.message || 'Request queued for processing'
    });
  }
  
  /**
   * Build a processing response (202)
   */
  static processing<T>(data: T, options: Omit<ResponseOptions<T>, 'data'> = {}): NextResponse<StandardApiResponse<T>> {
    return this.buildResponse({
      ...options,
      data,
      status: 'processing',
      httpStatus: 202,
      message: options.message || 'Request is being processed'
    });
  }
  
  /**
   * Build a partial success response (206)
   */
  static partial<T>(data: T, warnings: string[], options: Omit<ResponseOptions<T>, 'data' | 'warnings'> = {}): NextResponse<StandardApiResponse<T>> {
    return this.buildResponse({
      ...options,
      data,
      warnings,
      status: 'partial',
      httpStatus: 206,
      message: options.message || 'Request completed with warnings'
    });
  }
  
  /**
   * Build an operation-specific response
   */
  static operation<T>(operationName: string, options: ResponseOptions<T> = {}): NextResponse<StandardApiResponse<T>> {
    return this.buildResponse({
      ...options,
      operation: operationName,
      message: options.message || this.getOperationMessage(operationName, options.status || 'success')
    });
  }
  
  /**
   * Build an error response
   */
  static error(options: ErrorResponseOptions): NextResponse<StandardApiResponse<void>> {
    const {
      message = 'An error occurred',
      code = 'INTERNAL_ERROR',
      statusCode = 500,
      details,
      suggestion,
      context,
      operation
    } = options;
    
    const response: StandardApiResponse<void> = {
      success: false,
      status: 'error',
      message,
      timestamp: TimestampUtils.now(),
      errors: [message],
      metadata: {
        code,
        ...(suggestion && { suggestion }),
        ...(context && { context }),
        ...(details && { details })
      }
    };
    
    if (operation) {
      response.operation = operation;
    }
    
    return NextResponse.json(response, { status: statusCode });
  }
  
  /**
   * Build a validation error response (400)
   */
  static validationError(message: string, errors: string[] = [], options: Partial<ErrorResponseOptions> = {}): NextResponse<StandardApiResponse<void>> {
    return this.error({
      ...options,
      message,
      code: 'VALIDATION_ERROR',
      statusCode: 400,
      details: { validationErrors: errors }
    });
  }
  
  /**
   * Build a not found response (404)
   */
  static notFound(resource: string = 'Resource', options: Partial<ErrorResponseOptions> = {}): NextResponse<StandardApiResponse<void>> {
    return this.error({
      ...options,
      message: options.message || `${resource} not found`,
      code: 'NOT_FOUND',
      statusCode: 404
    });
  }
  
  /**
   * Build an unauthorized response (401)
   */
  static unauthorized(message: string = 'Unauthorized', options: Partial<ErrorResponseOptions> = {}): NextResponse<StandardApiResponse<void>> {
    return this.error({
      ...options,
      message,
      code: 'UNAUTHORIZED',
      statusCode: 401
    });
  }
  
  /**
   * Build a forbidden response (403)
   */
  static forbidden(message: string = 'Forbidden', options: Partial<ErrorResponseOptions> = {}): NextResponse<StandardApiResponse<void>> {
    return this.error({
      ...options,
      message,
      code: 'FORBIDDEN',
      statusCode: 403
    });
  }
  
  /**
   * Build a server error response (500)
   */
  static serverError(message: string = 'Internal server error', options: Partial<ErrorResponseOptions> = {}): NextResponse<StandardApiResponse<void>> {
    return this.error({
      ...options,
      message,
      code: 'INTERNAL_ERROR',
      statusCode: 500
    });
  }
  
  /**
   * Build a file download response
   */
  static file(
    fileData: Buffer | Uint8Array | string,
    options: FileResponseOptions = {}
  ): NextResponse {
    const {
      filename,
      contentType = 'application/octet-stream',
      disposition = 'attachment',
      cacheControl,
      lastModified,
      etag
    } = options;
    
    const headers: Record<string, string> = {
      'Content-Type': contentType
    };
    
    if (filename) {
      headers['Content-Disposition'] = `${disposition}; filename="${filename}"`;
    }
    
    if (cacheControl) {
      headers['Cache-Control'] = cacheControl;
    }
    
    if (lastModified) {
      headers['Last-Modified'] = lastModified.toUTCString();
    }
    
    if (etag) {
      headers['ETag'] = etag;
    }
    
    return new NextResponse(fileData, { headers });
  }
  
  /**
   * Build a redirect response
   */
  static redirect(url: string, permanent: boolean = false): NextResponse {
    return NextResponse.redirect(url, { status: permanent ? 301 : 302 });
  }
  
  /**
   * Build a no content response (204)
   */
  static noContent(): NextResponse {
    return new NextResponse(null, { status: 204 });
  }
  
  /**
   * Build response with custom headers
   */
  static withHeaders<T>(
    response: NextResponse<T>,
    headers: Record<string, string>
  ): NextResponse<T> {
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }
  
  /**
   * Core response building method
   */
  private static buildResponse<T>(options: ResponseOptions<T>): NextResponse<StandardApiResponse<T>> {
    const {
      data,
      message,
      status = 'success',
      httpStatus,
      metadata = {},
      warnings = [],
      errors = [],
      operation,
      timing,
      headers = {},
      pagination
    } = options;
    
    const response: StandardApiResponse<T> = {
      success: true,
      timestamp: TimestampUtils.now()
    };
    
    // Add operation name
    if (operation) {
      response.operation = operation;
    }
    
    // Add status
    response.status = status;
    
    // Add message
    if (message) {
      response.message = message;
    }
    
    // Add data
    if (data !== undefined) {
      response.data = data;
    }
    
    // Add metadata
    if (Object.keys(metadata).length > 0) {
      response.metadata = metadata;
    }
    
    // Add pagination
    if (pagination) {
      response.pagination = {
        ...pagination,
        totalPages: Math.ceil(pagination.total / pagination.pageSize)
      };
    }
    
    // Add warnings
    if (warnings.length > 0) {
      response.warnings = warnings;
    }
    
    // Add errors (for partial success scenarios)
    if (errors.length > 0) {
      response.errors = errors;
    }
    
    // Add timing information
    if (timing) {
      const duration = Date.now() - timing.start;
      response.timing = {
        duration: `${duration}ms`,
        operations: timing.operations
      };
    }
    
    // Determine HTTP status code
    const statusCode = httpStatus || STATUS_CODES[status] || 200;
    
    // Create NextResponse
    const nextResponse = NextResponse.json(response, { status: statusCode });
    
    // Add custom headers
    Object.entries(headers).forEach(([key, value]) => {
      nextResponse.headers.set(key, value);
    });
    
    return nextResponse;
  }
  
  /**
   * Generate operation-specific messages
   */
  private static getOperationMessage(operationName: string, status: ResponseStatus): string {
    const [resource, action] = operationName.split('.');
    
    const messages: Record<string, Record<string, string>> = {
      document: {
        success: 'Document operation completed successfully',
        created: 'Document uploaded successfully',
        updated: 'Document updated successfully',
        deleted: 'Document deleted successfully',
        queued: 'Document processing queued',
        processing: 'Document is being processed',
        completed: 'Document processing completed'
      },
      comparison: {
        success: 'Comparison completed successfully',
        created: 'Comparison created successfully',
        updated: 'Comparison updated successfully',
        completed: 'Document comparison completed',
        processing: 'Documents are being compared',
        queued: 'Comparison queued for processing'
      },
      queue: {
        success: 'Queue operation completed successfully',
        processing: 'Task is being processed',
        completed: 'Task completed successfully',
        failed: 'Task failed to complete',
        queued: 'Task queued for processing'
      },
      extraction: {
        success: 'Text extraction completed successfully',
        queued: 'Text extraction queued',
        processing: 'Text is being extracted',
        completed: 'Text extraction completed'
      },
      upload: {
        success: 'File uploaded successfully',
        created: 'File uploaded and saved',
        processing: 'File is being processed'
      },
      health: {
        success: 'Health check passed',
        partial: 'Service partially healthy',
        failed: 'Health check failed'
      }
    };
    
    return messages[resource]?.[status] || 
           messages[resource]?.success || 
           `${resource} ${action} ${status}`;
  }
}

/**
 * Domain-specific response builders
 */
export const DocumentResponse = {
  uploaded: <T>(document: T, metadata?: Record<string, any>) => 
    ResponseBuilder.operation('document.upload', {
      data: document,
      metadata,
      status: 'created'
    }),
    
  listed: <T>(documents: T[], pagination?: { page: number; pageSize: number; total: number }) =>
    ResponseBuilder.operation('document.list', {
      data: documents,
      pagination,
      metadata: { count: documents.length }
    }),
    
  extracted: <T>(document: T, extractedText: string) =>
    ResponseBuilder.operation('document.extract', {
      data: document,
      metadata: {
        textLength: extractedText.length,
        hasContent: extractedText.length > 0
      },
      status: 'completed'
    }),
    
  updated: <T>(document: T, updatedFields: string[] = []) =>
    ResponseBuilder.operation('document.update', {
      data: document,
      metadata: { updatedFields },
      status: 'updated'
    }),
    
  deleted: (documentId: string | number) =>
    ResponseBuilder.operation('document.delete', {
      data: { deletedId: documentId },
      status: 'deleted'
    })
};

export const ComparisonResponse = {
  created: <T>(comparison: T, metadata?: Record<string, any>) =>
    ResponseBuilder.operation('comparison.create', {
      data: comparison,
      metadata,
      status: 'created'
    }),
    
  completed: <T>(comparison: T, differences: number) =>
    ResponseBuilder.operation('comparison.update', {
      data: comparison,
      metadata: {
        differencesFound: differences,
        status: 'completed'
      },
      status: 'completed'
    })
};

export const QueueResponse = {
  processed: <T>(task: T, processingTime: number) =>
    ResponseBuilder.operation('queue.process', {
      data: task,
      metadata: { processingTime: `${processingTime}ms` },
      status: 'completed'
    }),
    
  queued: <T>(task: T, queuePosition?: number) =>
    ResponseBuilder.operation('queue.process', {
      data: task,
      metadata: queuePosition ? { queuePosition } : {},
      status: 'queued'
    }),
    
  stats: (stats: any) =>
    ResponseBuilder.operation('queue.status', {
      data: stats,
      metadata: {
        timestamp: TimestampUtils.now(),
        totalTasks: stats.total
      }
    })
};

export const HealthResponse = {
  ok: (service: string, metadata?: Record<string, any>) =>
    ResponseBuilder.operation('health.check', {
      metadata: {
        service,
        status: 'healthy',
        ...metadata
      }
    }),
    
  degraded: (service: string, issues: string[]) =>
    ResponseBuilder.operation('health.check', {
      metadata: {
        service,
        status: 'degraded'
      },
      warnings: issues,
      status: 'partial'
    })
};

/**
 * Convenience exports for common patterns
 */
export const Response = ResponseBuilder;
export { ResponseBuilder as ApiResponseBuilder };