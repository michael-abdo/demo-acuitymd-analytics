export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { TimestampUtils, ApiResponse } from '@/lib/auth-utils';

/**
 * Health check endpoint for monitoring systems (Docker, PM2, load balancers)
 * Returns system status without authentication
 */
export async function GET(request: NextRequest) {
  try {
    // Basic health check - verify the app is running
    return ApiResponse.health.ok('vvg-template', {
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '0.1.0',
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        unit: 'MB'
      },
      timestamp: TimestampUtils.now()
    });
  } catch (error) {
    // If we can't even return a basic response, something is very wrong
    return ApiResponse.health.degraded('vvg-template', [
      'Health check failed',
      error instanceof Error ? error.message : 'Unknown error'
    ]);
  }
}