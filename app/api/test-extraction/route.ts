import { NextRequest, NextResponse } from 'next/server';
import { documentDb, queueDb, TaskType, QueueStatus } from '@/lib/nda';
import { config } from '@/lib/config';

// Test endpoint to check documents and manually trigger extraction
export async function GET(request: NextRequest) {
  // Only available in development
  if (!config.IS_DEVELOPMENT) {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }
  
  try {
    // Get all documents for the test user
    const testUser = config.TEST_USER_EMAIL;
    const documents = await documentDb.findByUser(testUser);
    
    // Get queue status
    const allTasks = [];
    // Check if we have any tasks for each document
    for (const doc of documents) {
      try {
        const tasks = await queueDb.findByDocument?.(doc.id) || [];
        allTasks.push(...tasks);
      } catch (e) {
        // findByDocument might not exist
      }
    }
    
    return NextResponse.json({
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
    });
  } catch (error) {
    console.error('Test extraction error:', error);
    return NextResponse.json({ 
      error: 'Failed to get documents',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST to trigger extraction for all documents without text
export async function POST(request: NextRequest) {
  // Only available in development
  if (!config.IS_DEVELOPMENT) {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }
  
  try {
    const testUser = config.TEST_USER_EMAIL;
    const { documentId } = await request.json().catch(() => ({}));
    
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
          // Reset attempts directly in database/memory store
          // This is handled by updateStatus in the queueDb implementation
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
        const response = await fetch('http://localhost:3001/api/process-queue', {
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
    
    return NextResponse.json({
      success: true,
      message: `Queued ${tasksQueued.length} extraction tasks`,
      tasksQueued
    });
  } catch (error) {
    console.error('Test trigger error:', error);
    return NextResponse.json({ 
      error: 'Failed to queue extractions',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}