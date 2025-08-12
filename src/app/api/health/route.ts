export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withLogging } from '@/lib/api-logging';

/**
 * Health check endpoint for monitoring systems (Docker, PM2, load balancers)
 * Returns system status without authentication
 */
async function healthHandler(_request: NextRequest) {
  // Simple health check for monitoring systems
  return NextResponse.json({
    ok: true,
    service: 'vvg-template',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
}

export const GET = withLogging(healthHandler, 'health-check');