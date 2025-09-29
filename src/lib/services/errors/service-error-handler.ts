/**
 * Service Error Handler Utility
 * Provides consistent error handling patterns for service layer operations
 */

import { ServiceError } from './service-errors';

/**
 * Configuration for error handling behavior
 */
export interface ErrorHandlerOptions {
  serviceName: string;
  operation: string;
  userId?: string;
  context?: Record<string, any>;
  shouldLog?: boolean;
}

/**
 * Service error handler class that provides consistent error handling patterns
 */
export class ServiceErrorHandler {
  
  /**
   * Wraps a service operation with standardized error handling
   */
  static async withErrorHandling<T>(
    operation: () => Promise<T>,
    options: ErrorHandlerOptions
  ): Promise<T> {
    const { serviceName, operation: operationName, userId, context, shouldLog = true } = options;
    
    try {
      // Execute the operation
      const startTime = Date.now();
      const result = await operation();
      const duration = Date.now() - startTime;
      
      // Log successful operation
      if (shouldLog) {
        console.info(`Service operation completed successfully`, {
          service: serviceName,
          operation: operationName,
          userId,
          duration: `${duration}ms`,
          context
        });
      }
      
      return result;
      
    } catch (error) {
      // Enhanced error logging with context
      const errorContext = {
        service: serviceName,
        operation: operationName,
        userId,
        originalError: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        context
      };
      
      // Log the error with full context
      if (shouldLog) {
        console.error(`Service operation failed`, errorContext);
      }
      
      // If it's already a ServiceError, preserve it with additional context
      if (error instanceof ServiceError) {
        // Create new error with enhanced context (context is readonly)
        const enhancedContext = { ...error.context, ...errorContext };
        const { constructor: ErrorClass } = error;
        // @ts-ignore - Dynamic error construction with enhanced context
        const enhancedError = new ErrorClass(
          error.message,
          error.code,
          error.userMessage,
          error.statusCode,
          enhancedContext
        );
        throw enhancedError;
      }
      
      // If it's a repository error, wrap it appropriately
      if (error instanceof Error) {
        if (error.message.includes('Database operation failed')) {
          // Infrastructure error from repository layer
          const { InfrastructureError } = require('./service-errors');
          throw new InfrastructureError(
            `${serviceName} operation failed: ${operationName}`,
            'database',
            operationName,
            errorContext
          );
        }
        
        if (error.message.includes('not found')) {
          // Not found error
          const { NotFoundError } = require('./service-errors');
          throw new NotFoundError(
            error.message,
            serviceName.replace('Service', '').toLowerCase(),
            context?.resourceId,
            errorContext
          );
        }
        
        if (error.message.includes('Access denied')) {
          // Authorization error
          const { AuthorizationError } = require('./service-errors');
          throw new AuthorizationError(
            error.message,
            userId,
            context?.resourceId,
            errorContext
          );
        }
      }
      
      // Default: wrap as infrastructure error
      const { InfrastructureError } = require('./service-errors');
      throw new InfrastructureError(
        `Unexpected error in ${serviceName}.${operationName}`,
        serviceName,
        operationName,
        errorContext
      );
    }
  }
  
  /**
   * Validates input data and throws ValidationError if invalid
   */
  static validateRequired(
    value: any,
    fieldName: string,
    context?: Record<string, any>
  ): void {
    if (value === undefined || value === null) {
      const { ValidationError } = require('./service-errors');
      throw new ValidationError(
        `${fieldName} is required`,
        fieldName,
        value,
        context
      );
    }
    
    if (typeof value === 'string' && value.trim() === '') {
      const { ValidationError } = require('./service-errors');
      throw new ValidationError(
        `${fieldName} cannot be empty`,
        fieldName,
        value,
        context
      );
    }
  }
  
  /**
   * Validates numeric input
   */
  static validateNumeric(
    value: any,
    fieldName: string,
    min?: number,
    max?: number,
    context?: Record<string, any>
  ): void {
    if (typeof value !== 'number' || isNaN(value)) {
      const { ValidationError } = require('./service-errors');
      throw new ValidationError(
        `${fieldName} must be a valid number`,
        fieldName,
        value,
        context
      );
    }
    
    if (min !== undefined && value < min) {
      const { ValidationError } = require('./service-errors');
      throw new ValidationError(
        `${fieldName} must be at least ${min}`,
        fieldName,
        value,
        { min, max, ...context }
      );
    }
    
    if (max !== undefined && value > max) {
      const { ValidationError } = require('./service-errors');
      throw new ValidationError(
        `${fieldName} must be at most ${max}`,
        fieldName,
        value,
        { min, max, ...context }
      );
    }
  }
  
  /**
   * Validates string input with length constraints
   */
  static validateString(
    value: any,
    fieldName: string,
    minLength?: number,
    maxLength?: number,
    context?: Record<string, any>
  ): void {
    if (typeof value !== 'string') {
      const { ValidationError } = require('./service-errors');
      throw new ValidationError(
        `${fieldName} must be a string`,
        fieldName,
        value,
        context
      );
    }
    
    if (minLength !== undefined && value.length < minLength) {
      const { ValidationError } = require('./service-errors');
      throw new ValidationError(
        `${fieldName} must be at least ${minLength} characters`,
        fieldName,
        value,
        { minLength, maxLength, ...context }
      );
    }
    
    if (maxLength !== undefined && value.length > maxLength) {
      const { ValidationError } = require('./service-errors');
      throw new ValidationError(
        `${fieldName} must be at most ${maxLength} characters`,
        fieldName,
        value,
        { minLength, maxLength, ...context }
      );
    }
  }
  
  /**
   * Validates enum values
   */
  static validateEnum(
    value: any,
    fieldName: string,
    allowedValues: string[],
    context?: Record<string, any>
  ): void {
    if (!allowedValues.includes(value)) {
      const { ValidationError } = require('./service-errors');
      throw new ValidationError(
        `${fieldName} must be one of: ${allowedValues.join(', ')}`,
        fieldName,
        value,
        { allowedValues, ...context }
      );
    }
  }
  
  /**
   * Checks ownership/authorization for a resource
   */
  static checkOwnership(
    resourceUserId: string,
    currentUserId: string,
    resourceType: string,
    resourceId: string | number,
    context?: Record<string, any>
  ): void {
    if (resourceUserId !== currentUserId) {
      const { AuthorizationError } = require('./service-errors');
      throw new AuthorizationError(
        `Access denied: ${resourceType} does not belong to user`,
        currentUserId,
        resourceId,
        { resourceUserId, resourceType, ...context }
      );
    }
  }
  
  /**
   * Checks if a resource exists
   */
  static checkExists(
    resource: any,
    resourceType: string,
    resourceId: string | number,
    context?: Record<string, any>
  ): void {
    if (!resource) {
      const { NotFoundError } = require('./service-errors');
      throw new NotFoundError(
        `${resourceType} not found`,
        resourceType,
        resourceId,
        context
      );
    }
  }
}