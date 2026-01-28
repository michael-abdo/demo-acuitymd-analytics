export const dynamic = "force-dynamic";

import { ApiResponseUtil } from '@/lib/response';

/**
 * Health check endpoint for monitoring systems (Docker, load balancers, k8s)
 * Returns system status without authentication
 */
export async function GET() {
  // SECURITY: Return minimal info - don't expose environment or internal details
  return ApiResponseUtil.success({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
}
