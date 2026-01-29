/**
 * Tags API Route
 *
 * GET /api/tags - List all tags for the authenticated user
 * POST /api/tags - Create a new tag
 *
 * SECURITY:
 * - All operations are user-scoped
 * - CSRF token required for POST (validated by withApiAuth)
 *
 * @example Create tag
 * ```typescript
 * const response = await fetch('/api/tags', {
 *   method: 'POST',
 *   headers: await getApiHeaders(),
 *   body: JSON.stringify({ name: 'Important' }),
 * });
 * ```
 */

import { NextRequest } from 'next/server';
import { withApiAuth } from '@/lib/api/with-auth';
import { ApiResponseUtil } from '@/lib/response';
import { tagService } from '@/lib/services/tag.service';
import {
  ValidationError,
  ConflictError,
} from '@/lib/services/errors/service-errors';
import { logger } from '@/lib/pino-logger';

export const GET = withApiAuth(async (_request: NextRequest, { userEmail }) => {
  try {
    const tags = await tagService.getUserTags(userEmail);

    return ApiResponseUtil.success(
      { tags },
      { requestId: crypto.randomUUID() }
    );
  } catch (error) {
    logger.base.error(error as Error, 'Failed to get tags');
    return ApiResponseUtil.internalError('Failed to retrieve tags');
  }
});

export const POST = withApiAuth(async (request: NextRequest, { userEmail }) => {
  let body: { name?: string };

  try {
    body = await request.json();
  } catch {
    return ApiResponseUtil.validationError(
      'Request body must be valid JSON.\n' +
        'Example: { "name": "Important" }',
      'body'
    );
  }

  if (!body.name) {
    return ApiResponseUtil.validationError(
      'Tag name is required.\n' +
        'Example: { "name": "Important" }',
      'name'
    );
  }

  try {
    const tag = await tagService.createTag(body.name, userEmail);

    logger.base.info('Tag created', {
      tagId: tag.id,
      tagName: tag.name,
      userEmail,
    });

    return ApiResponseUtil.success(tag, { requestId: crypto.randomUUID() }, 201);
  } catch (error) {
    if (error instanceof ValidationError) {
      return ApiResponseUtil.validationError(error.message);
    }

    if (error instanceof ConflictError) {
      return ApiResponseUtil.error(
        { code: 'TAG_EXISTS', message: error.message },
        409
      );
    }

    logger.base.error(error as Error, 'Failed to create tag');
    return ApiResponseUtil.internalError('Failed to create tag');
  }
});
