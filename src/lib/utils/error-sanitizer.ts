/**
 * Simple Error Sanitization Utility
 * Basic error handling for template - customize per project needs
 */

import { ErrorUtils } from '@/lib/utils';
import { TimestampUtils } from '@/lib/utils';

/**
 * Simple sanitized error interface
 */
export interface SanitizedError {
  message: string;
  code?: string;
  timestamp: string;
  sanitized: boolean;
}

/**
 * Basic error sanitization - customize per project
 */
export class ErrorSanitizer {
  /**
   * Simple error sanitization - removes basic sensitive patterns
   */
  static sanitize(error: any): SanitizedError {
    const message = ErrorUtils.getMessage(error);
    const code = ErrorUtils.getCode(error);
    
    // Basic sanitization - customize patterns per project
    const sanitizedMessage = message
      .replace(/password[=:]\s*[^\s]+/gi, 'password=***')
      .replace(/token[=:]\s*[^\s]+/gi, 'token=***')
      .replace(/key[=:]\s*[^\s]+/gi, 'key=***');

    return {
      message: sanitizedMessage,
      code,
      timestamp: TimestampUtils.now(),
      sanitized: true
    };
  }

  /**
   * Simple user-friendly error message
   */
  static toUserMessage(error: any): string {
    if (ErrorUtils.isError(error)) {
      return 'An error occurred. Please try again.';
    }
    return 'An unexpected error occurred.';
  }

  /**
   * Simple error normalization
   */
  static normalizeError(error: any): Error {
    if (ErrorUtils.isError(error)) {
      return error;
    }
    return new Error(typeof error === 'string' ? error : 'Unknown error');
  }
}

// Export commonly used functions for convenience
export const sanitizeError = ErrorSanitizer.sanitize;
export const normalizeError = ErrorSanitizer.normalizeError;
export const toUserMessage = ErrorSanitizer.toUserMessage;