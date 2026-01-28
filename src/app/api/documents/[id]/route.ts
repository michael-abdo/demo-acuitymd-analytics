export const dynamic = "force-dynamic";

import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/api/with-auth';
import { ApiResponseUtil } from '@/lib/response';
import { DocumentStatus } from '@/lib/repositories/interfaces/document.repository.interface';
import { ALLOWED_STATUSES, mapServiceError } from '../utils';

const parseDocumentId = (rawId: string | undefined): number | null => {
  if (!rawId) {
    return null;
  }

  const parsed = Number.parseInt(rawId, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return null;
  }

  return parsed;
};

// Next.js 15: params is now a Promise
const extractId = async (paramsPromise?: Promise<{ id?: string }>): Promise<number | null> => {
  if (!paramsPromise) return null;
  const params = await paramsPromise;
  return parseDocumentId(params?.id);
};

export const GET = withAuth(async (_request: NextRequest, { userEmail, services }, routeParams) => {
  try {
    const documentId = await extractId(routeParams?.params);
    if (!documentId) {
      return ApiResponseUtil.validationError(
        'Invalid document ID. Expected a positive integer (e.g., /api/documents/5). ' +
        'Document IDs are numeric values returned when you create a document.',
        'id'
      );
    }

    const document = await services.documentService.getDocumentById(documentId, userEmail);
    return ApiResponseUtil.success(
      document,
      { requestId: crypto.randomUUID() }
    );
  } catch (error) {
    console.error('API Error in GET /api/documents/[id]:', error);
    return mapServiceError(error);
  }
});

export const PUT = withAuth(async (request: NextRequest, { userEmail, services }, routeParams) => {
  try {
    const documentId = await extractId(routeParams?.params);
    if (!documentId) {
      return ApiResponseUtil.validationError(
        'Invalid document ID. Expected a positive integer (e.g., /api/documents/5). ' +
        'Document IDs are numeric values returned when you create a document.',
        'id'
      );
    }

    const body = await request.json();
    const payload = {
      filename: body?.filename,
      status: body?.status && ALLOWED_STATUSES.includes(body.status as DocumentStatus)
        ? (body.status as DocumentStatus)
        : body?.status
    };

    const hasUpdates = Object.values(payload).some((value) => value !== undefined);
    if (!hasUpdates) {
      return ApiResponseUtil.validationError(
        'No valid fields to update. Allowed fields: filename, status.\n' +
        'Example: {"filename": "new-name.pdf"} or {"status": "completed"}\n' +
        'Valid status values: uploaded, processing, completed, failed',
        undefined
      );
    }

    const updatedDocument = await services.documentService.updateDocument(documentId, payload, userEmail);
    return ApiResponseUtil.success(
      updatedDocument,
      { requestId: crypto.randomUUID() }
    );
  } catch (error) {
    console.error('API Error in PUT /api/documents/[id]:', error);
    if (error instanceof SyntaxError) {
      return ApiResponseUtil.validationError(
        'Invalid JSON in request body. Ensure:\n' +
        '1. All strings use double quotes (not single quotes)\n' +
        '2. No trailing commas after the last item\n' +
        '3. All braces {} and brackets [] are matched\n' +
        'Example: {"filename": "new-name.pdf", "status": "completed"}'
      );
    }
    return mapServiceError(error);
  }
});

export const DELETE = withAuth(async (_request: NextRequest, { userEmail, services }, routeParams) => {
  try {
    const documentId = await extractId(routeParams?.params);
    if (!documentId) {
      return ApiResponseUtil.validationError(
        'Invalid document ID. Expected a positive integer (e.g., /api/documents/5). ' +
        'Document IDs are numeric values returned when you create a document.',
        'id'
      );
    }

    await services.documentService.deleteDocument(documentId, userEmail);
    // 204 No Content - no body allowed
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('API Error in DELETE /api/documents/[id]:', error);
    return mapServiceError(error);
  }
});
