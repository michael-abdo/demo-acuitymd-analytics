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
  serverError: (message: string, details?: any) => NextResponse.json({ 
    error: message || APP_CONSTANTS.MESSAGES.ERROR.SERVER_ERROR,
    ...(details && { details })
  }, { status: 500 }),
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
 * Consolidated fetch utilities to eliminate common duplication patterns
 * Provides common headers, request configurations, and response handling
 */
export const FetchUtils = {
  // Common headers for JSON requests
  jsonHeaders: {
    'Content-Type': 'application/json'
  },

  // Standard fetch configurations
  configs: {
    json: (body?: any, headers?: Record<string, string>) => ({
      method: 'POST',
      headers: { ...FetchUtils.jsonHeaders, ...headers },
      body: body ? JSON.stringify(body) : undefined
    }),

    jsonGet: (headers?: Record<string, string>) => ({
      method: 'GET',
      headers: { ...FetchUtils.jsonHeaders, ...headers }
    }),

    jsonPut: (body: any, headers?: Record<string, string>) => ({
      method: 'PUT',
      headers: { ...FetchUtils.jsonHeaders, ...headers },
      body: JSON.stringify(body)
    }),

    jsonDelete: (headers?: Record<string, string>) => ({
      method: 'DELETE',
      headers: { ...FetchUtils.jsonHeaders, ...headers }
    })
  },

  // Standard response handling - now uses centralized ResponseUtils
  async handleResponse<T>(response: Response): Promise<T> {
    await ResponseUtils.checkResponse(response);
    return ResponseUtils.parseJsonSafely<T>(response);
  },

  // Timeout utilities
  withTimeout: (timeoutMs: number) => {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs);
    });
  }
};

/**
 * Common delay/timeout patterns consolidated into reusable utilities
 */
export const DelayUtils = {
  // Standard delays
  short: () => new Promise(resolve => setTimeout(resolve, 500)),
  medium: () => new Promise(resolve => setTimeout(resolve, 1000)),
  long: () => new Promise(resolve => setTimeout(resolve, 2000)),
  
  // Custom delay
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Retry with exponential backoff
  async retry<T>(
    fn: () => Promise<T>, 
    maxAttempts: number = 3, 
    baseDelayMs: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < maxAttempts) {
          const delay = baseDelayMs * Math.pow(2, attempt - 1);
          await DelayUtils.wait(delay);
        }
      }
    }
    
    throw lastError!;
  }
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
 * String utilities for common manipulation patterns
 */
