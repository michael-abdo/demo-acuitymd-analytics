/**
 * Input Validator and Sanitization Utility
 * 
 * Centralizes input validation, parsing, and sanitization patterns.
 * Eliminates ~40 lines of duplicated validation logic across API routes.
 * 
 * Provides type-safe input validation with consistent error messages
 * and fallback values for robust API handling.
 */

import { APP_CONSTANTS } from '@/lib/config';

/**
 * Validation result interface
 */
export interface ValidationResult<T> {
  isValid: boolean;
  value: T;
  error?: string;
  sanitized?: boolean;
}

/**
 * Validation options for different input types
 */
export interface ValidationOptions {
  required?: boolean;
  min?: number;
  max?: number;
  trim?: boolean;
  fallback?: any;
  allowEmpty?: boolean;
}

/**
 * Email validation result
 */
export interface EmailValidationResult extends ValidationResult<string> {
  domain?: string;
  localPart?: string;
}

/**
 * Pagination parameters with validation
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
  offset: number;
  isValid: boolean;
  errors: string[];
}

/**
 * Centralized Input Validator
 */
export class InputValidator {
  
  /**
   * Validate and parse integer with bounds checking
   * Consolidates parseInt patterns from request-parser.ts and API routes
   */
  static parseInteger(
    value: string | number | null | undefined,
    options: {
      min?: number;
      max?: number;
      fallback?: number;
      fieldName?: string;
    } = {}
  ): ValidationResult<number> {
    const { min = -Infinity, max = Infinity, fallback, fieldName = 'value' } = options;
    
    // Handle null/undefined
    if (value == null) {
      if (fallback !== undefined) {
        return { isValid: true, value: fallback };
      }
      return { isValid: false, value: 0, error: `${fieldName} is required` };
    }
    
    // Convert to number
    const parsed = typeof value === 'number' ? value : parseInt(String(value), 10);
    
    // Check if parsing failed
    if (isNaN(parsed)) {
      if (fallback !== undefined) {
        return { isValid: true, value: fallback };
      }
      return { isValid: false, value: 0, error: `${fieldName} must be a valid number` };
    }
    
    // Apply bounds checking
    const bounded = Math.max(min, Math.min(max, parsed));
    
    return {
      isValid: true,
      value: bounded,
      sanitized: bounded !== parsed
    };
  }
  
  /**
   * Validate and parse float with bounds checking
   */
  static parseFloat(
    value: string | number | null | undefined,
    options: {
      min?: number;
      max?: number;
      fallback?: number;
      fieldName?: string;
      precision?: number;
    } = {}
  ): ValidationResult<number> {
    const { min = -Infinity, max = Infinity, fallback, fieldName = 'value', precision } = options;
    
    // Handle null/undefined
    if (value == null) {
      if (fallback !== undefined) {
        return { isValid: true, value: fallback };
      }
      return { isValid: false, value: 0, error: `${fieldName} is required` };
    }
    
    // Convert to number
    const parsed = typeof value === 'number' ? value : parseFloat(String(value));
    
    // Check if parsing failed
    if (isNaN(parsed)) {
      if (fallback !== undefined) {
        return { isValid: true, value: fallback };
      }
      return { isValid: false, value: 0, error: `${fieldName} must be a valid number` };
    }
    
    // Apply precision if specified
    let result = parsed;
    if (precision !== undefined) {
      result = Math.round(parsed * Math.pow(10, precision)) / Math.pow(10, precision);
    }
    
    // Apply bounds checking
    result = Math.max(min, Math.min(max, result));
    
    return {
      isValid: true,
      value: result,
      sanitized: result !== parsed
    };
  }
  
  /**
   * Validate document ID
   * Consolidates document ID validation patterns
   */
  static validateDocumentId(
    id: string | number | null | undefined,
    fieldName: string = 'documentId'
  ): ValidationResult<number> {
    return this.parseInteger(id, {
      min: 1,
      fieldName,
      fallback: undefined // Document IDs should not have fallbacks
    });
  }
  
