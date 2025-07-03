import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { documentDb, comparisonDb } from '@/lib/nda/database';
import { storage } from '@/lib/storage';

// GET /api/documents/[id] - Get document details
export async function GET(
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

    // Get document metadata from storage
    let storageMetadata = null;
    let downloadUrl = null;
    
    try {
      const exists = await storage.exists(document.filename);
      
      if (exists) {
        // Get metadata
        storageMetadata = await storage.head(document.filename);
        
        // Generate signed URL for download
        if (storage.isS3?.()) {
          downloadUrl = await storage.getSignedUrl(document.filename, 'get', { expires: 3600 });
        } else {
          // For local storage, we'll create a download endpoint
          downloadUrl = `/api/documents/${documentId}/download`;
        }
      }
    } catch (error) {
      console.error(`Failed to get storage metadata for ${document.filename}:`, error);
    }

    // Get related comparisons count
    const allComparisons = await comparisonDb.findByUser(session.user.email);
    const relatedComparisons = allComparisons.filter(comp => 
      comp.standard_doc_id === documentId || comp.compared_doc_id === documentId
    );

    // Return enhanced document data
    return NextResponse.json({
      ...document,
      downloadUrl,
      storageMetadata,
      fileType: document.filename.split('.').pop()?.toLowerCase() || 'unknown',
      sizeMB: document.file_size ? (document.file_size / 1024 / 1024).toFixed(2) : null,
      comparisonsCount: relatedComparisons.length,
      canCompare: !document.is_standard, // Can compare if it's not a standard doc
      canSetAsStandard: !document.is_standard, // Can set as standard if not already
    });

  } catch (error) {
    console.error('Error fetching document:', error);
    return NextResponse.json(
      { error: 'Failed to fetch document' },
      { status: 500 }
    );
  }
}

// DELETE /api/documents/[id] - Delete document
export async function DELETE(
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

    // Check if document is used in any comparisons
    const allComparisons = await comparisonDb.findByUser(session.user.email);
    const relatedComparisons = allComparisons.filter(comp => 
      comp.standard_doc_id === documentId || comp.compared_doc_id === documentId
    );

    if (relatedComparisons.length > 0) {
      return NextResponse.json({
        error: 'Cannot delete document that has been used in comparisons',
        comparisonsCount: relatedComparisons.length
      }, { status: 400 });
    }

    // Delete from storage
    try {
      const exists = await storage.exists(document.filename);
      if (exists) {
        await storage.delete(document.filename);
      }
    } catch (error) {
      console.error(`Failed to delete file from storage: ${document.filename}`, error);
      // Continue with database deletion even if storage deletion fails
    }

    // Delete from database
    const deleted = await documentDb.delete(documentId);

    if (!deleted) {
      return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully',
      deletedId: documentId
    });

  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}

// PATCH /api/documents/[id] - Update document metadata
export async function PATCH(
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

    // Parse request body
    const body = await request.json();
    const { display_name, is_standard } = body;

    // Update document
    const updates: any = {};
    if (typeof display_name === 'string') {
      updates.display_name = display_name.trim() || null;
    }
    if (typeof is_standard === 'boolean') {
      updates.is_standard = is_standard;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid updates provided' }, { status: 400 });
    }

    const updated = await documentDb.update(documentId, updates);

    if (!updated) {
      return NextResponse.json({ error: 'Failed to update document' }, { status: 500 });
    }

    // Return updated document
    const updatedDocument = await documentDb.findById(documentId);
    
    return NextResponse.json({
      success: true,
      document: updatedDocument
    });

  } catch (error) {
    console.error('Error updating document:', error);
    return NextResponse.json(
      { error: 'Failed to update document' },
      { status: 500 }
    );
  }
}