export const StringUtils = {
  /**
   * Extract just the filename from a full storage path
   * @param fullPath - Full storage path like "users/email/documents/hash/filename.pdf"
   * @returns Just the filename like "filename.pdf"
   */
  getFilenameFromPath: (fullPath: string): string => {
    return fullPath.split('/').pop() || fullPath;
  },

  /**
   * Extract file extension from filename (normalized to lowercase)
   * @param filename - Filename like "document.PDF" or "test.docx"
   * @returns Extension like "pdf" or "docx"
   */
  getFileExtension: (filename: string): string => {
    return filename.toLowerCase().split('.').pop() || '';
  },

  /**
   * Get file type for display purposes
   * @param filename - Filename to analyze
   * @returns File type like "pdf", "docx", or "unknown"
   */
  getFileType: (filename: string): string => {
    return StringUtils.getFileExtension(filename) || 'unknown';
  },

  /**
   * Case-insensitive search within text
   * @param text - Text to search in
   * @param searchTerm - Term to search for
   * @returns Boolean indicating if search term is found
   */
  containsIgnoreCase: (text: string, searchTerm: string): boolean => {
    return text.toLowerCase().includes(searchTerm.toLowerCase());
  },

  /**
   * Normalize text for comparison (lowercase, trim)
   * @param text - Text to normalize
   * @returns Normalized text
   */
  normalize: (text: string): string => {
    return text.toLowerCase().trim();
  },

  /**
   * Format file size for display
   * @param bytes - File size in bytes
   * @returns Formatted size like "1.5 MB"
   */
  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  /**
   * Format date for display
   * @param date - Date string or Date object
   * @returns Formatted date string
   */
  formatDate: (date: string | Date): string => {
    return new Date(date).toLocaleDateString();
  },

  /**
   * Extract text statistics from content
   * Consolidates text analysis patterns (DRY: eliminates ~3 instances)
   */
  getTextStats: (text: string): {
    length: number;
    words: number;
    lines: number;
    paragraphs: number;
    isEmpty: boolean;
    hasContent: boolean;
  } => {
    if (!text) {
      return {
        length: 0,
        words: 0,
        lines: 0,
        paragraphs: 0,
        isEmpty: true,
        hasContent: false
      };
    }
    
    const trimmed = text.trim();
    const words = trimmed.split(/\s+/).filter(word => word.length > 0);
    const lines = trimmed.split('\n').filter(line => line.trim().length > 0);
    const paragraphs = trimmed.split(/\n\n+/).filter(para => para.trim().length > 0);
    
    return {
      length: text.length,
      words: words.length,
      lines: lines.length,
      paragraphs: paragraphs.length,
      isEmpty: trimmed.length === 0,
      hasContent: trimmed.length > 0
    };
  },

  /**
   * Truncate text with ellipsis
   */
  truncate: (text: string, maxLength: number, suffix: string = '...'): string => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength - suffix.length).trim() + suffix;
  },

  /**
   * Extract preview from document text
   */
  extractPreview: (text: string, maxLength: number = 200): string => {
    if (!text) return '';
    // Remove extra whitespace and newlines
    const cleaned = text.replace(/\s+/g, ' ').trim();
    return StringUtils.truncate(cleaned, maxLength);
  },

  /**
   * Check text similarity (basic)
   */
  calculateSimilarity: (text1: string, text2: string): number => {
    if (!text1 || !text2) return 0;
    
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }
};

/**
 * Dialog utilities for consistent user confirmations
 * Consolidates hardcoded confirm() dialogs (DRY: eliminates ~8-12 lines)
 */
export const DialogUtils = {
  confirmDelete: (itemType: string, itemName?: string): boolean => {
    const message = itemName 
      ? `Are you sure you want to delete ${itemType} "${itemName}"?`
      : `Are you sure you want to delete this ${itemType}?`;
    return confirm(`${message}\n\nThis action cannot be undone.`);
  },
  
  confirmAction: (action: string, consequence?: string): boolean => {
    const message = consequence 
      ? `Are you sure you want to ${action}?\n\n${consequence}`
      : `Are you sure you want to ${action}?`;
    return confirm(message);
  },
  
  confirmDestructive: (action: string, itemName?: string): boolean => {
    const target = itemName ? ` "${itemName}"` : '';
    return confirm(`Are you sure you want to ${action}${target}?\n\n⚠️ This action cannot be undone.`);
  }
};

/**
 * Response data extraction utilities
 * Standardizes response data access patterns (DRY: eliminates ~5-8 lines)
 */