  /**
   * Validate pagination parameters
   * Consolidates pagination parsing from request-parser.ts
   */
  static validatePagination(
    params: URLSearchParams | Record<string, string>
  ): PaginationParams {
    const errors: string[] = [];
    
    // Get values from either URLSearchParams or plain object
    const getValue = (key: string) => {
      if (params instanceof URLSearchParams) {
        return params.get(key);
      }
      return params[key];
    };
    
    // Validate page (min: 1, max: 1000, default: 1)
    const pageResult = this.parseInteger(getValue('page'), {
      min: 1,
      max: 1000,
      fallback: 1,
      fieldName: 'page'
    });
    
    // Validate pageSize (min: 1, max: 100, default: 10)
    const pageSizeResult = this.parseInteger(getValue('pageSize'), {
      min: 1,
      max: 100,
      fallback: 10,
      fieldName: 'pageSize'
    });
    
    if (!pageResult.isValid) errors.push(pageResult.error!);
    if (!pageSizeResult.isValid) errors.push(pageSizeResult.error!);
    
    const page = pageResult.value;
    const pageSize = pageSizeResult.value;
    const offset = (page - 1) * pageSize;
    
    return {
      page,
      pageSize,
      offset,
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Validate string input with sanitization
   */
  static validateString(
    value: string | null | undefined,
    options: {
      required?: boolean;
      minLength?: number;
      maxLength?: number;
      trim?: boolean;
      allowEmpty?: boolean;
      pattern?: RegExp;
      fieldName?: string;
      fallback?: string;
    } = {}
  ): ValidationResult<string> {
    const {
      required = false,
      minLength = 0,
      maxLength = Infinity,
      trim = true,
      allowEmpty = false,
      pattern,
      fieldName = 'value',
      fallback
    } = options;
    
    // Handle null/undefined
    if (value == null) {
      if (fallback !== undefined) {
        return { isValid: true, value: fallback };
      }
      if (!required) {
        return { isValid: true, value: '' };
      }
      return { isValid: false, value: '', error: `${fieldName} is required` };
    }
    
    // Sanitize by trimming if requested
    let sanitized = trim ? String(value).trim() : String(value);
    const wasSanitized = sanitized !== String(value);
    
    // Check empty after trimming
    if (!allowEmpty && sanitized.length === 0) {
      if (fallback !== undefined) {
        return { isValid: true, value: fallback };
      }
      if (required) {
        return { isValid: false, value: sanitized, error: `${fieldName} cannot be empty` };
      }
    }
    
    // Check length constraints
    if (sanitized.length < minLength) {
      return { 
        isValid: false, 
        value: sanitized, 
        error: `${fieldName} must be at least ${minLength} characters` 
      };
    }
    
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }
    
    // Check pattern if provided
    if (pattern && !pattern.test(sanitized)) {
      return { 
        isValid: false, 
        value: sanitized, 
        error: `${fieldName} format is invalid` 
      };
    }
    
    return {
      isValid: true,
      value: sanitized,
      sanitized: wasSanitized || sanitized.length > maxLength
    };
  }
  
  /**
   * Validate email address
   */
  static validateEmail(
    email: string | null | undefined,
    options: {
      required?: boolean;
      allowEmpty?: boolean;
      fieldName?: string;
    } = {}
  ): EmailValidationResult {
    const { required = false, allowEmpty = false, fieldName = 'email' } = options;
    
    // Basic string validation first
    const stringResult = this.validateString(email, {
      required,
      allowEmpty,
      trim: true,
      fieldName
    });
    
    if (!stringResult.isValid) {
      return {
        isValid: false,
        value: stringResult.value,
        error: stringResult.error
      };
    }
    
    const emailValue = stringResult.value;
    
    // If empty and allowed, return valid
    if (emailValue === '' && allowEmpty) {
      return { isValid: true, value: emailValue };
    }
    
    // Email regex pattern
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailPattern.test(emailValue)) {
      return {
        isValid: false,
        value: emailValue,
        error: `${fieldName} must be a valid email address`
      };
    }
    
    // Extract domain and local part
    const [localPart, domain] = emailValue.split('@');
    
    return {
      isValid: true,
      value: emailValue.toLowerCase(), // Normalize email to lowercase
      domain: domain.toLowerCase(),
      localPart,
      sanitized: emailValue !== emailValue.toLowerCase()
    };
  }
  
