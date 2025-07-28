export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    // Simplified download endpoint to avoid circular dependencies
    // In a real implementation, this would check authentication and fetch document
    
    return NextResponse.json({
      success: false,
      error: 'Authentication required',
      message: 'Document download requires authentication',
      documentId: id,
      timestamp: new Date().toISOString()
    }, { status: 401 });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to download document',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}