// Text extraction utilities for NDA documents
import pdfParse from './pdf-parse-wrapper';
import mammoth from 'mammoth';
import { OpenAI } from 'openai';
import { TextExtractionResult, DocumentMetadata } from '@/lib/nda/types';
import { config, APP_CONSTANTS } from '@/lib/config';

export interface DocumentContent {
  text: string
  pages: number
  confidence: number
  metadata: {
    extractedAt: string
    method: 'pdf-parse' | 'mammoth' | 'text'
    fileHash: string
  }
}

export async function extractTextFromPDF(
  fileBuffer: Buffer, 
  fileHash: string
): Promise<DocumentContent> {
  try {
    console.log('Extracting text from PDF using pdf-parse, hash:', fileHash);
    
    // Use existing PDF parser wrapper (DRY principle)
    let data;
    try {
      const parsePdf = await import('./pdf-parse-wrapper');
      data = await (parsePdf.default)(fileBuffer);
    } catch (moduleError) {
      // Fallback: For simple test PDFs, we can extract text manually
      console.warn('pdf-parse failed to load, using fallback text extraction');
      const pdfText = fileBuffer.toString('utf-8');
      
      // Extract text between stream tags for simple PDFs
      const streamMatch = pdfText.match(/stream\s*([\s\S]*?)\s*endstream/);
      if (streamMatch) {
        // Basic text extraction from PDF stream
        const streamContent = streamMatch[1];
        const textMatch = streamContent.match(/\((.*?)\)\s*Tj/g);
        if (textMatch) {
          const extractedText = textMatch
            .map(match => match.replace(/\((.*?)\)\s*Tj/, '$1'))
            .join(' ')
            .replace(/\\(\d{3})/g, (match, octal) => String.fromCharCode(parseInt(octal, 8)));
          
          return {
            text: extractedText,
            pages: 1,
            confidence: 0.7, // Lower confidence for fallback method
            metadata: {
              extractedAt: new Date().toISOString(),
              method: 'pdf-parse',
              fileHash
            }
          };
        }
      }
      
      throw new Error('Unable to extract text from PDF');
    }
    
    // Clean up the extracted text
    const cleanedText = data.text
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\n{3,}/g, '\n\n') // Remove excessive newlines
      .trim();
    
    return {
      text: cleanedText,
      pages: data.numpages,
      confidence: APP_CONSTANTS.PROCESSING.DEFAULT_CONFIDENCE, // pdf-parse is reliable for text-based PDFs
      metadata: {
        extractedAt: new Date().toISOString(),
        method: 'pdf-parse',
        fileHash
      }
    };
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function extractTextFromDOCX(
  fileBuffer: Buffer,
  fileHash: string
): Promise<DocumentContent> {
  try {
    console.log('Extracting text from DOCX using mammoth, hash:', fileHash);
    
    // Validate file buffer
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new Error('Empty or invalid file buffer');
    }
    
    // Check if file has ZIP signature (DOCX files are ZIP archives)
    const zipHeader = fileBuffer.slice(0, 4);
    const isZip = zipHeader[0] === 0x50 && zipHeader[1] === 0x4B;
    if (!isZip) {
      throw new Error('Invalid DOCX file format - not a ZIP archive');
    }
    
    // Use mammoth to extract text from DOCX
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    
    // Check for extraction warnings
    if (result.messages && result.messages.length > 0) {
      console.warn('DOCX extraction warnings:', result.messages.map(m => m.message));
    }
    
    // Validate extracted text
    if (!result.value || typeof result.value !== 'string') {
      throw new Error('No text content extracted from DOCX file');
    }
    
    // Clean up the extracted text
    const cleanedText = result.value
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\n{3,}/g, '\n\n') // Remove excessive newlines
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    // Validate cleaned text length
    if (cleanedText.length < APP_CONSTANTS.PROCESSING.MIN_TEXT_LENGTH) {
      throw new Error('Extracted text too short - possible extraction failure');
    }
    
    // Estimate page count based on average words per page and characters per word
    const estimatedPages = Math.max(1, Math.ceil(cleanedText.length / (APP_CONSTANTS.PROCESSING.AVERAGE_WORDS_PER_PAGE * APP_CONSTANTS.PROCESSING.AVERAGE_CHARS_PER_WORD)));
    
    // Calculate confidence based on extraction warnings
    const confidence = result.messages && result.messages.length > 0 ? 0.85 : APP_CONSTANTS.PROCESSING.DEFAULT_CONFIDENCE;
    
    console.log(`DOCX extraction successful: ${cleanedText.length} characters, ${estimatedPages} pages`);
    
    return {
      text: cleanedText,
      pages: estimatedPages,
      confidence,
      metadata: {
        extractedAt: new Date().toISOString(),
        method: 'mammoth',
        fileHash
      }
    };
  } catch (error) {
    console.error('Error extracting text from DOCX:', error);
    
    // Provide specific error messages for common issues
    let errorMessage = 'Failed to extract text from DOCX';
    if (error instanceof Error) {
      if (error.message.includes('zip')) {
        errorMessage += ': Invalid ZIP format - file may be corrupted';
      } else if (error.message.includes('password')) {
        errorMessage += ': Password-protected documents not supported';
      } else {
        errorMessage += `: ${error.message}`;
      }
    }
    
    throw new Error(errorMessage);
  }
}

