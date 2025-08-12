/**
 * Centralized Request Parsing Service
 * 
 * Consolidates request parsing patterns used across API routes to follow DRY principle.
 * Handles pagination, filtering, and request body parsing consistently.
 */

import { NextRequest } from 'next/server';
import { JsonUtils, TimestampUtils, InputValidator, Validators } from '@/lib/utils';

export interface PaginationParams {
  page: number;
  pageSize: number;
  offset: number;
}

export interface DocumentFilters {
  type: 'standard' | 'third_party' | undefined;
  search: string;
}

export interface ComparisonRequest {
  doc1Id: number;
  doc2Id: number;
}

export const RequestParser = {
  /**
   * Parse pagination parameters from URL search params
   * Ensures safe bounds and defaults
   */
  parsePagination: (searchParams: URLSearchParams): PaginationParams => {
    const validation = Validators.pagination(searchParams);
    return {
      page: validation.page,
      pageSize: validation.pageSize,
      offset: validation.offset
    };
  },

  /**
   * Parse document filtering parameters from URL search params
   */
  parseDocumentFilters: (searchParams: URLSearchParams): DocumentFilters => {
    const typeParam = searchParams.get('type');
    return {
      type: (typeParam === 'standard' || typeParam === 'third_party') ? typeParam : undefined,
      search: searchParams.get('search') || ''
    };
  },

  /**
   * Parse comparison request from POST body
   * Handles both legacy and new field names
   */
  parseComparisonRequest: async (request: NextRequest): Promise<ComparisonRequest> => {
    const body = await request.json();
    
    // Handle multiple field name formats for flexibility using InputValidator
    const doc1Validation = Validators.documentId(
      body.standardDocId || body.doc1Id || body.document1Id
    );
    const doc2Validation = Validators.documentId(
      body.thirdPartyDocId || body.doc2Id || body.document2Id
    );

    if (!doc1Validation.isValid || !doc2Validation.isValid) {
      throw new Error('Invalid document IDs provided');
    }
    
    const doc1Id = doc1Validation.value;
    const doc2Id = doc2Validation.value;

    return { doc1Id, doc2Id };
  },

  /**
   * Parse document ID from route parameters
   * Returns null if invalid instead of throwing
   */
  parseDocumentId: (id: string): number | null => {
    const validation = Validators.documentId(id);
    return validation.isValid ? validation.value : null;
  },

  /**
   * Parse and validate document update request
   */
  parseDocumentUpdateRequest: async (request: NextRequest) => {
    const body = await request.json();
    
    const displayNameValidation = InputValidator.validateString(body.display_name, {
      required: false,
      trim: true,
      fieldName: 'display_name',
      maxLength: 255
    });
    
    const isStandardValidation = InputValidator.validateBoolean(body.is_standard, {
      fieldName: 'is_standard'
    });
    
    const updates: Record<string, any> = {};
    
    if (body.display_name !== undefined) {
      if (!displayNameValidation.isValid) {
        throw new Error(displayNameValidation.error!);
      }
      updates.display_name = displayNameValidation.value || null;
    }
    
    if (body.is_standard !== undefined) {
      if (!isStandardValidation.isValid) {
        throw new Error(isStandardValidation.error!);
      }
      updates.is_standard = isStandardValidation.value;
    }
    
    if (Object.keys(updates).length === 0) {
      throw new Error('No valid updates provided');
    }
    
    return updates;
  },

  /**
   * Parse query parameters for dashboard stats
   */
  parseStatsFilters: (searchParams: URLSearchParams) => ({
    period: searchParams.get('period') || '7d',
    includeHistory: searchParams.get('includeHistory') === 'true'
  }),

  /**
   * Parse file upload form data
   */
  parseUploadRequest: async (request: NextRequest) => {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const isStandard = formData.get('isStandard') === 'true';
    const metadata = JsonUtils.safeParse(formData.get('metadata') as string, {});

    if (!file) {
      throw new Error('No file provided in upload request');
    }

    return { file, isStandard, metadata };
  },

  /**
   * Generic query parameter parser with type safety
   */
  parseQueryParams: <T extends Record<string, any>>(
    searchParams: URLSearchParams,
    schema: {
      [K in keyof T]: {
        default: T[K];
        parse?: (value: string) => T[K];
        validate?: (value: T[K]) => boolean;
      }
    }
  ): T => {
    const result = {} as T;

    Object.entries(schema).forEach(([key, config]) => {
      const value = searchParams.get(key);
      
      if (value === null) {
        result[key as keyof T] = config.default;
      } else {
        const parsed = config.parse ? config.parse(value) : value as T[keyof T];
        
        if (config.validate && !config.validate(parsed)) {
          result[key as keyof T] = config.default;
        } else {
          result[key as keyof T] = parsed;
        }
      }
    });

    return result;
  },

  /**
   * Extract user context from authenticated request
   */
  extractUserContext: (userEmail: string, searchParams?: URLSearchParams) => ({
    userEmail,
    timestamp: TimestampUtils.now(),
    userAgent: searchParams?.get('userAgent') || 'unknown',
    sessionId: searchParams?.get('sessionId') || null
  }),

  /**
   * Validate required fields in request body
   */
  validateRequiredFields: (body: any, requiredFields: string[]): void => {
    const missing = requiredFields.filter(field => 
      body[field] === undefined || body[field] === null || body[field] === ''
    );

    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }
  }
};