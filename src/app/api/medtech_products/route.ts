export const dynamic = "force-dynamic";

import { NextRequest } from 'next/server';
import { withApiAuth } from '@/lib/api/with-auth';
import { ApiResponseUtil } from '@/lib/response';

// GET /api/medtech_products - List user's medtech_products
export const GET = withApiAuth(async (request: NextRequest, { userEmail, services }) => {
  try {
    const params = request.nextUrl.searchParams;

    const options = {
      search: params.get('search') ?? undefined,
      page: Number(params.get('page')) || 1,
      pageSize: Number(params.get('pageSize')) || 25,
    };

    const result = await services.medtechProductService.getUserMedtechProducts(userEmail, options);

    return ApiResponseUtil.success({
      medtech_products: result.medtech_products,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('API Error in GET /api/medtech_products:', error);
    return ApiResponseUtil.error(
      { code: 'MEDTECH_PRODUCT_FETCH_FAILED', message: (error as Error).message },
      500
    );
  }
});

// POST /api/medtech_products - Create a medtech_product
export const POST = withApiAuth(async (request: NextRequest, { userEmail, services }) => {
  try {
    const body = await request.json();

    const item = await services.medtechProductService.createMedtechProduct(
      { product_name: body.product_name, approval_date: body.approval_date, market_region: body.market_region, units_sold: body.units_sold, fda_status: body.fda_status },
      userEmail
    );

    return ApiResponseUtil.success(item, undefined, 201);
  } catch (error) {
    console.error('API Error in POST /api/medtech_products:', error);

    if (error instanceof SyntaxError) {
      return ApiResponseUtil.validationError(
        'Invalid JSON in request body.'
      );
    }

    return ApiResponseUtil.error(
      { code: 'MEDTECH_PRODUCT_CREATE_FAILED', message: (error as Error).message },
      400
    );
  }
});
