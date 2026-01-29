/**
 * Bulk Document Operations API
 *
 * POST /api/documents/bulk
 * Handles bulk delete and bulk update operations.
 *
 * SECURITY:
 * - All-or-nothing authorization: If ANY document doesn't belong to user, entire operation fails
 * - Maximum 100 documents per request to prevent abuse
 * - CSRF token required (validated by withApiAuth)
 *
 * @example Bulk Delete
 * ```typescript
 * const response = await fetch('/api/documents/bulk', {
 *   method: 'POST',
 *   headers: await getApiHeaders(),
 *   body: JSON.stringify({
 *     action: 'delete',
 *     ids: [1, 2, 3],
 *   }),
 * });
 * // Response: { success: true, data: { deleted: 3, requested: 3 } }
 * ```
 *
 * @example Bulk Update
 * ```typescript
 * const response = await fetch('/api/documents/bulk', {
 *   method: 'POST',
 *   headers: await getApiHeaders(),
 *   body: JSON.stringify({
 *     action: 'update',
 *     ids: [1, 2, 3],
 *     updates: { status: 'completed' },
 *   }),
 * });
 * // Response: { success: true, data: { updated: 3, requested: 3 } }
 * ```
 */

import { NextRequest } from 'next/server';
import { withApiAuth } from '@/lib/api/with-auth';
import { ApiResponseUtil } from '@/lib/response';
import { ValidationError, AuthorizationError } from '@/lib/services/errors/service-errors';
import { logger } from '@/lib/pino-logger';

interface BulkDeleteRequest {
  action: 'delete';
  ids: number[];
}

interface BulkUpdateRequest {
  action: 'update';
  ids: number[];
  updates: {
    status?: string;
    filename?: string;
  };
}

type BulkRequest = BulkDeleteRequest | BulkUpdateRequest;

export const POST = withApiAuth(async (request: NextRequest, { userEmail, services }) => {
  let body: BulkRequest;

  try {
    body = await request.json();
  } catch {
    return ApiResponseUtil.validationError(
      'Request body must be valid JSON.\n' +
        'Example delete: { "action": "delete", "ids": [1, 2, 3] }\n' +
        'Example update: { "action": "update", "ids": [1, 2, 3], "updates": { "status": "completed" } }'
    );
  }

  // Validate action
  if (!body.action || !['delete', 'update'].includes(body.action)) {
    return ApiResponseUtil.validationError(
      'Action must be "delete" or "update".\n' +
        'Example: { "action": "delete", "ids": [1, 2, 3] }',
      'action'
    );
  }

  // Validate ids
  if (!Array.isArray(body.ids) || body.ids.length === 0) {
    return ApiResponseUtil.validationError(
      'At least one document ID is required.\n' +
        'Example: { "action": "delete", "ids": [1, 2, 3] }',
      'ids'
    );
  }

  try {
    if (body.action === 'delete') {
      // @ts-ignore - Method exists on service
      const result = await services.documentService.bulkDeleteDocuments(body.ids, userEmail);

      logger.base.info('Bulk delete completed', {
        userEmail,
        deleted: result.deleted,
        requested: result.requested,
      });

      return ApiResponseUtil.success(result, { requestId: crypto.randomUUID() });
    }

    if (body.action === 'update') {
      const updateBody = body as BulkUpdateRequest;

      if (!updateBody.updates || Object.keys(updateBody.updates).length === 0) {
        return ApiResponseUtil.validationError(
          'Updates object is required for update action.\n' +
            'Example: { "action": "update", "ids": [1, 2], "updates": { "status": "completed" } }',
          'updates'
        );
      }

      // @ts-ignore - Method exists on service
      const result = await services.documentService.bulkUpdateDocuments(
        body.ids,
        updateBody.updates,
        userEmail
      );

      logger.base.info('Bulk update completed', {
        userEmail,
        updated: result.updated,
        requested: result.requested,
        updates: updateBody.updates,
      });

      return ApiResponseUtil.success(result, { requestId: crypto.randomUUID() });
    }

    return ApiResponseUtil.validationError('Unknown action');
  } catch (error) {
    if (error instanceof ValidationError) {
      // Field is stored in context, not as direct property
      const field = error.context?.field as string | undefined;
      return ApiResponseUtil.validationError(error.message, field);
    }

    if (error instanceof AuthorizationError) {
      return ApiResponseUtil.forbidden(error.message);
    }

    logger.base.error(error as Error, 'Bulk operation failed');
    return ApiResponseUtil.internalError('Bulk operation failed. Please try again.');
  }
});
