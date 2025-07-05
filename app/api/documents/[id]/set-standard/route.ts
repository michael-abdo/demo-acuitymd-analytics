import { NextRequest, NextResponse } from 'next/server';
import { withDocumentAccess } from '@/lib/auth-utils';
import { ApiErrors } from '@/lib/utils';
import { documentDb } from '@/lib/nda/database';

// POST /api/documents/[id]/set-standard - Mark document as standard template
export const POST = withDocumentAccess(async (
  request: NextRequest,
  userEmail: string,
  document,
  context
) => {
  try {

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
    const updated = await documentDb.update(document.id, { is_standard: true });

    if (!updated) {
      return ApiErrors.serverError('Failed to update document');
    }

    // Return updated document
    const updatedDocument = await documentDb.findById(document.id);
    
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