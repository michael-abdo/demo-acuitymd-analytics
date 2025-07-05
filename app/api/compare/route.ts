import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-utils'
import { documentDb, comparisonDb, ComparisonStatus, DocumentStatus } from '@/lib/nda'
import { compareDocuments, DocumentContent } from '@/lib/text-extraction'

export const POST = withAuth(async (request: NextRequest, userEmail: string) => {
  try {

    const body = await request.json()
    const { standardDocId, thirdPartyDocId } = body

    if (!standardDocId || !thirdPartyDocId) {
      return NextResponse.json({ 
        error: 'Both standard and third-party document IDs are required' 
      }, { status: 400 })
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        status: 'error',
        message: 'OpenAI API key not configured',
        error: 'OPENAI_API_KEY environment variable is not set'
      }, { status: 500 })
    }

    // Fetch documents from database
    const [standardDoc, thirdPartyDoc] = await Promise.all([
      documentDb.findById(standardDocId),
      documentDb.findById(thirdPartyDocId)
    ])

    if (!standardDoc || !thirdPartyDoc) {
      return NextResponse.json({ 
        error: 'One or both documents not found' 
      }, { status: 404 })
    }

    // Check if text has been extracted for both documents
    if (!standardDoc.extracted_text || !thirdPartyDoc.extracted_text) {
      const missingExtraction = []
      if (!standardDoc.extracted_text) missingExtraction.push(`Standard document (ID: ${standardDocId})`)
      if (!thirdPartyDoc.extracted_text) missingExtraction.push(`Third-party document (ID: ${thirdPartyDocId})`)
      
      return NextResponse.json({ 
        error: 'Text extraction not completed',
        details: `Text extraction is pending for: ${missingExtraction.join(', ')}`,
        suggestion: 'Please wait for text extraction to complete or trigger it via /api/process-queue'
      }, { status: 400 })
    }

    // Create comparison record
    const comparison = await comparisonDb.create({
      document1_id: standardDocId,
      document2_id: thirdPartyDocId,
      created_date: new Date(),
      user_id: userEmail,
      status: ComparisonStatus.PROCESSING
    })

    try {
      // Prepare document content for comparison
      const standardContent: DocumentContent = {
        text: standardDoc.extracted_text,
        pages: standardDoc.metadata?.extraction?.pages || 1,
        confidence: standardDoc.metadata?.extraction?.confidence || 0.95,
        metadata: {
          extractedAt: standardDoc.metadata?.extraction?.extractedAt || new Date().toISOString(),
          method: standardDoc.metadata?.extraction?.method || 'pdf-parse',
          fileHash: standardDoc.file_hash
        }
      }

      const thirdPartyContent: DocumentContent = {
        text: thirdPartyDoc.extracted_text,
        pages: thirdPartyDoc.metadata?.extraction?.pages || 1,
        confidence: thirdPartyDoc.metadata?.extraction?.confidence || 0.95,
        metadata: {
          extractedAt: thirdPartyDoc.metadata?.extraction?.extractedAt || new Date().toISOString(),
          method: thirdPartyDoc.metadata?.extraction?.method || 'pdf-parse',
          fileHash: thirdPartyDoc.file_hash
        }
      }

      // Perform comparison (currently using mock implementation)
      // TODO: Replace with actual OpenAI implementation
      const comparisonResult = await compareDocuments(standardContent, thirdPartyContent)
      
      // Update comparison with results
      await comparisonDb.update(comparison.id, {
        status: ComparisonStatus.COMPLETED,
        comparison_summary: comparisonResult.summary,
        key_differences: comparisonResult.differences.map(diff => ({
          section: diff.section,
          type: diff.severity === 'high' ? 'different' : 'missing',
          importance: diff.severity,
          standard_text: diff.standardText,
          compared_text: diff.thirdPartyText,
          explanation: diff.suggestion
        })),
        similarity_score: 0.85, // TODO: Calculate actual similarity
        processing_time_ms: 2000 // TODO: Track actual processing time
      })

      return NextResponse.json({
        status: 'success',
        message: 'NDA comparison completed',
        comparison: {
          id: comparison.id,
          standardDocId,
          thirdPartyDocId,
          status: 'completed',
          differences: comparisonResult.differences,
          summary: comparisonResult.summary,
          createdAt: comparison.created_date
        }
      })

    } catch (comparisonError) {
      // Update comparison status to error
      await comparisonDb.update(comparison.id, {
        status: ComparisonStatus.ERROR,
        error_message: comparisonError instanceof Error ? comparisonError.message : 'Unknown error'
      })
      throw comparisonError
    }

  } catch (error) {
    console.error('Comparison error:', error)
    return NextResponse.json({
      status: 'error',
      message: 'Comparison failed',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
})