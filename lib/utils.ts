import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { NextResponse } from "next/server"
import { APP_CONSTANTS } from './config'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Centralized API error response utilities for consistent error handling
 * Uses centralized messages from APP_CONSTANTS.MESSAGES
 */
export const ApiErrors = {
  unauthorized: () => NextResponse.json({ error: APP_CONSTANTS.MESSAGES.ERROR.UNAUTHORIZED }, { status: 401 }),
  notFound: (resource: string) => NextResponse.json({ error: `${resource} not found` }, { status: 404 }),
  badRequest: (message: string) => NextResponse.json({ error: message }, { status: 400 }),
  serverError: (message: string) => NextResponse.json({ error: message || APP_CONSTANTS.MESSAGES.ERROR.SERVER_ERROR }, { status: 500 }),
  forbidden: (message: string = 'Access denied') => NextResponse.json({ error: message }, { status: 403 }),
  conflict: (message: string) => NextResponse.json({ error: message }, { status: 409 }),
  validation: (message: string, details?: any) => NextResponse.json({ 
    error: message, 
    details 
  }, { status: 422 }),
  
  // Add rate limit error
  rateLimitExceeded: (resetTime?: Date) => {
    const headers: HeadersInit = {
      'Retry-After': resetTime ? Math.ceil((resetTime.getTime() - Date.now()) / 1000).toString() : '3600'
    };
    
    return NextResponse.json({
      error: APP_CONSTANTS.MESSAGES.ERROR.RATE_LIMIT,
      message: APP_CONSTANTS.MESSAGES.ERROR.RATE_LIMIT,
      resetTime: resetTime?.toISOString()
    }, { 
      status: 429,
      headers
    });
  },

  // Add processing error with details
  processingError: (operation: string, details?: any) => NextResponse.json({
    error: 'Processing failed',
    operation,
    details,
    message: `Failed to process ${operation}`
  }, { status: 422 }),

  // Add configuration error
  configurationError: (missing: string[]) => NextResponse.json({
    error: APP_CONSTANTS.MESSAGES.ERROR.CONFIGURATION,
    missing,
    message: APP_CONSTANTS.MESSAGES.ERROR.CONFIGURATION
  }, { status: 503 })
};

/**
 * Utility function to ensure endpoint is only available in development environment
 * Throws error that can be caught and converted to 403 response
 */
export function requireDevelopment() {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('Not available in production');
  }
}

/**
 * Extract just the filename from a full storage path
 * @param fullPath - Full storage path like "users/email/documents/hash/filename.pdf"
 * @returns Just the filename like "filename.pdf"
 */
export function getFilenameFromPath(fullPath: string): string {
  return fullPath.split('/').pop() || fullPath;
}

/**
 * Validates and parses a document ID from route parameters
 * @param id - The ID string from route params
 * @returns The parsed document ID or null if invalid
 */
export function parseDocumentId(id: string): number | null {
  const documentId = parseInt(id, 10);
  return isNaN(documentId) ? null : documentId;
}

/**
 * Checks if a user owns a document
 * @param document - The document to check
 * @param userEmail - The user's email
 * @returns Boolean indicating ownership
 */
export function isDocumentOwner(document: { user_id: string }, userEmail: string): boolean {
  return document.user_id === userEmail;
}

/**
 * Centralized file validation utilities for consistent file upload handling
 */
export const FileValidation = {
  allowedTypes: [...APP_CONSTANTS.FILE_LIMITS.ALLOWED_MIME_TYPES] as string[],
  allowedExtensions: APP_CONSTANTS.FILE_LIMITS.ALLOWED_EXTENSIONS,
  maxSize: APP_CONSTANTS.FILE_LIMITS.MAX_SIZE,
  
  /**
   * Maps file extensions to MIME types
   */
  extensionToMimeType: APP_CONSTANTS.FILE_LIMITS.MIME_TYPE_MAP as Record<string, string>,
  
  /**
   * Validates a file against allowed types and size limits
   * @param file - The file to validate
   * @throws Error with descriptive message if validation fails
   */
  validateFile: (file: File) => {
    if (!FileValidation.allowedTypes.includes(file.type)) {
      throw new Error(`Invalid file type. Only ${FileValidation.allowedExtensions.join(', ').toUpperCase()} files are allowed. Received: ${file.type}`);
    }
    
    if (file.size > FileValidation.maxSize) {
      throw new Error(`File too large. Maximum size is ${APP_CONSTANTS.FILE_LIMITS.MAX_SIZE_MB}MB. Received: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
    }
    
    return true;
  },
  
  /**
   * Gets validation error response for API routes
   * @param file - The file that failed validation
   * @returns NextResponse with appropriate error
   */
  getValidationError: (file: File) => {
    try {
      FileValidation.validateFile(file);
      return null; // No error
    } catch (error: any) {
      if (error.message.includes('Invalid file type')) {
        return ApiErrors.validation(APP_CONSTANTS.MESSAGES.UPLOAD.INVALID_TYPE, {
          allowedTypes: FileValidation.allowedExtensions,
          receivedType: file.type
        });
      } else if (error.message.includes('File too large')) {
        return ApiErrors.validation(APP_CONSTANTS.MESSAGES.UPLOAD.TOO_LARGE, {
          maxSize: FileValidation.maxSize,
          actualSize: file.size,
          maxSizeMB: APP_CONSTANTS.FILE_LIMITS.MAX_SIZE_MB,
          actualSizeMB: Number((file.size / 1024 / 1024).toFixed(2))
        });
      } else {
        return ApiErrors.badRequest(error.message);
      }
    }
  },
  
  /**
   * Gets MIME type from filename extension
   * @param filename - The filename to get MIME type for
   * @returns MIME type string or 'application/octet-stream' for unknown types
   */
  getContentType: (filename: string) => {
    const ext = filename.toLowerCase().split('.').pop() || '';
    return FileValidation.extensionToMimeType[ext] || 'application/octet-stream';
  }
};
