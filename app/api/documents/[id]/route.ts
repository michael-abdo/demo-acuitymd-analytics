export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Simplified document endpoint to avoid circular dependencies
  return NextResponse.json({
    success: false,
    error: 'Authentication required',
    message: 'Document access requires authentication',
    documentId: id,
    timestamp: new Date().toISOString()
  }, { status: 401 });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Simplified document update endpoint
  return NextResponse.json({
    success: false,
    error: 'Authentication required',
    message: 'Document update requires authentication',
    documentId: id,
    timestamp: new Date().toISOString()
  }, { status: 401 });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Simplified document delete endpoint
  return NextResponse.json({
    success: false,
    error: 'Authentication required',
    message: 'Document deletion requires authentication',
    documentId: id,
    timestamp: new Date().toISOString()
  }, { status: 401 });
}