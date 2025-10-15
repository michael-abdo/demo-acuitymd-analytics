export const dynamic = "force-dynamic";

import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/api/with-auth';
import { DocumentStatus } from '@/lib/repositories/interfaces/document.repository.interface';
import { ApiResponseUtil } from '@/lib/response';
import { 
  ALLOWED_SORT_BY,
  ALLOWED_SORT_ORDER,
  ALLOWED_STATUSES,
  mapServiceError,
  parseNumberParam
} from './utils';

export const GET = withAuth(async (request: NextRequest, { userEmail, services }) => {
  try {
    const params = request.nextUrl.searchParams;
    const statusParam = params.get('status');
    const status = statusParam && ALLOWED_STATUSES.includes(statusParam as DocumentStatus)
      ? (statusParam as DocumentStatus)
      : undefined;

    const sortByParam = params.get('sortBy') ?? 'created_at';
    const sortOrderParam = params.get('sortOrder') ?? 'desc';

    const options = {
      status,
      search: params.get('search') ?? undefined,
      page: parseNumberParam(params.get('page'), 1),
      pageSize: parseNumberParam(params.get('pageSize'), 25),
      sortBy: ALLOWED_SORT_BY.has(sortByParam) ? (sortByParam as 'created_at' | 'filename') : 'created_at',
      sortOrder: ALLOWED_SORT_ORDER.has(sortOrderParam?.toLowerCase() ?? '')
        ? (sortOrderParam.toLowerCase() as 'asc' | 'desc')
        : 'desc'
    };

    const result = await services.documentService.getUserDocuments(userEmail, options);

    return ApiResponseUtil.success(
      {
        documents: result.documents,
        pagination: result.pagination
      },
      {
        requestId: crypto.randomUUID(),
        pagination: result.pagination
      }
    );
  } catch (error) {
    console.error('API Error in GET /api/documents:', error);
    return mapServiceError(error);
  }
});

export const POST = withAuth(async (request: NextRequest, { userEmail, services }) => {
  try {
    const body = await request.json();

    const payload = {
      filename: body?.filename,
      file_path: body?.file_path,
      file_size: body?.file_size,
      status: body?.status as DocumentStatus | undefined
    };

    const createdDocument = await services.documentService.createDocument(payload, userEmail);

    return ApiResponseUtil.success(
      createdDocument,
      { requestId: crypto.randomUUID() },
      201
    );
  } catch (error) {
    console.error('API Error in POST /api/documents:', error);
    if (error instanceof SyntaxError) {
      return ApiResponseUtil.validationError('Invalid JSON payload');
    }
    return mapServiceError(error);
  }
});
