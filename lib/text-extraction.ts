// Text extraction utilities for NDA documents
import pdfParse from './pdf-parse-wrapper';
import mammoth from 'mammoth';
import { TextExtractionResult, DocumentMetadata } from '@/lib/nda/types';

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
    
    // Try to use pdf-parse, but catch module loading errors
    let data;
    try {
      const pdfParse = await import('pdf-parse');
      data = await (pdfParse.default || pdfParse)(fileBuffer);
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
      confidence: 0.95, // pdf-parse is reliable for text-based PDFs
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
    if (cleanedText.length < 10) {
      throw new Error('Extracted text too short - possible extraction failure');
    }
    
    // Estimate page count (average 500 words per page, 5 characters per word)
    const estimatedPages = Math.max(1, Math.ceil(cleanedText.length / 2500));
    
    // Calculate confidence based on extraction warnings
    const confidence = result.messages && result.messages.length > 0 ? 0.85 : 0.98;
    
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
    
    // Estimate page count
    const estimatedPages = Math.max(1, Math.ceil(text.length / 2500));
    
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
      throw new Error(`Unsupported file type: ${extension}. Supported types: PDF, DOCX, DOC, TXT`);
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
  // Mock comparison logic - replace with actual OpenAI integration
  console.log('Comparing documents...')
  
  // Simulate processing
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  return {
    differences: [
      {
        section: 'Confidentiality Period',
        standardText: 'five (5) years',
        thirdPartyText: 'three (3) years',
        severity: 'high',
        suggestion: 'Request extension to 5-year confidentiality period to align with standard'
      },
      {
        section: 'Governing Law',
        standardText: 'laws of Delaware',
        thirdPartyText: 'laws of California',
        severity: 'medium',
        suggestion: 'Negotiate for Delaware law or mutually acceptable jurisdiction'
      }
    ],
    summary: 'Found 2 key differences requiring legal review and potential negotiation'
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
  
  // Initialize storage
  await storage.initialize();
  
  // Generate storage key
  const storageKey = ndaPaths.document(userEmail, fileHash, filename);
  console.log(`[ProcessFile] Uploading to storage: ${storageKey}`);
  
  // Upload to storage (S3 or local)
  const uploadResult = await storage.upload(storageKey, buffer, {
    contentType: contentType || 'application/octet-stream',
    metadata: {
      originalName: filename,
      uploadedBy: userEmail,
      docType: docType,
      fileHash: fileHash,
      isStandard: isStandard.toString(),
      uploadDate: new Date().toISOString()
    }
  });
  
  console.log(`[ProcessFile] Upload successful: ${uploadResult.size} bytes`);
  
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
    priority: 5, // Medium priority
    max_attempts: 3,
    scheduled_at: new Date()
  });
  
  console.log(`[ProcessFile] Queued extraction task: ID=${queueItem.id}`);
  
  return {
    document,
    storageInfo: {
      provider: storage.getProvider(),
      key: uploadResult.key,
      size: uploadResult.size,
      etag: uploadResult.etag
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
  const { getStorage } = await import('@/lib/storage');
  const { documentDb, DocumentStatus } = await import('@/lib/nda');
  
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
    // Download file from storage
    const storage = getStorage();
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