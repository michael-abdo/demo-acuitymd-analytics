import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { documentDb } from '@/lib/nda/database';

// POST /api/documents/[id]/set-standard - Mark document as standard template
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const documentId = parseInt(params.id, 10);
    if (isNaN(documentId)) {
      return NextResponse.json({ error: 'Invalid document ID' }, { status: 400 });
    }

    // Get document from database
    const document = await documentDb.findById(documentId);

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Check ownership
    if (document.user_id !== session.user.email) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check if already standard
    if (document.is_standard) {
      return NextResponse.json({ 
        error: 'Document is already marked as standard' 
      }, { status: 400 });
    }

    // Optional: Unmark other standard documents for this user
    // This ensures only one standard document per user
    const userDocuments = await documentDb.findByUser(session.user.email);
    const currentStandardDocs = userDocuments.filter(doc => doc.is_standard);
    
    // If user wants only one standard doc, uncomment this:
    // for (const standardDoc of currentStandardDocs) {
    //   await documentDb.update(standardDoc.id, { is_standard: false });
    // }

    // Mark this document as standard
    const updated = await documentDb.update(documentId, { is_standard: true });

    if (!updated) {
      return NextResponse.json({ error: 'Failed to update document' }, { status: 500 });
    }

    // Return updated document
    const updatedDocument = await documentDb.findById(documentId);
    
    return NextResponse.json({
      success: true,
      message: 'Document marked as standard template',
      document: updatedDocument,
      previousStandardCount: currentStandardDocs.length
    });

  } catch (error) {
    console.error('Error setting document as standard:', error);
    return NextResponse.json(
      { error: 'Failed to set document as standard' },
      { status: 500 }
    );
  }
}