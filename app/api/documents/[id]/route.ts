export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withDocumentAccess, ApiResponse } from '@/lib/auth-utils';
import { ApiErrors } from '@/lib/utils';
import { documentDb, comparisonDb } from '@/lib/nda/database';
import { Logger } from '@/lib/services/logger';
import { DocumentService } from '@/lib/services/document-service';

// GET /api/documents/[id] - Get document details
export const GET = withDocumentAccess<{ id: string }>(async (
  request: NextRequest,
  userEmail: string,
  document,
  context
) => {
  try {

    // Use centralized URL generation
    const { downloadUrl, storageMetadata } = await DocumentService.getDocumentUrls(document);

    // Get related comparisons count
    const allComparisons = await comparisonDb.findByUser(userEmail);
    const relatedComparisons = allComparisons.filter(comp => 
      comp.document1_id === document.id || comp.document2_id === document.id
    );

    // Return enhanced document data
    return ApiResponse.operation('document.get', {
      result: {
        ...document,
        downloadUrl,
        storageMetadata,
        fileType: document.filename.split('.').pop()?.toLowerCase() || 'unknown',
        sizeMB: document.file_size ? (document.file_size / 1024 / 1024).toFixed(2) : null,
        comparisonsCount: relatedComparisons.length,
        canCompare: !document.is_standard, // Can compare if it's not a standard doc
        canSetAsStandard: !document.is_standard, // Can set as standard if not already
      },
      metadata: {
        documentId: document.id,
        hasStorage: !!storageMetadata,
        hasDownloadUrl: !!downloadUrl,
        relatedComparisons: relatedComparisons.length
      }
    });

  } catch (error) {
    Logger.api.error('DOCUMENTS', 'Error fetching document details', error as Error);
    return ApiErrors.serverError('Failed to fetch document');
  }
});

// DELETE /api/documents/[id] - Delete document
export const DELETE = withDocumentAccess<{ id: string }>(async (
  request: NextRequest,
  userEmail: string,
  document,
  context
) => {
  try {

    // Check if document is used in any comparisons
    const allComparisons = await comparisonDb.findByUser(userEmail);
    const relatedComparisons = allComparisons.filter(comp => 
      comp.document1_id === document.id || comp.document2_id === document.id
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
      Logger.storage.error(`Failed to delete file from storage: ${document.filename}`, error as Error);
      // Continue with database deletion even if storage deletion fails
    }

    // Delete from database
    const deleted = await documentDb.delete(document.id);

    if (!deleted) {
      return ApiErrors.serverError('Failed to delete document');
    }

    return ApiResponse.operation('document.delete', {
      result: {
        deletedId: document.id
      },
      status: 'deleted',
      metadata: {
        deletedFromStorage: true
      }
    });

  } catch (error) {
    Logger.api.error('DOCUMENTS', 'Error deleting document', error as Error);
    return ApiErrors.serverError('Failed to delete document');
  }
});

// PATCH /api/documents/[id] - Update document metadata
export const PATCH = withDocumentAccess<{ id: string }>(async (
  request: NextRequest,
  userEmail: string,
  document,
  context
) => {
  try {

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

    const updated = await documentDb.update(document.id, updates);

    if (!updated) {
      return ApiErrors.serverError('Failed to update document');
    }

    // Return updated document
    const updatedDocument = await documentDb.findById(document.id);
    
    return ApiResponse.operation('document.update', {
      result: updatedDocument,
      status: 'updated',
      metadata: {
        updatedFields: Object.keys(updates)
      }
    });

  } catch (error) {
    Logger.api.error('DOCUMENTS', 'Error updating document', error as Error);
    return ApiErrors.serverError('Failed to update document');
  }
});