import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { NextResponse } from "next/server"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Centralized API error response utilities for consistent error handling
 */
export const ApiErrors = {
  unauthorized: () => NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
  notFound: (resource: string) => NextResponse.json({ error: `${resource} not found` }, { status: 404 }),
  badRequest: (message: string) => NextResponse.json({ error: message }, { status: 400 }),
  serverError: (message: string) => NextResponse.json({ error: message }, { status: 500 }),
  forbidden: (message: string = 'Access denied') => NextResponse.json({ error: message }, { status: 403 }),
  conflict: (message: string) => NextResponse.json({ error: message }, { status: 409 }),
  validation: (message: string, details?: any) => NextResponse.json({ 
    error: message, 
    details 
  }, { status: 422 })
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
 * Centralized file validation utilities for consistent file upload handling
 */
export const FileValidation = {
  allowedTypes: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword', // .doc
    'text/plain' // .txt
  ],
  allowedExtensions: ['pdf', 'docx', 'doc', 'txt'],
  maxSize: 10 * 1024 * 1024, // 10MB
  
  /**
   * Maps file extensions to MIME types
   */
  extensionToMimeType: {
    '.pdf': 'application/pdf',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.doc': 'application/msword',
    '.txt': 'text/plain'
  } as Record<string, string>,
  
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
      throw new Error(`File too large. Maximum size is ${(FileValidation.maxSize / 1024 / 1024).toFixed(0)}MB. Received: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
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
        return ApiErrors.validation('Invalid file type. Only PDF, DOCX, DOC, and TXT files are allowed', {
          allowedTypes: FileValidation.allowedExtensions,
          receivedType: file.type
        });
      } else if (error.message.includes('File too large')) {
        return ApiErrors.validation('File too large', {
          maxSize: FileValidation.maxSize,
          actualSize: file.size,
          maxSizeMB: Math.round(FileValidation.maxSize / 1024 / 1024),
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
    const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
    return FileValidation.extensionToMimeType[ext] || 'application/octet-stream';
  }
};
