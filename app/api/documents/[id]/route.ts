import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-utils';
import { ApiErrors, parseDocumentId, isDocumentOwner } from '@/lib/utils';
import { documentDb, comparisonDb } from '@/lib/nda/database';
import { storage } from '@/lib/storage';

// GET /api/documents/[id] - Get document details
export const GET = withAuth<{ id: string }>(async (
  request: NextRequest,
  userEmail: string,
  context
) => {
  try {
    const documentId = parseDocumentId(context!.params.id);
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
    const allComparisons = await comparisonDb.findByUser(userEmail);
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
    return ApiErrors.serverError('Failed to fetch document');
  }
});

// DELETE /api/documents/[id] - Delete document
export const DELETE = withAuth<{ id: string }>(async (
  request: NextRequest,
  userEmail: string,
  context
) => {
  try {
    const documentId = parseDocumentId(context!.params.id);
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

    // Check if document is used in any comparisons
    const allComparisons = await comparisonDb.findByUser(userEmail);
    const relatedComparisons = allComparisons.filter(comp => 
      comp.standard_doc_id === documentId || comp.compared_doc_id === documentId
    );

    if (relatedComparisons.length > 0) {
      return ApiErrors.validation('Cannot delete document that has been used in comparisons', {
        comparisonsCount: relatedComparisons.length
      });
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
      return ApiErrors.serverError('Failed to delete document');
    }

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully',
      deletedId: documentId
    });

  } catch (error) {
    console.error('Error deleting document:', error);
    return ApiErrors.serverError('Failed to delete document');
  }
});

// PATCH /api/documents/[id] - Update document metadata
export const PATCH = withAuth<{ id: string }>(async (
  request: NextRequest,
  userEmail: string,
  context
) => {
  try {
    const documentId = parseDocumentId(context!.params.id);
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
      return ApiErrors.badRequest('No valid updates provided');
    }

    const updated = await documentDb.update(documentId, updates);

    if (!updated) {
      return ApiErrors.serverError('Failed to update document');
    }

    // Return updated document
    const updatedDocument = await documentDb.findById(documentId);
    
    return NextResponse.json({
      success: true,
      document: updatedDocument
    });

  } catch (error) {
    console.error('Error updating document:', error);
    return ApiErrors.serverError('Failed to update document');
  }
});