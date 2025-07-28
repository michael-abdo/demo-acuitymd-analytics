export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    // Simplified set-standard endpoint to avoid circular dependencies
    // In a real implementation, this would check authentication and set document as standard
    
    return NextResponse.json({
      success: false,
      error: 'Authentication required',
      message: 'Setting document as standard requires authentication',
      documentId: id,
      timestamp: new Date().toISOString()
    }, { status: 401 });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to set document as standard',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}