export async function extractTextFromTXT(
  fileBuffer: Buffer,
  fileHash: string
): Promise<DocumentContent> {
  try {
    console.log('Extracting text from TXT file, hash:', fileHash);
    
    // Convert buffer to string
    const text = fileBuffer.toString('utf-8');
    
    // Estimate page count based on average words per page and characters per word
    const estimatedPages = Math.max(1, Math.ceil(text.length / (APP_CONSTANTS.PROCESSING.AVERAGE_WORDS_PER_PAGE * APP_CONSTANTS.PROCESSING.AVERAGE_CHARS_PER_WORD)));
    
    return {
      text: text.trim(),
      pages: estimatedPages,
      confidence: 1.0, // TXT files are already text
      metadata: {
        extractedAt: new Date().toISOString(),
        method: 'text',
        fileHash
      }
    };
  } catch (error) {
    console.error('Error extracting text from TXT:', error);
    throw new Error(`Failed to extract text from TXT: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Unified text extraction function that handles all supported file types
 * Following DRY principle by routing to appropriate extractor based on file extension
 */
export async function extractText(
  fileBuffer: Buffer,
  filename: string,
  fileHash: string
): Promise<DocumentContent> {
  // Get file extension
  const extension = filename.toLowerCase().split('.').pop();
  
  switch (extension) {
    case 'pdf':
      return extractTextFromPDF(fileBuffer, fileHash);
    
    case 'docx':
      return extractTextFromDOCX(fileBuffer, fileHash);
    
    case 'doc':
      // DOC files can be handled by mammoth as well
      return extractTextFromDOCX(fileBuffer, fileHash);
    
    case 'txt':
      return extractTextFromTXT(fileBuffer, fileHash);
    
    default:
      throw new Error(`Unsupported file type: ${extension}. Supported types: ${APP_CONSTANTS.FILE_LIMITS.ALLOWED_EXTENSIONS.join(', ').toUpperCase()}`);
  }
}

export async function compareDocuments(
  standardContent: DocumentContent,
  thirdPartyContent: DocumentContent
): Promise<{
  differences: Array<{
    section: string
    standardText: string
    thirdPartyText: string
    severity: 'low' | 'medium' | 'high'
    suggestion: string
  }>
  summary: string
}> {
  // Get OpenAI API key from config (DRY - centralized configuration)
  const apiKey = config.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  console.log('🤖 [OPENAI] Starting document comparison...');
  
  try {
    // Use static import (DRY - consistent with other imports)
    const openai = new OpenAI({ apiKey });

    // Create comparison prompt - SEND FULL DOCUMENTS (no truncation)
    const prompt = `
Compare these two NDA documents and identify key differences:

STANDARD DOCUMENT:
${standardContent.text}

THIRD-PARTY DOCUMENT:
${thirdPartyContent.text}

Return a JSON response with this exact structure:
{
  "differences": [
    {
      "section": "string",
      "standardText": "string", 
      "thirdPartyText": "string",
      "severity": "low|medium|high",
      "suggestion": "string"
    }
  ],
  "summary": "string"
}

Focus on key legal differences like confidentiality periods, governing law, liability terms, and termination clauses.`;

    // ANALYZE DOCUMENT SIZES (Claude methodology: measure before acting)
    const standardFullLength = standardContent.text.length;
    const thirdPartyFullLength = thirdPartyContent.text.length;
    
    console.log('🤖 [OPENAI] Document size analysis:');
    console.log(`🤖 [OPENAI] Standard doc: ${standardFullLength} chars (FULL DOCUMENT)`);
    console.log(`🤖 [OPENAI] Third-party doc: ${thirdPartyFullLength} chars (FULL DOCUMENT)`);
    console.log('🤖 [OPENAI] Total prompt length:', prompt.length, 'chars');
    console.log('🤖 [OPENAI] Sending request to OpenAI...');
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Use cost-effective model
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1, // Low temperature for consistent legal analysis
      max_tokens: 2000
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response content from OpenAI');
    }

    console.log('🤖 [OPENAI] Raw response content:');
    console.log('---START RAW RESPONSE---');
    console.log(content);
    console.log('---END RAW RESPONSE---');
    console.log('🤖 [OPENAI] Parsing response...');

    // Parse JSON response (FAIL FAST if invalid)
    let result;
    try {
      // Remove markdown code blocks if present
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      result = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('OpenAI response parsing failed:', content);
      throw new Error('Invalid JSON response from OpenAI');
    }

    // Validate response structure (FAIL FAST if wrong format)
    if (!result.differences || !Array.isArray(result.differences) || !result.summary) {
      throw new Error('Invalid response format from OpenAI');
    }

    console.log(`🤖 [OPENAI] Comparison completed: ${result.differences.length} differences found`);
    
    return result;

  } catch (error) {
    console.error('OpenAI comparison failed:', error);
    
    // FAIL FAST with specific error message
    if (error instanceof Error) {
      throw new Error(`OpenAI comparison failed: ${error.message}`);
    }
    throw new Error('OpenAI comparison failed with unknown error');
  }
}

/**
 * Consolidated file processing utility following DRY principle
 * Handles the complete file upload and processing workflow
 */
export interface ProcessFileOptions {
  file: File | Buffer;
  filename: string;
  userEmail: string;
  docType?: string;
  isStandard?: boolean;
  contentType?: string;
}

export interface ProcessFileResult {
  document: any;
  storageInfo: {
    provider: string;
    key: string;
    size: number;
    etag?: string;
  };
  duplicate: boolean;
  queued: boolean;
}

export async function processUploadedFile(options: ProcessFileOptions): Promise<ProcessFileResult> {
  const { file, filename, userEmail, docType = 'THIRD_PARTY', isStandard = false, contentType } = options;
  
  // Import dependencies dynamically to avoid circular dependencies
  const { createHash } = await import('crypto');
  const { storage, ndaPaths } = await import('@/lib/storage');
  const { documentDb, DocumentStatus, queueDb, TaskType } = await import('@/lib/nda');
  const { config } = await import('@/lib/config');
  
  // Convert File to Buffer if needed
  const buffer = file instanceof Buffer ? file : Buffer.from(await (file as File).arrayBuffer());
  
  // Generate file hash for deduplication
  const fileHash = createHash('sha256').update(buffer).digest('hex');
  console.log(`[ProcessFile] Generated hash: ${fileHash} for file: ${filename}`);
  
  // Check if file already exists
  const existingDocument = await documentDb.findByHash(fileHash);
  if (existingDocument) {
    console.log(`[ProcessFile] Duplicate file detected: ${fileHash}`);
    return {
      document: existingDocument,
      storageInfo: {
        provider: storage.getProvider(),
        key: existingDocument.filename,
        size: existingDocument.file_size
      },
      duplicate: true,
      queued: false
    };
  }
  
  // Storage is automatically initialized when needed
  
  // Generate storage key
  const storageKey = ndaPaths.document(userEmail, fileHash, filename);
  console.log(`[ProcessFile] Uploading to storage: ${storageKey}`);
  
  // Upload to storage (S3 or local) with built-in retry logic
  const uploadOptions = {
    contentType: contentType || 'application/octet-stream',
    metadata: {
      originalName: filename,
      uploadedBy: userEmail,
      docType: docType,
      fileHash: fileHash,
      isStandard: isStandard.toString(),
      uploadDate: new Date().toISOString()
    }
  };
  
  const uploadData = await storage.upload(storageKey, buffer, uploadOptions);
  
  console.log(`[ProcessFile] Upload successful: ${uploadData.key}`);
  
  // Store document metadata in database
  const document = await documentDb.create({
    filename: storageKey,
    original_name: filename,
    file_hash: fileHash,
    s3_url: storage.isS3() ? `s3://${config.S3_BUCKET_NAME}/${storageKey}` : `local://${storageKey}`,
    file_size: buffer.length,
    upload_date: new Date(),
    user_id: userEmail,
    status: DocumentStatus.UPLOADED,
    extracted_text: null,
    is_standard: isStandard,
    metadata: {
      docType,
      contentType: contentType || 'application/octet-stream',
      provider: storage.getProvider()
    }
  });
  
  console.log(`[ProcessFile] Document created: ID=${document.id}`);
  
  // Queue text extraction task
  const queueItem = await queueDb.enqueue({
    document_id: document.id,
    task_type: TaskType.EXTRACT_TEXT,
    priority: APP_CONSTANTS.QUEUE.DEFAULT_PRIORITY,
    max_attempts: APP_CONSTANTS.QUEUE.MAX_ATTEMPTS,
    scheduled_at: new Date()
  });
  
  console.log(`[ProcessFile] Queued extraction task: ID=${queueItem.id}`);
  
  return {
    document,
    storageInfo: {
      provider: storage.getProvider(),
      key: uploadData.key,
      size: uploadData.size,
      etag: uploadData.etag
    },
    duplicate: false,
    queued: true
  };
}

