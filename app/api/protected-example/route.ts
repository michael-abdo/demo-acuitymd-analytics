export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    operation: 'protected.get',
    message: 'Protected example endpoint',
    timestamp: new Date().toISOString()
  });
}

export async function POST() {
  return NextResponse.json({
    success: true,
    operation: 'protected.post',
    message: 'Protected example POST endpoint',
    timestamp: new Date().toISOString()
  });
}