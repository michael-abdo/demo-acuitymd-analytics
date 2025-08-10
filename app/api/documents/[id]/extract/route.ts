export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    // Simplified extraction endpoint to avoid circular dependencies
    // In a real implementation, this would check authentication and trigger extraction
    
    return NextResponse.json({
      success: false,
      error: 'Authentication required',
      message: 'Text extraction requires authentication',
      documentId: id,
      timestamp: new Date().toISOString()
    }, { status: 401 });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to trigger text extraction',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    // Simplified extraction status endpoint to avoid circular dependencies
    // In a real implementation, this would check authentication and return status
    
    return NextResponse.json({
      success: false,
      error: 'Authentication required',
      message: 'Extraction status requires authentication',
      documentId: id,
      timestamp: new Date().toISOString()
    }, { status: 401 });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to get extraction status',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}