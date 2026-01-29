export const dynamic = "force-dynamic";

import { NextRequest } from 'next/server';
import { withApiAuth } from '@/lib/api/with-auth';
import { DocumentStatus } from '@/lib/repositories/interfaces/document.repository.interface';
import { ApiResponseUtil } from '@/lib/response';
import { 
  ALLOWED_SORT_BY,
  ALLOWED_SORT_ORDER,
  ALLOWED_STATUSES,
  mapServiceError,
  parseNumberParam
} from './utils';

export const GET = withApiAuth(async (request: NextRequest, { userEmail, services }) => {
  try {
    const params = request.nextUrl.searchParams;
    const statusParam = params.get('status');
    const status = statusParam && ALLOWED_STATUSES.includes(statusParam as DocumentStatus)
      ? (statusParam as DocumentStatus)
      : undefined;

    const sortByParam = params.get('sortBy') ?? 'created_at';
    const sortOrderParam = params.get('sortOrder') ?? 'desc';

    // Date range filtering (ISO 8601 format: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)
    // Example: /api/documents?createdAfter=2024-01-01&createdBefore=2024-12-31
    const createdAfter = params.get('createdAfter') ?? undefined;
    const createdBefore = params.get('createdBefore') ?? undefined;

    const options = {
      status,
      search: params.get('search') ?? undefined,
      page: parseNumberParam(params.get('page'), 1),
      pageSize: parseNumberParam(params.get('pageSize'), 25),
      sortBy: ALLOWED_SORT_BY.has(sortByParam) ? (sortByParam as 'created_at' | 'filename') : 'created_at',
      sortOrder: ALLOWED_SORT_ORDER.has(sortOrderParam?.toLowerCase() ?? '')
        ? (sortOrderParam.toLowerCase() as 'asc' | 'desc')
        : 'desc',
      createdAfter,
      createdBefore
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

export const POST = withApiAuth(async (request: NextRequest, { userEmail, services }) => {
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
      return ApiResponseUtil.validationError(
        'Invalid JSON in request body. Ensure:\n' +
        '1. All strings use double quotes (not single quotes)\n' +
        '2. No trailing commas after the last item\n' +
        '3. All braces {} and brackets [] are matched\n' +
        'Example: {"filename": "doc.pdf", "file_path": "/uploads/doc.pdf", "file_size": 1024}'
      );
    }
    return mapServiceError(error);
  }
});
