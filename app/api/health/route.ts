export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';

/**
 * Health check endpoint for monitoring systems (Docker, PM2, load balancers)
 * Returns system status without authentication
 */
export async function GET(request: NextRequest) {
  // Simple health check for monitoring systems
  return NextResponse.json({
    ok: true,
    service: 'vvg-template',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
}