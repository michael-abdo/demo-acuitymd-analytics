export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';

export async function GET() {
  // Check if S3 is configured
  const hasS3Config = !!(
    process.env.AWS_ACCESS_KEY_ID && 
    process.env.AWS_SECRET_ACCESS_KEY && 
    process.env.S3_BUCKET_NAME
  );

  if (hasS3Config) {
    return NextResponse.json({
      status: 'healthy',
      service: 'storage',
      message: 'S3 storage configured and ready',
      provider: 's3',
      timestamp: new Date().toISOString()
    });
  } else {
    return NextResponse.json({
      status: 'degraded',
      service: 'storage',
      message: 'Using local storage - S3 not configured',
      provider: 'local',
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }
}