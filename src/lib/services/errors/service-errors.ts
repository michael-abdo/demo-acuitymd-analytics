/**
 * Service Layer Error Classes
 * Standardized error types for consistent service-level error handling
 */

/**
 * Base service error class with structured error information
 */
export abstract class ServiceError extends Error {
  public readonly code: string;
  public readonly userMessage: string;
  public readonly context?: Record<string, any>;
  public readonly statusCode: number;
  
  constructor(
    message: string,
    code: string,
    userMessage: string,
    statusCode: number = 500,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.userMessage = userMessage;
    this.statusCode = statusCode;
    this.context = context;
    
    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Validation error - for invalid input data
 */
export class ValidationError extends ServiceError {
  constructor(
    message: string,
    field?: string,
    value?: any,
    context?: Record<string, any>
  ) {
    super(
      message,
      'VALIDATION_ERROR',
      'Invalid input data provided',
      400,
      { field, value, ...context }
    );
  }
}

/**
 * Authorization error - for access control violations
 */
export class AuthorizationError extends ServiceError {
  constructor(
    message: string,
    userId?: string,
    resourceId?: string | number,
    context?: Record<string, any>
  ) {
    super(
      message,
      'AUTHORIZATION_ERROR',
      'Access denied to this resource',
      403,
      { userId, resourceId, ...context }
    );
  }
}

/**
 * Not found error - for missing resources
 */
export class NotFoundError extends ServiceError {
  constructor(
    message: string,
    resourceType?: string,
    resourceId?: string | number,
    context?: Record<string, any>
  ) {
    super(
      message,
      'NOT_FOUND_ERROR',
      'The requested resource was not found',
      404,
      { resourceType, resourceId, ...context }
    );
  }
}

/**
 * Business logic error - for domain rule violations
 */
export class BusinessLogicError extends ServiceError {
  constructor(
    message: string,
    rule?: string,
    context?: Record<string, any>
  ) {
    super(
      message,
      'BUSINESS_LOGIC_ERROR',
      'Operation cannot be completed due to business rules',
      422,
      { rule, ...context }
    );
  }
}

/**
 * Infrastructure error - for external service failures
 */
export class InfrastructureError extends ServiceError {
  constructor(
    message: string,
    service?: string,
    operation?: string,
    context?: Record<string, any>
  ) {
    super(
      message,
      'INFRASTRUCTURE_ERROR',
      'An internal service error occurred',
      500,
      { service, operation, ...context }
    );
  }
}

/**
 * Conflict error - for resource conflicts
 */
export class ConflictError extends ServiceError {
  constructor(
    message: string,
    resourceType?: string,
    conflictField?: string,
    context?: Record<string, any>
  ) {
    super(
      message,
      'CONFLICT_ERROR',
      'Resource conflict detected',
      409,
      { resourceType, conflictField, ...context }
    );
  }
}