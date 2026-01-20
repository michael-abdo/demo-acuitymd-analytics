export const dynamic = "force-dynamic";

import { ApiResponseUtil } from '@/lib/response';
import pool from '@/lib/database/connection';

/**
 * Database health check endpoint
 * Tests database connectivity without authentication
 */
export async function GET() {
  try {
    // Test database connection with a simple query
    await pool.execute('SELECT 1');

    return ApiResponseUtil.success({
      status: 'healthy',
      service: 'database',
      connected: true
    });
  } catch (error) {
    return ApiResponseUtil.error({
      code: 'DB_CONNECTION_ERROR',
      message: 'Database connection failed'
    }, 503);
  }
}
