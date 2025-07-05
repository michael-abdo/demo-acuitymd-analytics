import { NextRequest, NextResponse } from 'next/server';
import { storage, initializeStorage } from '@/lib/storage';
import { documentDb, queueDb, TaskType, QueueStatus } from '@/lib/nda';
import { createHash } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { config } from '@/lib/config';
import { FileValidation } from '@/lib/utils';

// Upload test files and create documents properly
export async function POST(request: NextRequest) {
  // Only available in development
  if (!config.IS_DEVELOPMENT) {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }
  
  try {
    // Initialize storage
    await initializeStorage();
    
    const testUser = config.TEST_USER_EMAIL;
    const testDataDir = path.join(process.cwd(), 'test-data');
    
    // Check if test-data directory exists
    try {
      await fs.access(testDataDir);
    } catch {
      return NextResponse.json({
        error: 'No test-data directory found. Please create test files first.'
      }, { status: 400 });
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
      const storageKey = `${testUser}/${fileHash}/${filename}`;
      
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
        status: 'UPLOADED',
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
    
    return NextResponse.json({
      success: true,
      message: `Uploaded ${uploaded.length} files`,
      uploaded,
      testUser
    });
    
  } catch (error) {
    console.error('Test upload error:', error);
    return NextResponse.json({ 
      error: 'Failed to upload test files',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}