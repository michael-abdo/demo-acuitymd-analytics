export const dynamic = "force-dynamic";

import { ApiResponseUtil } from '@/lib/response';

/**
 * Health check endpoint for monitoring systems (Docker, load balancers, k8s)
 * Returns system status without authentication
 */
export async function GET() {
  return ApiResponseUtil.success({
    status: 'healthy',
    service: 'vvg-template',
    environment: process.env.NODE_ENV || 'development'
  });
}