export const ResponseUtils = {
  extractData: <T>(response: any): T => {
    // Handle different API response formats consistently
    return response?.data || response;
  },
  
  extractError: (response: any): string => {
    return response?.error || response?.message || 'Unknown error';
  },
  
  extractList: <T>(response: any): T[] => {
    const data = ResponseUtils.extractData(response);
    return Array.isArray(data) ? data : [];
  },

  /**
   * Centralized API response error handling - Consolidates repeated fetch error patterns
   * Eliminates ~6 instances of `response.json().catch(() => ({}))` across hooks and utils
   */
  async handleApiError(response: Response): Promise<never> {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`;
    throw new Error(message);
  },

  /**
   * Safe JSON parsing for API responses
   * Consolidates error handling for malformed response bodies
   */
  async parseJsonSafely<T = any>(response: Response): Promise<T> {
    try {
      return await response.json();
    } catch {
      return {} as T;
    }
  },

  /**
   * Standard fetch error checking and handling
   * Consolidates the check-then-throw pattern used across hooks
   */
  async checkResponse(response: Response): Promise<Response> {
    if (!response.ok) {
      await this.handleApiError(response);
    }
    return response;
  },

  /**
   * Complete fetch wrapper with error handling
   * Single method that consolidates all common fetch patterns
   */
  async fetchWithErrorHandling<T = any>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, init);
    await this.checkResponse(response);
    return this.parseJsonSafely<T>(response);
  }
};

/**
 * Error utilities for consistent error handling patterns
 * Consolidates error type checking and message extraction
 */
export const ErrorUtils = {
  /**
   * Check if value is an Error instance
   */
  isError: (value: any): value is Error => {
    return value instanceof Error || 
           (value && typeof value === 'object' && 'message' in value && 'name' in value);
  },
  
  /**
   * Extract error message safely
   */
  getMessage: (error: any): string => {
    if (typeof error === 'string') return error;
    if (ErrorUtils.isError(error)) return error.message;
    if (error?.error) return ErrorUtils.getMessage(error.error);
    if (error?.message) return error.message;
    return 'Unknown error occurred';
  },
  
  /**
   * Extract error code if available
   */
  getCode: (error: any): string | undefined => {
    return error?.code || error?.errorCode || error?.error_code;
  },
  
  /**
   * Create error with context
   */
  withContext: (message: string, context: Record<string, any>): Error => {
    const error = new Error(message);
    Object.assign(error, { context });
    return error;
  },
  
  /**
   * Check if error is of specific type
   */
  isType: (error: any, type: string): boolean => {
    return error?.name === type || error?.constructor?.name === type;
  },
  
  /**
   * Common error type checks
   */
  is: {
    networkError: (error: any): boolean => {
      const message = ErrorUtils.getMessage(error).toLowerCase();
      return message.includes('network') || 
             message.includes('fetch') || 
             message.includes('connection');
    },
    
    validationError: (error: any): boolean => {
      const message = ErrorUtils.getMessage(error).toLowerCase();
      return message.includes('validation') || 
             message.includes('invalid') || 
             error?.statusCode === 422;
    },
    
    authError: (error: any): boolean => {
      const message = ErrorUtils.getMessage(error).toLowerCase();
      return message.includes('unauthorized') || 
             message.includes('authentication') || 
             error?.statusCode === 401;
    },
    
    notFoundError: (error: any): boolean => {
      const message = ErrorUtils.getMessage(error).toLowerCase();
      return message.includes('not found') || 
             error?.statusCode === 404;
    }
  }
};

/**
 * URL construction utilities for consistent API endpoint building
 * Consolidates mixed URL construction approaches (DRY: eliminates ~8-10 lines)
 */
export const UrlBuilder = {
  apiDocument: (id: number, action?: string): string => {
    const base = `/api/documents/${id}`;
    return action ? `${base}/${action}` : base;
  },
  
  apiEndpoint: (endpoint: string): string => {
    return endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  },
  
  withQuery: (url: string, params: Record<string, string | number>): string => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      searchParams.append(key, String(value));
    });
    const queryString = searchParams.toString();
    return queryString ? `${url}?${queryString}` : url;
  }
};

/**
 * @deprecated Use StringUtils.getFilenameFromPath instead
 */
export function getFilenameFromPath(fullPath: string): string {
  return StringUtils.getFilenameFromPath(fullPath);
}

/**
 * Validates and parses a document ID from route parameters
 * @param id - The ID string from route params
 * @returns The parsed document ID or null if invalid
 */
// parseDocumentId moved to RequestParser.parseDocumentId to eliminate duplication

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

/**
 * Form Data Utilities - Consolidated form data creation patterns
 * Eliminates duplicated FormData construction for file uploads
 */
export const FormUtils = {
  /**
   * Create upload FormData with standard fields
   * Consolidates file + isStandard pattern used in upload components
   */
  createUploadFormData(file: File, options?: {
    isStandard?: boolean;
    docType?: string;
    metadata?: Record<string, string>;
  }): FormData {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('isStandard', options?.isStandard ? 'true' : 'false');
    
    if (options?.docType) {
      formData.append('docType', options.docType);
    }
    
    if (options?.metadata) {
      Object.entries(options.metadata).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }
    
    return formData;
  },
  
  /**
   * Create FormData from key-value object
   */
  fromObject(data: Record<string, string | File | Blob>): FormData {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, value);
    });
    return formData;
  }
};

/**
 * Timestamp Utilities - Consolidated date/time formatting patterns
 * Eliminates scattered new Date().toISOString() calls across the codebase
 */
export const TimestampUtils = {
  /**
   * Get current timestamp in ISO format
   */
  now: () => new Date().toISOString(),
  
  /**
   * Get current timestamp in UTC ISO format (alias for consistency)
   */
  nowUTC: () => new Date().toISOString(),
  
  /**
   * Format a date for database storage
   */
  formatForDB: (date: Date = new Date()) => date.toISOString(),
  
  /**
   * Format a date for logging purposes
   */
  formatForLog: (date: Date = new Date()) => date.toISOString(),
  
  /**
   * Format a date for API responses
   */
  formatForAPI: (date: Date = new Date()) => date.toISOString(),
  
  /**
   * Common timestamp patterns for object creation
   */
  createTimestamp: () => ({ createdAt: TimestampUtils.now() }),
  updateTimestamp: () => ({ updatedAt: TimestampUtils.now() }),
  auditTimestamp: () => ({ 
    createdAt: TimestampUtils.now(),
    updatedAt: TimestampUtils.now()
  }),
  
  /**
   * Create timestamp with metadata
   */
  withMetadata: (metadata?: Record<string, any>) => ({
    timestamp: TimestampUtils.now(),
    ...metadata
  }),
  
  /**
   * Parse timestamp from various formats
   */
  parse: (timestamp: string | Date | number): Date => {
    if (timestamp instanceof Date) return timestamp;
    if (typeof timestamp === 'number') return new Date(timestamp);
    return new Date(timestamp);
  },
  
  /**
   * Check if timestamp is recent (within specified minutes)
   */
  isRecent: (timestamp: string | Date, withinMinutes: number = 5): boolean => {
    const date = TimestampUtils.parse(timestamp);
    const now = new Date();
    const diffMinutes = (now.getTime() - date.getTime()) / (1000 * 60);
    return diffMinutes <= withinMinutes;
  },
  
  /**
   * Format for human-readable display
   */
  formatHuman: (date: Date = new Date(), locale: string = 'en-US'): string => {
    return date.toLocaleString(locale);
  },
  
  /**
   * Format date for display (date only, no time)
   * Consolidates new Date(date).toLocaleDateString() patterns (DRY: eliminates ~3 instances)
   */
  toLocaleDateString: (date: Date | string, locale: string = 'en-US'): string => {
    return new Date(date).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  },
  
  /**
   * Format date and time for display
   * Consolidates new Date(date).toLocaleString() patterns (DRY: eliminates ~2 instances)
   */
  toLocaleString: (date: Date | string, locale: string = 'en-US'): string => {
    return new Date(date).toLocaleString(locale);
  },
  
  /**
   * Get relative time from now (e.g., "2 days ago", "Today")
   * Consolidates date display logic across components
   */
  fromNow: (date: Date | string): string => {
    const diff = Date.now() - new Date(date).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return TimestampUtils.toLocaleDateString(date);
  },
  
  /**
   * Check if a date is expired
   * Useful for token expiration, temporary URLs, etc.
   */
  isExpired: (date: Date | string): boolean => {
    return new Date(date).getTime() < Date.now();
  },
  
  /**
   * Format for file names (no special characters)
   */
  formatForFilename: (date: Date = new Date()): string => {
    return date.toISOString().replace(/[:.]/g, '-').split('.')[0];
  },
  
  /**
   * Common duration calculations
   */
  duration: {
    seconds: (start: Date | string, end: Date | string = new Date()) => {
      const startDate = TimestampUtils.parse(start);
      const endDate = TimestampUtils.parse(end);
      return Math.floor((endDate.getTime() - startDate.getTime()) / 1000);
    },
    
    minutes: (start: Date | string, end: Date | string = new Date()) => {
      return Math.floor(TimestampUtils.duration.seconds(start, end) / 60);
    },
    
    milliseconds: (start: Date | string, end: Date | string = new Date()) => {
      const startDate = TimestampUtils.parse(start);
      const endDate = TimestampUtils.parse(end);
      return endDate.getTime() - startDate.getTime();
    },
    
    humanReadable: (start: Date | string, end: Date | string = new Date()) => {
      const ms = TimestampUtils.duration.milliseconds(start, end);
      if (ms < 1000) return `${ms}ms`;
      if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
      if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
      return `${(ms / 3600000).toFixed(1)}h`;
    }
  },
  
  /**
   * Relative time helpers
   */
  relative: {
    from: (date: Date | string, reference: Date = new Date()) => {
      const targetDate = TimestampUtils.parse(date);
      const diffMs = reference.getTime() - targetDate.getTime();
      
      if (diffMs < 60000) return 'just now';
      if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)} minutes ago`;
      if (diffMs < 86400000) return `${Math.floor(diffMs / 3600000)} hours ago`;
      if (diffMs < 604800000) return `${Math.floor(diffMs / 86400000)} days ago`;
      return targetDate.toLocaleDateString();
    },
    
    to: (date: Date | string, reference: Date = new Date()) => {
      const targetDate = TimestampUtils.parse(date);
      const diffMs = targetDate.getTime() - reference.getTime();
      
      if (diffMs < 0) return TimestampUtils.relative.from(date, reference);
      if (diffMs < 60000) return 'in a moment';
      if (diffMs < 3600000) return `in ${Math.floor(diffMs / 60000)} minutes`;
      if (diffMs < 86400000) return `in ${Math.floor(diffMs / 3600000)} hours`;
      if (diffMs < 604800000) return `in ${Math.floor(diffMs / 86400000)} days`;
      return targetDate.toLocaleDateString();
    }
  }
};

