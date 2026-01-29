/**
 * Document Tags API Route
 *
 * GET /api/documents/:id/tags - Get all tags for a document
 * POST /api/documents/:id/tags - Add a tag to a document
 * DELETE /api/documents/:id/tags - Remove a tag from a document
 *
 * SECURITY:
 * - Document ownership verified before any operation
 * - Tag ownership verified when adding existing tag
 * - CSRF token required for POST/DELETE (validated by withApiAuth)
 *
 * @example Add tag by ID
 * ```typescript
 * const response = await fetch('/api/documents/123/tags', {
 *   method: 'POST',
 *   headers: await getApiHeaders(),
 *   body: JSON.stringify({ tagId: 5 }),
 * });
 * ```
 *
 * @example Add tag by name (creates if doesn't exist)
 * ```typescript
 * const response = await fetch('/api/documents/123/tags', {
 *   method: 'POST',
 *   headers: await getApiHeaders(),
 *   body: JSON.stringify({ name: 'Important' }),
 * });
 * ```
 *
 * @example Remove tag
 * ```typescript
 * const response = await fetch('/api/documents/123/tags', {
 *   method: 'DELETE',
 *   headers: await getApiHeaders(),
 *   body: JSON.stringify({ tagId: 5 }),
 * });
 * ```
 */

import { NextRequest } from 'next/server';
import { withApiAuth } from '@/lib/api/with-auth';
import { ApiResponseUtil } from '@/lib/response';
import { tagService } from '@/lib/services/tag.service';
import {
  ValidationError,
  NotFoundError,
  AuthorizationError,
} from '@/lib/services/errors/service-errors';
import { logger } from '@/lib/pino-logger';

// Helper to parse document ID from route params
const parseDocumentId = async (
  paramsPromise?: Promise<{ id?: string }>
): Promise<number | null> => {
  if (!paramsPromise) return null;
  const params = await paramsPromise;
  const rawId = params?.id;

  if (!rawId) return null;
  const parsed = Number.parseInt(rawId, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export const GET = withApiAuth(async (_request: NextRequest, { userEmail }, routeParams) => {
  const documentId = await parseDocumentId(routeParams?.params);

  if (!documentId) {
    return ApiResponseUtil.validationError(
      'Invalid document ID. Expected a positive integer.',
      'id'
    );
  }

  try {
    const result = await tagService.getDocumentTags(documentId, userEmail);

    return ApiResponseUtil.success(result, { requestId: crypto.randomUUID() });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return ApiResponseUtil.notFound(error.message);
    }
    if (error instanceof AuthorizationError) {
      return ApiResponseUtil.forbidden(error.message);
    }

    logger.base.error(error as Error, 'Failed to get document tags');
    return ApiResponseUtil.internalError('Failed to retrieve document tags');
  }
});

export const POST = withApiAuth(async (request: NextRequest, { userEmail }, routeParams) => {
  const documentId = await parseDocumentId(routeParams?.params);

  if (!documentId) {
    return ApiResponseUtil.validationError(
      'Invalid document ID. Expected a positive integer.',
      'id'
    );
  }

  let body: { tagId?: number; name?: string };

  try {
    body = await request.json();
  } catch {
    return ApiResponseUtil.validationError(
      'Request body must be valid JSON.\n' +
        'Add by ID: { "tagId": 5 }\n' +
        'Add by name: { "name": "Important" }',
      'body'
    );
  }

  // Must provide either tagId or name
  if (!body.tagId && !body.name) {
    return ApiResponseUtil.validationError(
      'Either tagId or name is required.\n' +
        'Add by ID: { "tagId": 5 }\n' +
        'Add by name: { "name": "Important" }',
      'tagId'
    );
  }

  try {
    let result;

    if (body.tagId) {
      // Add existing tag by ID
      result = await tagService.addTagToDocument(documentId, body.tagId, userEmail);
    } else if (body.name) {
      // Add tag by name (creates if doesn't exist)
      result = await tagService.addTagToDocumentByName(documentId, body.name, userEmail);
    }

    logger.base.info('Tag added to document', {
      documentId,
      tagId: body.tagId,
      tagName: body.name,
      userEmail,
    });

    return ApiResponseUtil.success(result, { requestId: crypto.randomUUID() });
  } catch (error) {
    if (error instanceof ValidationError) {
      return ApiResponseUtil.validationError(error.message);
    }
    if (error instanceof NotFoundError) {
      return ApiResponseUtil.notFound(error.message);
    }
    if (error instanceof AuthorizationError) {
      return ApiResponseUtil.forbidden(error.message);
    }

    logger.base.error(error as Error, 'Failed to add tag to document');
    return ApiResponseUtil.internalError('Failed to add tag to document');
  }
});

export const DELETE = withApiAuth(async (request: NextRequest, { userEmail }, routeParams) => {
  const documentId = await parseDocumentId(routeParams?.params);

  if (!documentId) {
    return ApiResponseUtil.validationError(
      'Invalid document ID. Expected a positive integer.',
      'id'
    );
  }

  let body: { tagId?: number };

  try {
    body = await request.json();
  } catch {
    return ApiResponseUtil.validationError(
      'Request body must be valid JSON.\n' +
        'Example: { "tagId": 5 }',
      'body'
    );
  }

  if (!body.tagId) {
    return ApiResponseUtil.validationError(
      'tagId is required.\n' +
        'Example: { "tagId": 5 }',
      'tagId'
    );
  }

  try {
    const result = await tagService.removeTagFromDocument(documentId, body.tagId, userEmail);

    logger.base.info('Tag removed from document', {
      documentId,
      tagId: body.tagId,
      userEmail,
    });

    return ApiResponseUtil.success(result, { requestId: crypto.randomUUID() });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return ApiResponseUtil.notFound(error.message);
    }
    if (error instanceof AuthorizationError) {
      return ApiResponseUtil.forbidden(error.message);
    }

    logger.base.error(error as Error, 'Failed to remove tag from document');
    return ApiResponseUtil.internalError('Failed to remove tag from document');
  }
});
