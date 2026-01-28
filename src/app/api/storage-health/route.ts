export const dynamic = "force-dynamic";

import { ApiResponseUtil } from '@/lib/response';

/**
 * Storage health check endpoint
 * Returns storage configuration status without authentication
 */
export async function GET() {
  // SECURITY: Don't reveal whether S3 is configured or provider details
  const hasS3Config = !!(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.S3_BUCKET_NAME
  );

  // Return generic status - don't expose configuration details
  return ApiResponseUtil.success({
    status: hasS3Config ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString()
  });
}
