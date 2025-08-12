export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';

export async function GET() {
  // Check if database is configured
  const hasDbConfig = !!(
    process.env.MYSQL_HOST && 
    process.env.MYSQL_USER && 
    process.env.MYSQL_PASSWORD && 
    process.env.MYSQL_DATABASE
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
        recommendation: 'Configure MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, and MYSQL_DATABASE for production'
      },
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }
}