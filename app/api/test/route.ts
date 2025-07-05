import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { ApiErrors, FileValidation } from '@/lib/utils';
import { createPool } from 'mysql2/promise';
import { initializeStorage, getStorage } from '@/lib/storage';
import { documentDb, queueDb, TaskType, QueueStatus, DocumentStatus } from '@/lib/nda';
import { queryItems } from '@/lib/mysql';
import { createHash } from 'crypto';
import fs from 'fs/promises';
import path from 'path';

/**
 * Development-only guard middleware
 */
function requireDevelopment(handler: (request: NextRequest) => Promise<NextResponse>) {
  return async (request: NextRequest) => {
    if (!config.IS_DEVELOPMENT) {
      return ApiErrors.forbidden('Test endpoints are only available in development');
    }
    return handler(request);
  };
}

/**
 * Test database connectivity
 */
async function testDatabase(): Promise<any> {
  const result = {
    environment: {
      MYSQL_HOST: config.MYSQL_HOST,
      MYSQL_PORT: config.MYSQL_PORT,
      MYSQL_USER: config.MYSQL_USER,
      MYSQL_DATABASE: config.MYSQL_DATABASE,
      NODE_ENV: config.NODE_ENV
    },
    connection: {
      success: false,
      message: '',
      error: null as any
    }
  };

  // Test direct connection
  try {
    const pool = createPool({
      host: config.MYSQL_HOST,
      port: config.MYSQL_PORT,
      user: config.MYSQL_USER,
      password: config.MYSQL_PASSWORD,
      database: config.MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit: 1,
      queueLimit: 0
    });

    const connection = await pool.getConnection();
    const [rows] = await connection.execute('SELECT 1 as test');
    connection.release();
    await pool.end();

    result.connection.success = true;
    result.connection.message = 'Direct connection successful';
  } catch (error: any) {
    result.connection.success = false;
    result.connection.message = 'Direct connection failed';
    result.connection.error = error.message;
  }

  return result;
}

/**
 * Test CRUD operations
 */
async function testCrud(): Promise<any> {
  try {
    const items = await queryItems('vvg_trucklistings', { limit: 5 });
    return {
      success: true,
      sampleData: items.slice(0, 3),
      totalReturned: items.length,
      message: 'Successfully queried vvg_trucklistings table'
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      errorCode: error.code,
      hint: 'Make sure the vvg_trucklistings table exists and is accessible'
    };
  }
}

/**
 * Get document and extraction status
 */
async function getDocumentStatus(): Promise<any> {
  const testUser = config.TEST_USER_EMAIL;
  const documents = await documentDb.findByUser(testUser);
  
  // Get queue status for all documents
  const allTasks = [];
  for (const doc of documents) {
    try {
      const tasks = await queueDb.findByDocument?.(doc.id) || [];
      allTasks.push(...tasks);
    } catch (e) {
      // findByDocument might not exist
    }
  }
  
  return {
    testUser,
    documents: documents.map(doc => ({
      id: doc.id,
      filename: doc.original_name,
      fileType: doc.original_name.split('.').pop(),
      hasExtractedText: !!doc.extracted_text,
      extractedTextLength: doc.extracted_text ? doc.extracted_text.length : 0,
      status: doc.status
    })),
    queueTasks: allTasks.map(task => ({
      id: task.id,
      document_id: task.document_id,
      task_type: task.task_type,
      status: task.status,
      attempts: task.attempts
    })),
    summary: {
      totalDocuments: documents.length,
      documentsWithText: documents.filter(d => d.extracted_text).length,
      pendingExtractions: documents.filter(d => !d.extracted_text).length
    }
  };
}

/**
 * Upload test files
 */
