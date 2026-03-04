export const dynamic = "force-dynamic";

import { NextRequest } from 'next/server';
import { withApiAuth } from '@/lib/api/with-auth';
import { ApiResponseUtil } from '@/lib/response';

// GET /api/approval_processes - List user's approval_processes
export const GET = withApiAuth(async (request: NextRequest, { userEmail, services }) => {
  try {
    const params = request.nextUrl.searchParams;

    const options = {
      search: params.get('search') ?? undefined,
      page: Number(params.get('page')) || 1,
      pageSize: Number(params.get('pageSize')) || 25,
    };

    const result = await services.approvalProcessService.getUserApprovalProcesss(userEmail, options);

    return ApiResponseUtil.success({
      approval_processes: result.approval_processes,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('API Error in GET /api/approval_processes:', error);
    return ApiResponseUtil.error(
      { code: 'APPROVAL_PROCESS_FETCH_FAILED', message: (error as Error).message },
      500
    );
  }
});

// POST /api/approval_processes - Create a approval_process
export const POST = withApiAuth(async (request: NextRequest, { userEmail, services }) => {
  try {
    const body = await request.json();

    const item = await services.approvalProcessService.createApprovalProcess(
      { stage_name: body.stage_name, start_date: body.start_date, end_date: body.end_date, status: body.status, responsible_person: body.responsible_person },
      userEmail
    );

    return ApiResponseUtil.success(item, undefined, 201);
  } catch (error) {
    console.error('API Error in POST /api/approval_processes:', error);

    if (error instanceof SyntaxError) {
      return ApiResponseUtil.validationError(
        'Invalid JSON in request body.'
      );
    }

    return ApiResponseUtil.error(
      { code: 'APPROVAL_PROCESS_CREATE_FAILED', message: (error as Error).message },
      400
    );
  }
});
