import { NextRequest, NextResponse } from 'next/server';
import { compareDocuments } from '@/lib/text-extraction';
import { documentDb } from '@/lib/nda/database';
import { ensureStorageInitialized } from '@/lib/storage';

/**
 * Test endpoint for compare functionality
 * SMALLEST FEATURE: Direct test without auth complexity
 * FAIL FAST: Returns clear errors
 * DRY: Reuses existing compare logic
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🧪 [TEST-COMPARE] Running test comparison...');
    
    // Initialize storage (DRY - reuse initialization)
    await ensureStorageInitialized();
    
    // Test with documents that worked in previous run
    const standardDocId = 2;  // DOCX file that works
    const thirdPartyDocId = 3; // Text fallback that worked
    const testUserEmail = 'michaelabdo@vvgtruck.com';
    
    // Fetch documents (DRY - reuse existing logic)
    const userDocuments = await documentDb.findByUser(testUserEmail);
    const standardDoc = userDocuments.find(doc => doc.id === standardDocId);
    const thirdPartyDoc = userDocuments.find(doc => doc.id === thirdPartyDocId);
    
    if (!standardDoc || !thirdPartyDoc) {
      return NextResponse.json({
        error: 'Documents not found',
        details: {
          userDocuments: userDocuments.map(d => ({ id: d.id, name: d.original_name })),
          standardFound: !!standardDoc,
          thirdPartyFound: !!thirdPartyDoc
        }
      }, { status: 404 });
    }
    
    if (!standardDoc.extracted_text || !thirdPartyDoc.extracted_text) {
      // Auto-extract if needed (DRY - reuse extraction logic)
      console.log('🔄 [TEST-COMPARE] Triggering text extraction...');
      
      if (!standardDoc.extracted_text) {
        const { processTextExtraction } = await import('@/lib/text-extraction');
        await processTextExtraction(standardDocId);
        const updatedDoc = await documentDb.findById(standardDocId);
        if (updatedDoc) standardDoc.extracted_text = updatedDoc.extracted_text;
      }
      
      if (!thirdPartyDoc.extracted_text) {
        const { processTextExtraction } = await import('@/lib/text-extraction');
        await processTextExtraction(thirdPartyDocId);
        const updatedDoc = await documentDb.findById(thirdPartyDocId);
        if (updatedDoc) thirdPartyDoc.extracted_text = updatedDoc.extracted_text;
      }
      
      // Check again
      if (!standardDoc.extracted_text || !thirdPartyDoc.extracted_text) {
        return NextResponse.json({
          error: 'Text extraction failed',
          details: {
            standardExtracted: !!standardDoc.extracted_text,
            thirdPartyExtracted: !!thirdPartyDoc.extracted_text
          }
        }, { status: 422 });
      }
    }
    
    // Perform comparison
    console.log('🤖 [TEST-COMPARE] Calling OpenAI...');
    const result = await compareDocuments(
      {
        text: standardDoc.extracted_text,
        pages: 1,
        confidence: 0.95,
        metadata: { fileHash: standardDoc.file_hash }
      },
      {
        text: thirdPartyDoc.extracted_text,
        pages: 1,
        confidence: 0.95,
        metadata: { fileHash: thirdPartyDoc.file_hash }
      }
    );
    
    return NextResponse.json({
      success: true,
      documents: {
        standard: { id: standardDoc.id, name: standardDoc.original_name },
        thirdParty: { id: thirdPartyDoc.id, name: thirdPartyDoc.original_name }
      },
      result
    });
    
  } catch (error) {
    console.error('Test compare error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.stack : undefined : undefined
    }, { status: 500 });
  }
}