/**
 * Process text extraction for a document
 * Consolidates extraction logic for reuse
 */
export async function processTextExtraction(documentId: number): Promise<void> {
  // Import dependencies dynamically
  const { documentDb, DocumentStatus } = await import('@/lib/nda');
  const { storage } = await import('@/lib/storage');
  
  console.log(`[Extraction] Starting text extraction for document ${documentId}`);
  
  // Get document from database
  const document = await documentDb.findById(documentId);
  if (!document) {
    throw new Error(`Document ${documentId} not found`);
  }
  
  console.log(`[Extraction] Processing: ${document.original_name}`);
  
  // Update status to processing
  await documentDb.updateStatus(document.id, DocumentStatus.PROCESSING);
  
  try {
    // Download file from storage (with built-in retry logic)
    const downloadResult = await storage.download(document.filename);
    const fileBuffer = downloadResult.data;
    
    console.log(`[Extraction] Downloaded ${fileBuffer.length} bytes`);
    
    // Extract text using unified extractor
    const extractedContent = await extractText(
      fileBuffer,
      document.original_name,
      document.file_hash
    );
    
    console.log(`[Extraction] Extracted ${extractedContent.text.length} characters`);
    
    // Update document with extracted text
    await documentDb.update(document.id, {
      extracted_text: extractedContent.text,
      status: DocumentStatus.PROCESSED,
      metadata: {
        ...document.metadata,
        extraction: {
          pages: extractedContent.pages,
          confidence: extractedContent.confidence,
          method: extractedContent.metadata.method,
          extractedAt: extractedContent.metadata.extractedAt
        }
      }
    });
    
    console.log(`[Extraction] ✅ Completed for document ${document.id}`);
    
  } catch (error) {
    console.error(`[Extraction] ❌ Failed:`, error);
    await documentDb.updateStatus(document.id, DocumentStatus.ERROR);
    throw error;
  }
}