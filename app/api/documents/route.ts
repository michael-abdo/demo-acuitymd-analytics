export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';

export async function GET(_request: NextRequest) {
  try {
    // Simplified documents endpoint to avoid circular dependencies
    // In a real implementation, this would check authentication and fetch documents
    
    return NextResponse.json({
      success: false,
      error: 'Authentication required',
      message: 'Document listing requires authentication',
      timestamp: new Date().toISOString()
    }, { status: 401 });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch documents',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}