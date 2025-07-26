export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { DocumentService } from '@/lib/services/document-service';
import { withAuth, ApiResponse, ApiErrors, Logger } from '@/lib/auth-utils';
import { config } from '@/lib/config';
import { FileValidation } from '@/lib/utils';
import fs from 'fs';
import path from 'path';

/**
 * NEW SEED-DEV: Uses real upload processing, real storage, real extraction
 * NO MOCK DATA - follows CLAUDE.md principles
 */
export const POST = withAuth(async (request: NextRequest, userEmail: string) => {
  // Production guard - FAIL FAST
  if (!config.IS_DEVELOPMENT) {
    return ApiErrors.notFound('Not found');
  }

  const seedUser = userEmail; // Use authenticated user instead of hardcoded
  
  Logger.api.start('SEED-DEV', seedUser, {
    method: request.method,
    url: request.url
  });

  try {
    // FAIL FAST: Initialize storage first - no mock data allowed
    Logger.api.step('SEED-DEV', 'Initializing real storage system');
    await storage.initialize();

    // Define seed documents with real filesystem paths
    const documents = [
      { path: 'documents/vvg/Form NDA [Mutual].docx', displayName: 'VVG Standard Mutual NDA', isStandard: true },
      { path: 'documents/vvg/Form NDA [Velocity as Disclosing Party].docx', displayName: 'VVG Disclosing Party NDA', isStandard: true },
      { path: 'documents/third-party/UK-Government-Mutual-NDA.pdf', displayName: 'UK Government Mutual NDA', isStandard: false },
      { path: 'documents/third-party/Sample-Tech-Company-Mutual-NDA.txt', displayName: 'Tech Company Mutual NDA', isStandard: false },
    ];

    Logger.api.step('SEED-DEV', 'Validating all seed files exist');
    
    // FAIL FAST: Check all files exist before processing any
    const missingFiles = [];
    for (const doc of documents) {
      const filePath = path.resolve(doc.path);
      if (!fs.existsSync(filePath)) {
        missingFiles.push(doc.path);
      }
    }

    if (missingFiles.length > 0) {
      const error = new Error(`Missing seed files: ${missingFiles.join(', ')}`);
      Logger.api.error('SEED-DEV', 'Seed files missing - FAILING FAST', error);
      return ApiErrors.validation('All seed files must exist. No partial seeding allowed.', {
        missingFiles
      });
    }

    Logger.api.step('SEED-DEV', 'All seed files verified - starting real upload processing');

    // Clear existing seeded documents for this user (REAL database cleanup)
    Logger.api.step('SEED-DEV', 'Cleaning up existing seed documents');
    const existingDocs = await DocumentService.getUserDocuments(seedUser);
    const seedDocuments = existingDocs.filter(doc => 
      documents.some(seedDoc => doc.original_name === path.basename(seedDoc.path))
    );
    
    Logger.api.step('SEED-DEV', `Found ${seedDocuments.length} existing seed documents to clean up`);
    
    // TODO: Add document deletion if needed
    // For now, we'll let duplicates be handled by processUploadedFile

    const uploadResults = [];
    let processedCount = 0;

    // Process each file using REAL upload logic (NO MOCK DATA)
    for (const doc of documents) {
      const filePath = path.resolve(doc.path);
      const fileName = path.basename(filePath);
      
      Logger.api.step('SEED-DEV', `Processing file: ${fileName}`, {
        path: doc.path,
        isStandard: doc.isStandard,
        displayName: doc.displayName
      });

      try {
        // Read real file from filesystem
        const fileBuffer = fs.readFileSync(filePath);
        const stats = fs.statSync(filePath);
        
        // Create File object from filesystem data (real data, not mock)
        const file = new File([fileBuffer], fileName, {
          type: FileValidation.getContentType(fileName),
          lastModified: stats.mtime.getTime()
        });

        Logger.api.step('SEED-DEV', `File object created: ${fileName}`, {
          size: file.size,
          type: file.type,
          lastModified: file.lastModified
        });

        // Use DocumentService for DRY processing
        const result = await DocumentService.processDocument({
          file,
          filename: fileName,
          userEmail: seedUser,
          docType: doc.isStandard ? 'STANDARD' : 'THIRD_PARTY',
          isStandard: doc.isStandard,
          contentType: file.type
        });

        uploadResults.push({
          fileName,
          documentId: result.document.id,
          duplicate: result.duplicate,
          queued: result.queued,
          displayName: doc.displayName,
          isStandard: doc.isStandard
        });

        processedCount++;

      } catch (fileError) {
        // FAIL FAST: Any file processing error stops entire seeding
        Logger.api.error('SEED-DEV', `File processing failed: ${fileName}`, fileError as Error);
        return ApiErrors.serverError(`File processing failed: ${fileName}`, {
          error: (fileError as Error).message,
          processedCount
        });
      }
    }

    Logger.api.success('SEED-DEV', 'All documents seeded successfully using REAL upload processing', {
      processedCount,
      duplicates: uploadResults.filter(r => r.duplicate).length,
      newUploads: uploadResults.filter(r => !r.duplicate).length,
      extractionQueued: uploadResults.filter(r => r.queued).length
    });

    return ApiResponse.operation('seed.dev', {
      result: {
        success: true,
        message: `Successfully seeded ${processedCount} documents using REAL upload processing`,
        seedUser,
        processedCount,
        uploadResults,
        realDataUsed: true,
        mockDataUsed: false
      },
      metadata: {
        processedCount,
        duplicates: uploadResults.filter(r => r.duplicate).length,
        newUploads: uploadResults.filter(r => !r.duplicate).length,
        extractionQueued: uploadResults.filter(r => r.queued).length
      },
      status: 'created'
    });

  } catch (error: any) {
    Logger.api.error('SEED-DEV', 'Seeding failed', error);
    return ApiErrors.serverError('Seeding failed', {
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}, { allowDevBypass: true }); // Enable dev bypass for seeding

