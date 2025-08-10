export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';

export async function POST(_request: NextRequest) {
  try {
    // Simplified seeding endpoint to avoid circular dependencies
    // Only available in development - production returns 404
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Authentication required',
      message: 'Seeding requires authentication',
      timestamp: new Date().toISOString()
    }, { status: 401 });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to seed development data',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

