export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withDocumentAccess, ApiResponse, ApiErrors, Logger } from '@/lib/auth-utils';
import { documentDb, DocumentService } from '@/lib/constants';

// POST /api/documents/[id]/set-standard - Mark document as standard template
export const POST = withDocumentAccess<{ id: string }>(async (
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
    const userDocuments = await DocumentService.getUserDocuments(userEmail);
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
    
    return ApiResponse.successWithMeta(
      updatedDocument,
      { previousStandardCount: currentStandardDocs.length },
      'Document marked as standard template'
    );

  } catch (error) {
    Logger.api.error('SET_STANDARD', 'Error setting document as standard', error as Error);
    return ApiErrors.serverError('Failed to set document as standard');
  }
});