export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withDocumentAccess, ApiResponse, ApiErrors, Logger } from '@/lib/auth-utils';
import { documentDb, comparisonDb } from '@/lib/nda/database';
import { DocumentService } from '@/lib/services/document-service';

// GET /api/documents/[id] - Get document details
export const GET = withDocumentAccess<{ id: string }>(async (
  request: NextRequest,
  userEmail: string,
  document,
  context
) => {
  try {
    // Use centralized enhanced document getter (DRY principle)
    const enhancedDocument = await DocumentService.getEnhancedDocument(userEmail, document.id);
    
    if (!enhancedDocument) {
      return ApiErrors.notFound('Document not found');
    }

    // Return enhanced document data
    return ApiResponse.operation('document.get', {
      result: {
        ...enhancedDocument,
        comparisonsCount: enhancedDocument.relatedComparisons, // Alias for backward compatibility
      },
      metadata: {
        documentId: document.id,
        hasStorage: !!enhancedDocument.storageMetadata,
        hasDownloadUrl: !!enhancedDocument.downloadUrl,
        relatedComparisons: enhancedDocument.relatedComparisons
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
    // Use centralized deletion logic (DRY principle)
    const result = await DocumentService.deleteDocument(userEmail, document.id);

    if (!result.deleted) {
      return ApiErrors.validation(result.error || 'Failed to delete document');
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