/**
 * JSON Metadata Utilities - Consolidated JSON handling patterns
 * Eliminates scattered JSON.parse/stringify with error handling
 */
export const JsonUtils = {
  /**
   * Safely parse JSON with fallback
   */
  safeParse: <T = any>(json: string | null | undefined, fallback: T): T => {
    if (!json) return fallback;
    try {
      return JSON.parse(json);
    } catch {
      return fallback;
    }
  },
  
  /**
   * Parse metadata with type safety
   */
  parseMetadata: <T extends Record<string, any> = Record<string, any>>(
    metadata: string | Record<string, any> | null | undefined
  ): T => {
    if (!metadata) return {} as T;
    if (typeof metadata === 'string') {
      return JsonUtils.safeParse<T>(metadata, {} as T);
    }
    return metadata as T;
  },
  
  /**
   * Merge metadata objects safely
   */
  mergeMetadata: <T extends Record<string, any> = Record<string, any>>(
    existing: string | Record<string, any> | null | undefined,
    updates: Record<string, any>
  ): T => {
    const current = JsonUtils.parseMetadata<T>(existing);
    return {
      ...current,
      ...updates,
      lastUpdated: new Date().toISOString()
    } as T;
  },
  
  /**
   * Stringify with error handling
   */
  stringify: (data: any, pretty = false): string => {
    try {
      return pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
    } catch (error) {
      console.error('JSON stringify error:', error);
      return '{}';
    }
  },
  
  /**
   * Deep clone an object
   */
  deepClone: <T>(obj: T): T => {
    return JSON.parse(JSON.stringify(obj));
  },
  
  /**
   * Check if string is valid JSON
   */
  isValidJson: (str: string): boolean => {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  },
  
  /**
   * Extract specific fields from metadata
   */
  extractFields: <T extends Record<string, any>>(
    metadata: string | Record<string, any> | null | undefined,
    fields: string[]
  ): Partial<T> => {
    const data = JsonUtils.parseMetadata<T>(metadata);
    const result: Partial<T> = {};
    fields.forEach(field => {
      if (field in data) {
        result[field as keyof T] = data[field as keyof T];
      }
    });
    return result;
  },
  
  /**
   * Common metadata patterns
   */
  metadata: {
    withTimestamp: (data: Record<string, any>) => ({
      ...data,
      timestamp: new Date().toISOString()
    }),
    
    withUser: (data: Record<string, any>, userEmail: string) => ({
      ...data,
      userEmail,
      updatedBy: userEmail,
      updatedAt: new Date().toISOString()
    }),
    
    withError: (data: Record<string, any>, error: Error) => ({
      ...data,
      error: {
        message: error.message,
        name: error.name,
        timestamp: new Date().toISOString()
      }
    })
  }
};

