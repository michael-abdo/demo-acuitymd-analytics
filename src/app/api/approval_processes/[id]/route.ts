export const dynamic = "force-dynamic";

import { NextRequest } from 'next/server';
import { withApiAuth } from '@/lib/api/with-auth';
import { ApiResponseUtil } from '@/lib/response';

const extractId = async (paramsPromise?: Promise<{ id?: string }>): Promise<number | null> => {
  if (!paramsPromise) return null;
  const params = await paramsPromise;
  const parsed = Number.parseInt(params?.id ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

// GET /api/approval_processes/:id
export const GET = withApiAuth(async (_request: NextRequest, { userEmail, services }, routeParams) => {
  try {
    const itemId = await extractId(routeParams?.params);
    if (!itemId) {
      return ApiResponseUtil.validationError('Invalid approval_process ID. Expected a positive integer.');
    }

    const item = await services.approvalProcessService.getApprovalProcessById(itemId, userEmail);
    return ApiResponseUtil.success(item);
  } catch (error) {
    const message = (error as Error).message;

    if (message === 'ApprovalProcess not found') {
      return ApiResponseUtil.notFound('ApprovalProcess not found');
    }
    if (message === 'Access denied') {
      return ApiResponseUtil.forbidden('You do not have access to this approval_process');
    }

    return ApiResponseUtil.error({ code: 'APPROVAL_PROCESS_FETCH_FAILED', message }, 500);
  }
});

// PUT /api/approval_processes/:id
export const PUT = withApiAuth(async (request: NextRequest, { userEmail, services }, routeParams) => {
  try {
    const itemId = await extractId(routeParams?.params);
    if (!itemId) {
      return ApiResponseUtil.validationError('Invalid approval_process ID. Expected a positive integer.');
    }

    const body = await request.json();
    const item = await services.approvalProcessService.updateApprovalProcess(
      itemId,
      { stage_name: body.stage_name, start_date: body.start_date, end_date: body.end_date, status: body.status, responsible_person: body.responsible_person },
      userEmail
    );

    return ApiResponseUtil.success(item);
  } catch (error) {
    const message = (error as Error).message;

    if (error instanceof SyntaxError) {
      return ApiResponseUtil.validationError('Invalid JSON in request body.');
    }
    if (message === 'ApprovalProcess not found') {
      return ApiResponseUtil.notFound('ApprovalProcess not found');
    }
    if (message === 'Access denied') {
      return ApiResponseUtil.forbidden('You do not have access to this approval_process');
    }

    return ApiResponseUtil.error({ code: 'APPROVAL_PROCESS_UPDATE_FAILED', message }, 400);
  }
});

// DELETE /api/approval_processes/:id
export const DELETE = withApiAuth(async (_request: NextRequest, { userEmail, services }, routeParams) => {
  try {
    const itemId = await extractId(routeParams?.params);
    if (!itemId) {
      return ApiResponseUtil.validationError('Invalid approval_process ID. Expected a positive integer.');
    }

    await services.approvalProcessService.deleteApprovalProcess(itemId, userEmail);
    return new Response(null, { status: 204 });
  } catch (error) {
    const message = (error as Error).message;

    if (message === 'ApprovalProcess not found') {
      return ApiResponseUtil.notFound('ApprovalProcess not found');
    }
    if (message === 'Access denied') {
      return ApiResponseUtil.forbidden('You do not have access to this approval_process');
    }

    return ApiResponseUtil.error({ code: 'APPROVAL_PROCESS_DELETE_FAILED', message }, 500);
  }
});
