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

// GET /api/medtech_products/:id
export const GET = withApiAuth(async (_request: NextRequest, { userEmail, services }, routeParams) => {
  try {
    const itemId = await extractId(routeParams?.params);
    if (!itemId) {
      return ApiResponseUtil.validationError('Invalid medtech_product ID. Expected a positive integer.');
    }

    const item = await services.medtechProductService.getMedtechProductById(itemId, userEmail);
    return ApiResponseUtil.success(item);
  } catch (error) {
    const message = (error as Error).message;

    if (message === 'MedtechProduct not found') {
      return ApiResponseUtil.notFound('MedtechProduct not found');
    }
    if (message === 'Access denied') {
      return ApiResponseUtil.forbidden('You do not have access to this medtech_product');
    }

    return ApiResponseUtil.error({ code: 'MEDTECH_PRODUCT_FETCH_FAILED', message }, 500);
  }
});

// PUT /api/medtech_products/:id
export const PUT = withApiAuth(async (request: NextRequest, { userEmail, services }, routeParams) => {
  try {
    const itemId = await extractId(routeParams?.params);
    if (!itemId) {
      return ApiResponseUtil.validationError('Invalid medtech_product ID. Expected a positive integer.');
    }

    const body = await request.json();
    const item = await services.medtechProductService.updateMedtechProduct(
      itemId,
      { product_name: body.product_name, approval_date: body.approval_date, market_region: body.market_region, units_sold: body.units_sold, fda_status: body.fda_status },
      userEmail
    );

    return ApiResponseUtil.success(item);
  } catch (error) {
    const message = (error as Error).message;

    if (error instanceof SyntaxError) {
      return ApiResponseUtil.validationError('Invalid JSON in request body.');
    }
    if (message === 'MedtechProduct not found') {
      return ApiResponseUtil.notFound('MedtechProduct not found');
    }
    if (message === 'Access denied') {
      return ApiResponseUtil.forbidden('You do not have access to this medtech_product');
    }

    return ApiResponseUtil.error({ code: 'MEDTECH_PRODUCT_UPDATE_FAILED', message }, 400);
  }
});

// DELETE /api/medtech_products/:id
export const DELETE = withApiAuth(async (_request: NextRequest, { userEmail, services }, routeParams) => {
  try {
    const itemId = await extractId(routeParams?.params);
    if (!itemId) {
      return ApiResponseUtil.validationError('Invalid medtech_product ID. Expected a positive integer.');
    }

    await services.medtechProductService.deleteMedtechProduct(itemId, userEmail);
    return new Response(null, { status: 204 });
  } catch (error) {
    const message = (error as Error).message;

    if (message === 'MedtechProduct not found') {
      return ApiResponseUtil.notFound('MedtechProduct not found');
    }
    if (message === 'Access denied') {
      return ApiResponseUtil.forbidden('You do not have access to this medtech_product');
    }

    return ApiResponseUtil.error({ code: 'MEDTECH_PRODUCT_DELETE_FAILED', message }, 500);
  }
});