/**
 * Performance Timing Utilities - Consolidated timing patterns
 */
export const TimingUtils = {
  /**
   * Create a simple performance timer
   */
  createTimer: () => {
    const start = Date.now();
    return {
      elapsed: () => Date.now() - start,
      elapsedMs: () => Date.now() - start,
      elapsedSeconds: () => (Date.now() - start) / 1000,
      elapsedFormatted: () => TimestampUtils.duration.humanReadable(new Date(start)),
      end: (label?: string) => {
        const elapsed = Date.now() - start;
        return {
          label: label || 'operation',
          elapsed,
          formatted: TimestampUtils.duration.humanReadable(new Date(start))
        };
      }
    };
  },
  
  /**
   * Measure async function execution time
   */
  measure: async <T>(fn: () => Promise<T>, label?: string): Promise<{ result: T; timing: { elapsed: number; formatted: string; label: string } }> => {
    const timer = TimingUtils.createTimer();
    const result = await fn();
    const timing = timer.end(label);
    return { result, timing };
  },
  
  /**
   * Measure sync function execution time
   */
  measureSync: <T>(fn: () => T, label?: string): { result: T; timing: { elapsed: number; formatted: string; label: string } } => {
    const timer = TimingUtils.createTimer();
    const result = fn();
    const timing = timer.end(label);
    return { result, timing };
  }
};

