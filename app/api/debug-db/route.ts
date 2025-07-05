import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Only work in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  try {
    // Access the global memory store directly
    const memoryStore = (global as any)._ndaMemoryStore;
    
    if (!memoryStore) {
      return NextResponse.json({ 
        message: 'Memory store not initialized',
        documentsCount: 0,
        documents: []
      });
    }

    const documents = Array.from(memoryStore.documents.values());
    
    return NextResponse.json({
      message: 'Memory store contents',
      documentsCount: documents.length,
      documents: documents.map(doc => ({
        id: doc.id,
        filename: doc.filename,
        display_name: doc.display_name,
        user_id: doc.user_id,
        is_standard: doc.is_standard,
        status: doc.status
      }))
    });

  } catch (error: any) {
    return NextResponse.json({
      error: 'Failed to read memory store',
      message: error.message
    }, { status: 500 });
  }
}