export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { documentDb, DocumentStatus } from '@/lib/nda';
import { config } from '@/lib/config';
import { ApiResponse, ApiErrors, Logger, TimestampUtils } from '@/lib/auth-utils';

export async function GET() {
  try {
    // Create a test document
    const testDoc = await documentDb.create({
      filename: `health-check-${Date.now()}.pdf`,
      original_name: 'health-check.pdf',
      file_hash: `health-${Date.now()}-${Math.random()}`,
      s3_url: 's3://health-check/test.pdf',
      file_size: 1000,
      user_id: 'health-check@system.local',
      status: DocumentStatus.UPLOADED,
      is_standard: false,
      upload_date: new Date(),
      extracted_text: null,
      metadata: { test: true, timestamp: Date.now() }
    });
    
    // Verify we can read it back
    const found = await documentDb.findById(testDoc.id);
    
    // Verify we can find by hash
    const foundByHash = await documentDb.findByHash(testDoc.file_hash);
    
    // Clean up - delete the test document
    const deleted = await documentDb.delete(testDoc.id);
    
    // All tests passed
    return ApiResponse.operation('db.health', {
      result: {
        status: 'healthy',
        mode: config.DB_CREATE_ACCESS ? 'mysql' : 'memory',
        timestamp: TimestampUtils.now(),
        tests: {
          create: testDoc.id > 0,
          read: found?.id === testDoc.id,
          findByHash: foundByHash?.id === testDoc.id,
          delete: deleted === true
        },
        details: {
          created_id: testDoc.id,
          file_hash: testDoc.file_hash,
          operations: ['create', 'read', 'findByHash', 'delete']
        }
      },
      status: 'success'
    });
    
  } catch (error: any) {
    Logger.db.error('Health check failed', error);
    
    return ApiErrors.serverError('Database health check failed', {
      mode: config.DB_CREATE_ACCESS ? 'mysql' : 'memory',
      timestamp: TimestampUtils.now(),
      error: error.message,
      stack: config.IS_DEVELOPMENT ? error.stack : undefined
    });
  }
}