  /**
   * Validate boolean input from various formats
   */
  static validateBoolean(
    value: string | boolean | number | null | undefined,
    options: {
      fieldName?: string;
      fallback?: boolean;
    } = {}
  ): ValidationResult<boolean> {
    const { fieldName = 'value', fallback } = options;
    
    // Handle null/undefined
    if (value == null) {
      if (fallback !== undefined) {
        return { isValid: true, value: fallback };
      }
      return { isValid: false, value: false, error: `${fieldName} is required` };
    }
    
    // Handle boolean
    if (typeof value === 'boolean') {
      return { isValid: true, value };
    }
    
    // Handle string representations
    if (typeof value === 'string') {
      const lower = value.toLowerCase().trim();
      if (['true', '1', 'yes', 'on'].includes(lower)) {
        return { isValid: true, value: true, sanitized: true };
      }
      if (['false', '0', 'no', 'off', ''].includes(lower)) {
        return { isValid: true, value: false, sanitized: true };
      }
    }
    
    // Handle numbers
    if (typeof value === 'number') {
      return { isValid: true, value: Boolean(value), sanitized: true };
    }
    
    // Invalid format
    if (fallback !== undefined) {
      return { isValid: true, value: fallback, sanitized: true };
    }
    
    return {
      isValid: false,
      value: false,
      error: `${fieldName} must be a valid boolean value`
    };
  }
  
  /**
   * Validate URL
   */
  static validateUrl(
    url: string | null | undefined,
    options: {
      required?: boolean;
      allowedProtocols?: string[];
      fieldName?: string;
    } = {}
  ): ValidationResult<string> {
    const { required = false, allowedProtocols = ['http', 'https'], fieldName = 'url' } = options;
    
    // Basic string validation
    const stringResult = this.validateString(url, {
      required,
      trim: true,
      fieldName
    });
    
    if (!stringResult.isValid) {
      return {
        isValid: false,
        value: stringResult.value,
        error: stringResult.error
      };
    }
    
    const urlValue = stringResult.value;
    
    // If empty and not required, return valid
    if (urlValue === '' && !required) {
      return { isValid: true, value: urlValue };
    }
    
    try {
      const parsed = new URL(urlValue);
      
      // Check allowed protocols
      if (!allowedProtocols.includes(parsed.protocol.replace(':', ''))) {
        return {
          isValid: false,
          value: urlValue,
          error: `${fieldName} must use one of: ${allowedProtocols.join(', ')}`
        };
      }
      
      return { isValid: true, value: parsed.toString() };
    } catch {
      return {
        isValid: false,
        value: urlValue,
        error: `${fieldName} must be a valid URL`
      };
    }
  }
  
  /**
   * Sanitize HTML to prevent XSS
   * Basic sanitization - in production, consider using a library like DOMPurify
   */
  static sanitizeHtml(
    html: string | null | undefined,
    options: {
      allowedTags?: string[];
      stripTags?: boolean;
      fieldName?: string;
    } = {}
  ): ValidationResult<string> {
    const { allowedTags = [], stripTags = true, fieldName = 'html' } = options;
    
    if (html == null) {
      return { isValid: true, value: '' };
    }
    
    let sanitized = String(html);
    
    if (stripTags) {
      // Basic HTML tag removal (for production, use a proper HTML sanitizer)
      sanitized = sanitized.replace(/<[^>]*>/g, '');
    }
    
    // Remove potential script injections
    sanitized = sanitized
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/<script[^>]*>.*?<\/script>/gi, '');
    
