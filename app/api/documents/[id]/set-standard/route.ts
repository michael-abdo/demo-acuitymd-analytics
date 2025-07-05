import { NextRequest, NextResponse } from 'next/server';
import { withAuthDynamic } from '@/lib/auth-utils';
import { ApiErrors, parseDocumentId, isDocumentOwner } from '@/lib/utils';
import { documentDb } from '@/lib/nda/database';

// POST /api/documents/[id]/set-standard - Mark document as standard template
export const POST = withAuthDynamic<{ id: string }>(async (
  request: NextRequest,
  userEmail: string,
  context
) => {
  try {
    const documentId = parseDocumentId(context.params.id);
    if (!documentId) {
      return ApiErrors.badRequest('Invalid document ID');
    }

    // Get document from database
    const document = await documentDb.findById(documentId);

    if (!document) {
      return ApiErrors.notFound('Document');
    }

    // Check ownership
    if (!isDocumentOwner(document, userEmail)) {
      return ApiErrors.forbidden();
    }

    // Check if already standard
    if (document.is_standard) {
      return ApiErrors.badRequest('Document is already marked as standard');
    }

    // Optional: Unmark other standard documents for this user
    // This ensures only one standard document per user
    const userDocuments = await documentDb.findByUser(userEmail);
    const currentStandardDocs = userDocuments.filter(doc => doc.is_standard);
    
    // If user wants only one standard doc, uncomment this:
    // for (const standardDoc of currentStandardDocs) {
    //   await documentDb.update(standardDoc.id, { is_standard: false });
    // }

    // Mark this document as standard
    const updated = await documentDb.update(documentId, { is_standard: true });

    if (!updated) {
      return ApiErrors.serverError('Failed to update document');
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
    return ApiErrors.serverError('Failed to set document as standard');
  }
});