async function uploadTestFiles(): Promise<any> {
  // Initialize storage
  await initializeStorage();
  const storage = getStorage();
  
  const testUser = config.TEST_USER_EMAIL;
  const testDataDir = path.join(process.cwd(), 'test-data');
  
  // Check if test-data directory exists
  try {
    await fs.access(testDataDir);
  } catch {
    return {
      success: false,
      error: 'No test-data directory found. Please create test files first.'
    };
  }
  
  // Get all files in test-data directory
  const files = await fs.readdir(testDataDir);
  const uploaded = [];
  
  for (const filename of files) {
    if (filename.startsWith('.')) continue; // Skip hidden files
    
    const filePath = path.join(testDataDir, filename);
    const stats = await fs.stat(filePath);
    
    if (!stats.isFile()) continue; // Skip directories
    
    // Read file
    const fileBuffer = await fs.readFile(filePath);
    const fileHash = createHash('sha256').update(fileBuffer).digest('hex');
    
    // Check if document already exists
    const existing = await documentDb.findByHash(fileHash);
    if (existing) {
      console.log(`[Test Upload] Document already exists: ${filename}`);
      continue;
    }
    
    // Create storage key
    const storageKey = config.S3_FOLDER_PREFIX 
      ? `${config.S3_FOLDER_PREFIX}/${testUser}/${fileHash}/${filename}`
      : `${testUser}/${fileHash}/${filename}`;
    
    // Upload to storage
    console.log(`[Test Upload] Uploading ${filename} to storage...`);
    const storageFile = await storage.upload(storageKey, fileBuffer, {
      contentType: FileValidation.getContentType(filename),
      metadata: {
        originalName: filename,
        uploadedBy: testUser
      }
    });
    
    // Create document in database
    const document = await documentDb.create({
      filename: storageKey,
      original_name: filename,
      file_hash: fileHash,
      s3_url: storageFile.url || storageKey,
      file_size: fileBuffer.length,
      user_id: testUser,
      status: DocumentStatus.UPLOADED,
      is_standard: filename.toLowerCase().includes('standard'),
      metadata: {
        contentType: FileValidation.getContentType(filename),
        uploadedAt: new Date().toISOString()
      }
    });
    
    // Queue text extraction
    const task = await queueDb.enqueue({
      document_id: document.id,
      task_type: TaskType.EXTRACT_TEXT,
      priority: 1,
      status: QueueStatus.QUEUED,
      max_attempts: 3,
      scheduled_at: new Date()
    });
    
    uploaded.push({
      documentId: document.id,
      filename,
      fileSize: fileBuffer.length,
      storageKey,
      taskId: task.id
    });
    
    console.log(`[Test Upload] Successfully uploaded ${filename} (Document ID: ${document.id})`);
  }
  
  return {
    success: true,
    message: `Uploaded ${uploaded.length} files`,
    uploaded,
    testUser
  };
}

/**
 * Trigger text extraction
 */
