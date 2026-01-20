export const dynamic = "force-dynamic";

import { ApiResponseUtil } from '@/lib/response';

/**
 * Storage health check endpoint
 * Returns storage configuration status without authentication
 */
export async function GET() {
  const hasS3Config = !!(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.S3_BUCKET_NAME
  );

  if (hasS3Config) {
    return ApiResponseUtil.success({
      status: 'healthy',
      service: 'storage',
      provider: 's3',
      configured: true
    });
  }

  return ApiResponseUtil.error({
    code: 'STORAGE_NOT_CONFIGURED',
    message: 'S3 storage not configured'
  }, 503);
}
