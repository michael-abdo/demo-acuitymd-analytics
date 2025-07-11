export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';

/**
 * Health check endpoint for monitoring systems (Docker, PM2, load balancers)
 * Returns system status without authentication
 */
export async function GET(request: NextRequest) {
  try {
    // Basic health check - verify the app is running
    const response = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '0.1.0',
      service: '${PROJECT_NAME}',
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        unit: 'MB'
      }
    };

    return NextResponse.json(response, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Health-Check': 'passed'
      }
    });
  } catch (error) {
    // If we can't even return a basic response, something is very wrong
    return NextResponse.json(
      { 
        status: 'unhealthy', 
        timestamp: new Date().toISOString(),
        error: 'Health check failed'
      }, 
      { status: 503 }
    );
  }
}