export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';

export async function GET(_request: NextRequest) {
  try {
    // Simplified dashboard stats endpoint to avoid circular dependencies
    // In a real implementation, this would check authentication and fetch stats
    
    return NextResponse.json({
      success: false,
      error: 'Authentication required',
      message: 'Dashboard stats requires authentication',
      timestamp: new Date().toISOString()
    }, { status: 401 });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch dashboard stats',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}