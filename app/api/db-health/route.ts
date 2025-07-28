export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';

export async function GET() {
  // Check if database is configured
  const hasDbConfig = !!(
    process.env.DB_HOST && 
    process.env.DB_USER && 
    process.env.DB_PASSWORD && 
    process.env.DB_NAME
  );

  if (hasDbConfig) {
    return NextResponse.json({
      status: 'healthy',
      service: 'db',
      message: 'Database configured and ready',
      timestamp: new Date().toISOString()
    });
  } else {
    return NextResponse.json({
      status: 'degraded',
      service: 'db',
      message: 'Database not configured - using in-memory storage',
      details: {
        hasDbAccess: false,
        mode: 'in-memory',
        recommendation: 'Configure DB_HOST, DB_USER, DB_PASSWORD, and DB_NAME for production'
      },
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }
}