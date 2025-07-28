export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    // For now, return a simple response to avoid circular dependencies
    // In a real implementation, this would check authentication and fetch document
    
    return NextResponse.json({
      success: true,
      operation: 'preview.get',
      message: 'Document preview endpoint (authentication required)',
      data: {
        documentId: id,
        preview: null,
        message: 'Please implement authentication and document fetching'
      },
      timestamp: new Date().toISOString()
    }, { status: 401 }); // Return 401 since we don't have auth implemented in simple version
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to get document preview',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}