async function triggerExtraction(documentId?: number): Promise<any> {
  const testUser = config.TEST_USER_EMAIL;
  const documents = await documentDb.findByUser(testUser);
  const tasksQueued = [];
  
  for (const doc of documents) {
    // If documentId is specified, only queue that one
    if (documentId && doc.id !== documentId) continue;
    
    if (!doc.extracted_text) {
      // Check if there's already a failed task
      const existingTasks = await queueDb.findByDocument?.(doc.id) || [];
      const failedTask = existingTasks.find((task: any) => 
        task.task_type === TaskType.EXTRACT_TEXT && 
        task.status === QueueStatus.FAILED
      );
      
      // If there's a failed task, reset it to queued
      if (failedTask) {
        await queueDb.updateStatus(failedTask.id, QueueStatus.QUEUED);
        tasksQueued.push({
          documentId: doc.id,
          filename: doc.original_name,
          taskId: failedTask.id,
          status: 'requeued'
        });
        console.log(`[Test] Re-queued extraction for document ${doc.id} (${doc.original_name})`);
      } else {
        // Queue new extraction task
        const task = await queueDb.enqueue({
          document_id: doc.id,
          task_type: TaskType.EXTRACT_TEXT,
          priority: 1,
          status: QueueStatus.QUEUED,
          max_attempts: 3,
          scheduled_at: new Date()
        });
        
        tasksQueued.push({
          documentId: doc.id,
          filename: doc.original_name,
          taskId: task.id,
          status: 'new'
        });
        
        console.log(`[Test] Queued extraction for document ${doc.id} (${doc.original_name})`);
      }
    }
  }
  
  // Trigger queue processing
  setTimeout(async () => {
    try {
      const response = await fetch(`http://localhost:${config.PORT || 3000}/api/process-queue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      console.log('[Test] Triggered queue processing');
    } catch (error) {
      console.error('[Test] Failed to trigger queue:', error);
    }
  }, 500);
  
  return {
    success: true,
    message: `Queued ${tasksQueued.length} extraction tasks`,
    tasksQueued
  };
}

/**
 * Compare documents
 */
async function compareDocuments(): Promise<any> {
  const testUser = config.TEST_USER_EMAIL;
  
  // Get documents with extracted text
  const documents = await documentDb.findByUser(testUser);
  const docsWithText = documents.filter(doc => doc.extracted_text);
  
  if (docsWithText.length < 2) {
    return {
      success: false,
      error: 'Not enough documents with extracted text',
      documentsWithText: docsWithText.length,
      message: 'Need at least 2 documents with extracted text to compare'
    };
  }
  
  // Compare the first two documents with text
  const doc1 = docsWithText[0];
  const doc2 = docsWithText[1];
  
  // Perform simple comparison
  const text1 = doc1.extracted_text!;
  const text2 = doc2.extracted_text!;
  
  // Calculate basic statistics
  const stats1 = {
    words: text1.split(/\s+/).filter(w => w.length > 0).length,
    characters: text1.length,
    lines: text1.split('\n').length
  };
  
  const stats2 = {
    words: text2.split(/\s+/).filter(w => w.length > 0).length,
    characters: text2.length,
    lines: text2.split('\n').length
  };
  
  // Find common words
  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  
  const commonWords = new Set([...words1].filter(x => words2.has(x)));
  const uniqueToDoc1 = new Set([...words1].filter(x => !words2.has(x)));
  const uniqueToDoc2 = new Set([...words2].filter(x => !words1.has(x)));
  
  // Calculate similarity score (Jaccard index)
  const union = new Set([...words1, ...words2]);
  const similarityScore = union.size > 0 ? (commonWords.size / union.size) * 100 : 0;
  
  // Find common phrases
  const phrases1 = findPhrases(text1);
  const phrases2 = findPhrases(text2);
  const commonPhrases = phrases1.filter(p => phrases2.includes(p));
  
  return {
    success: true,
    comparison: {
      doc1: {
        id: doc1.id,
        name: doc1.original_name,
        stats: stats1,
        preview: text1.substring(0, 200) + '...'
      },
      doc2: {
        id: doc2.id,
        name: doc2.original_name,
        stats: stats2,
        preview: text2.substring(0, 200) + '...'
      }
    },
    similarity: {
      score: Math.round(similarityScore * 100) / 100,
      interpretation: similarityScore > 80 ? 'Very Similar' :
                     similarityScore > 60 ? 'Similar' :
                     similarityScore > 40 ? 'Somewhat Similar' :
                     similarityScore > 20 ? 'Different' : 'Very Different'
    },
    analysis: {
      commonWords: commonWords.size,
      uniqueToDoc1: uniqueToDoc1.size,
      uniqueToDoc2: uniqueToDoc2.size,
      totalUniqueWords: union.size,
      commonPhrases: commonPhrases.length,
      sampleCommonWords: Array.from(commonWords).slice(0, 20),
      sampleCommonPhrases: commonPhrases.slice(0, 10)
    }
  };
}

function findPhrases(text: string): string[] {
  const phrases: string[] = [];
  
  // Find common NDA phrases
  const patterns = [
    /confidential information/gi,
    /non-disclosure agreement/gi,
    /proprietary information/gi,
    /shall not disclose/gi,
    /effective date/gi,
    /governing law/gi,
    /in witness whereof/gi,
    /mutual agreement/gi,
    /third party/gi,
    /trade secrets/gi
  ];
  
  patterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      phrases.push(...matches.map(m => m.toLowerCase()));
    }
  });
  
  return [...new Set(phrases)];
}

/**
 * GET handler - handles read operations
 */
export const GET = requireDevelopment(async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const operation = searchParams.get('operation') || 'status';
    
    switch (operation) {
      case 'db':
        const dbResult = await testDatabase();
        return NextResponse.json({
          status: 'success',
          message: 'Database connection test completed',
          ...dbResult
        });
        
      case 'crud':
        const crudResult = await testCrud();
        return NextResponse.json(crudResult);
        
      case 'documents':
      case 'status':
        const statusResult = await getDocumentStatus();
        return NextResponse.json(statusResult);
        
      default:
        return ApiErrors.badRequest(`Unknown operation: ${operation}`);
    }
  } catch (error) {
    console.error('Test GET error:', error);
    return ApiErrors.serverError(error instanceof Error ? error.message : 'Test operation failed');
  }
});

/**
 * POST handler - handles write operations
 */
export const POST = requireDevelopment(async (request: NextRequest) => {
  try {
    const body = await request.json().catch(() => ({}));
    const { operation, documentId } = body;
    
    switch (operation) {
      case 'upload':
        const uploadResult = await uploadTestFiles();
        return NextResponse.json(uploadResult);
        
      case 'extract':
        const extractResult = await triggerExtraction(documentId);
        return NextResponse.json(extractResult);
        
      case 'compare':
        const compareResult = await compareDocuments();
        return NextResponse.json(compareResult);
        
      default:
        return ApiErrors.badRequest(`Unknown operation: ${operation}`);
    }
  } catch (error) {
    console.error('Test POST error:', error);
    return ApiErrors.serverError(error instanceof Error ? error.message : 'Test operation failed');
  }
});