/**
 * Status Styling Utilities - Consolidates repeated status/risk color patterns
 * Eliminates hardcoded color mappings across components (DRY: ~25 lines)
 */
export const StatusStyles = {
  /**
   * Risk level color mappings with consistent Tailwind classes
   */
  risk: {
    low: "text-green-600 bg-green-50 border-green-200",
    medium: "text-yellow-600 bg-yellow-50 border-yellow-200", 
    high: "text-red-600 bg-red-50 border-red-200",
    default: "text-gray-600 bg-gray-50 border-gray-200"
  } as const,

  /**
   * Document status color mappings
   */
  document: {
    processed: "text-green-600 bg-green-50",
    processing: "text-yellow-600 bg-yellow-50", 
    failed: "text-red-600 bg-red-50",
    pending: "text-gray-600 bg-gray-50"
  } as const,

  /**
   * Get risk level styling classes
   */
  getRiskColor: (risk: string): string => {
    return StatusStyles.risk[risk as keyof typeof StatusStyles.risk] || StatusStyles.risk.default;
  },

  /**
   * Get document status styling classes  
   */
  getDocumentColor: (status: string): string => {
    return StatusStyles.document[status as keyof typeof StatusStyles.document] || StatusStyles.document.pending;
  },

  /**
   * Get risk level icon (returns JSX element)
   * Note: Requires importing icons in the component
   */
  getRiskIcon: (risk: string, iconProps: { className?: string } = {}) => {
    const className = iconProps.className || "h-4 w-4";
    // Return icon identifier for components to render
    switch (risk) {
      case 'low': return { type: 'CheckCircle', className };
      case 'medium': return { type: 'Clock', className };
      case 'high': return { type: 'AlertCircle', className };
      default: return { type: 'Clock', className };
    }
  },

  /**
   * Create badge variant from risk level
   */
  getRiskBadgeProps: (risk: string) => ({
    className: StatusStyles.getRiskColor(risk),
    variant: "outline" as const
  })
};
