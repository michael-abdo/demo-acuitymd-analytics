/**
 * Centralized Request Parsing Service
 * 
 * Consolidates request parsing patterns used across API routes to follow DRY principle.
 * Handles pagination, filtering, and request body parsing consistently.
 */

import { NextRequest } from 'next/server';

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
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '10', 10)));
    const offset = (page - 1) * pageSize;
    
    return { page, pageSize, offset };
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
    
    // Handle multiple field name formats for flexibility
    const doc1Id = parseInt(
      body.standardDocId || body.doc1Id || body.document1Id, 
      10
    );
    const doc2Id = parseInt(
      body.thirdPartyDocId || body.doc2Id || body.document2Id, 
      10
    );

    if (isNaN(doc1Id) || isNaN(doc2Id)) {
      throw new Error('Invalid document IDs provided');
    }

    return { doc1Id, doc2Id };
  },

  /**
   * Parse document ID from route parameters
   * Returns null if invalid instead of throwing
   */
  parseDocumentId: (id: string): number | null => {
    const documentId = parseInt(id, 10);
    return isNaN(documentId) ? null : documentId;
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
    const metadata = formData.get('metadata') ? 
      JSON.parse(formData.get('metadata') as string) : {};

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
    timestamp: new Date().toISOString(),
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