    return {
      isValid: true,
      value: sanitized,
      sanitized: sanitized !== String(html)
    };
  }
  
  /**
   * Validate file size
   */
  static validateFileSize(
    size: number | string | null | undefined,
    options: {
      maxSize?: number;
      fieldName?: string;
    } = {}
  ): ValidationResult<number> {
    const { maxSize = APP_CONSTANTS.FILE_LIMITS.MAX_SIZE, fieldName = 'fileSize' } = options;
    
    const sizeResult = this.parseInteger(size, {
      min: 0,
      fieldName
    });
    
    if (!sizeResult.isValid) {
      return sizeResult;
    }
    
    if (sizeResult.value > maxSize) {
      return {
        isValid: false,
        value: sizeResult.value,
        error: `${fieldName} exceeds maximum allowed size of ${maxSize} bytes`
      };
    }
    
    return { isValid: true, value: sizeResult.value };
  }
  
  /**
   * Validate array input
   */
  static validateArray<T>(
    value: any,
    itemValidator: (item: any, index: number) => ValidationResult<T>,
    options: {
      minItems?: number;
      maxItems?: number;
      fieldName?: string;
    } = {}
  ): ValidationResult<T[]> {
    const { minItems = 0, maxItems = Infinity, fieldName = 'array' } = options;
    
    if (!Array.isArray(value)) {
      return {
        isValid: false,
        value: [],
        error: `${fieldName} must be an array`
      };
    }
    
    if (value.length < minItems) {
      return {
        isValid: false,
        value: [],
        error: `${fieldName} must have at least ${minItems} items`
      };
    }
    
    if (value.length > maxItems) {
      return {
        isValid: false,
        value: [],
        error: `${fieldName} cannot have more than ${maxItems} items`
      };
    }
    
    const validatedItems: T[] = [];
    const errors: string[] = [];
    
    for (let i = 0; i < value.length; i++) {
      const itemResult = itemValidator(value[i], i);
      if (itemResult.isValid) {
        validatedItems.push(itemResult.value);
      } else {
        errors.push(`Item ${i}: ${itemResult.error}`);
      }
    }
    
    if (errors.length > 0) {
      return {
        isValid: false,
        value: validatedItems,
        error: `${fieldName} validation failed: ${errors.join(', ')}`
      };
    }
    
    return { isValid: true, value: validatedItems };
  }
}

/**
 * Convenience functions for common validation patterns
 */
export const Validators = {
  /**
   * Quick document ID validation
   */
  documentId: (id: any) => InputValidator.validateDocumentId(id),
  
  /**
   * Quick pagination validation  
   */
  pagination: (params: URLSearchParams | Record<string, string>) => 
    InputValidator.validatePagination(params),
    
  /**
   * Quick email validation
   */
  email: (email: any) => InputValidator.validateEmail(email, { required: true }),
  
  /**
   * Quick required string validation
   */
  requiredString: (value: any, fieldName: string) => 
    InputValidator.validateString(value, { required: true, fieldName }),
    
  /**
   * Quick optional string validation
   */
  optionalString: (value: any, fieldName: string) => 
    InputValidator.validateString(value, { required: false, fieldName }),
    
  /**
   * Quick boolean validation with default
   */
  booleanWithDefault: (value: any, defaultValue: boolean) => 
    InputValidator.validateBoolean(value, { fallback: defaultValue }),
    
  /**
   * Quick positive integer validation
   */
  positiveInteger: (value: any, fieldName: string) => 
    InputValidator.parseInteger(value, { min: 1, fieldName }),
    
  /**
   * Quick non-negative integer validation
   */
  nonNegativeInteger: (value: any, fieldName: string) => 
    InputValidator.parseInteger(value, { min: 0, fieldName })
};