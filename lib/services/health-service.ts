/**
 * Health Check Service
 * 
 * Consolidates health check patterns across API endpoints to eliminate ~45 lines of duplication.
 * Provides standardized health check execution, error handling, and response formatting.
 */

import { NextResponse } from 'next/server';
import { ApiResponse, ApiErrors, Logger, TimestampUtils } from '@/lib/auth-utils';
import { config } from '@/lib/config';

export interface HealthTest {
  name: string;
  test: () => Promise<any>;
  cleanup?: () => Promise<void>;
}

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  tests: Record<string, boolean>;
  details: Record<string, any>;
  operations: string[];
  metadata?: Record<string, any>;
}

export interface HealthCheckOptions {
  service: string;
  loggerKey: 'db' | 'storage' | 'api';
  includeStack?: boolean;
}

/**
 * Health check service with standardized patterns
 */
export const HealthService = {
  /**
   * Execute a comprehensive health check with multiple tests
   * Consolidates the pattern used by db-health and storage-health endpoints
   */
  async runHealthChecks(
    tests: HealthTest[],
    options: HealthCheckOptions
  ): Promise<NextResponse> {
    const { service, loggerKey, includeStack = config.IS_DEVELOPMENT } = options;
    const startTime = Date.now();
    const results: Record<string, boolean> = {};
    const details: Record<string, any> = {};
    const operations: string[] = [];
    let testResults: any[] = [];

    try {
      // Execute all tests
      for (const test of tests) {
        try {
          const result = await test.test();
          results[test.name] = true;
          details[test.name] = result;
          testResults.push(result);
          operations.push(test.name);
          
          Logger[loggerKey].step(`${service.toUpperCase()}_HEALTH`, `${test.name} test passed`);
        } catch (error) {
          results[test.name] = false;
          details[`${test.name}_error`] = error instanceof Error ? error.message : 'Unknown error';
          
          Logger[loggerKey].error(`${service.toUpperCase()}_HEALTH`, `${test.name} test failed`, error as Error);
          
          // If a test fails, we still continue but mark as degraded
        }
      }

      // Execute cleanup for all tests that have it
      for (const test of tests) {
        if (test.cleanup) {
          try {
            await test.cleanup();
            Logger[loggerKey].step(`${service.toUpperCase()}_HEALTH`, `${test.name} cleanup completed`);
          } catch (error) {
            Logger[loggerKey].warn(`${service.toUpperCase()}_HEALTH`, `${test.name} cleanup failed`, error as Error);
          }
        }
      }

      // Determine overall status
      const allTestsPassed = Object.values(results).every(result => result === true);
      const status = allTestsPassed ? 'healthy' : 'degraded';

      const healthResult: HealthCheckResult = {
        status,
        timestamp: TimestampUtils.now(),
        tests: results,
        details: {
          ...details,
          executionTime: `${Date.now() - startTime}ms`,
          totalTests: tests.length,
          passedTests: Object.values(results).filter(r => r).length
        },
        operations,
        metadata: {
          service,
          mode: config.DB_CREATE_ACCESS ? 'production' : 'development',
          environment: process.env.NODE_ENV
        }
      };

      return ApiResponse.operation(`${service}.health` as any, {
        result: healthResult,
        status: status === 'healthy' ? 'success' : 'partial'
      });

    } catch (error: any) {
      Logger[loggerKey].error(`${service.toUpperCase()}_HEALTH`, 'Health check failed', error);

      // Execute cleanup even on failure
      for (const test of tests) {
        if (test.cleanup) {
          try {
            await test.cleanup();
          } catch (cleanupError) {
            Logger[loggerKey].warn(`${service.toUpperCase()}_HEALTH`, `${test.name} cleanup failed during error handling`);
          }
        }
      }

      return this.createErrorResponse(service, error, { includeStack });
    }
  },

  /**
   * Execute a simple health check (for basic service status)
   * Consolidates the pattern used by the main health endpoint
   */
  async runSimpleHealthCheck(
    service: string,
    metadata: Record<string, any> = {}
  ): Promise<NextResponse> {
    try {
      const baseMetadata = {
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '0.1.0',
        uptime: process.uptime(),
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          unit: 'MB'
        },
        timestamp: TimestampUtils.now(),
        ...metadata
      };

      return ApiResponse.health.ok(service, baseMetadata);

    } catch (error) {
      return ApiResponse.health.degraded(service, [
        'Health check failed',
        error instanceof Error ? error.message : 'Unknown error'
      ]);
    }
  },

  /**
   * Create standardized error response for health checks
   * Consolidates error response patterns across health endpoints
   */
  createErrorResponse(
    service: string,
    error: any,
    options: { includeStack?: boolean; metadata?: Record<string, any> } = {}
  ): NextResponse {
    const { includeStack = config.IS_DEVELOPMENT, metadata = {} } = options;

    let errorDetails: any = {
      message: error.message,
      code: error.code,
      name: error.name,
      service,
      timestamp: TimestampUtils.now()
    };

    // Add AWS-specific error details
    if (error.Code) {
      errorDetails.awsCode = error.Code;
    }

    if (error.statusCode) {
      errorDetails.statusCode = error.statusCode;
    }

    // Include stack trace in development
    if (includeStack && error.stack) {
      errorDetails.stack = error.stack;
    }

    // Add any additional metadata
    Object.assign(errorDetails, metadata);

    return ApiErrors.serverError(`${service} health check failed`, errorDetails);
  }
};

/**
 * Common health test factory functions
 */
export const HealthTestFactory = {
  /**
   * Create a database CRUD test
   */
  createDatabaseTest(documentDb: any): HealthTest {
    let testDocId: number | null = null;
    
    return {
      name: 'database_crud',
      test: async () => {
        // Create test document
        const testDoc = await documentDb.create({
          filename: `health-check-${Date.now()}.pdf`,
          original_name: 'health-check.pdf',
          file_hash: `health-${Date.now()}-${Math.random()}`,
          s3_url: 's3://health-check/test.pdf',
          file_size: 1000,
          user_id: 'health-check@system.local',
          status: 'uploaded',
          is_standard: false,
          upload_date: new Date(),
          extracted_text: null,
          metadata: { test: true, timestamp: Date.now() }
        });

        testDocId = testDoc.id;

        // Test read operations
        const found = await documentDb.findById(testDoc.id);
        const foundByHash = await documentDb.findByHash(testDoc.file_hash);

        return {
          created_id: testDoc.id,
          file_hash: testDoc.file_hash,
          read_success: found?.id === testDoc.id,
          hash_lookup_success: foundByHash?.id === testDoc.id
        };
      },
      cleanup: async () => {
        if (testDocId) {
          await documentDb.delete(testDocId);
        }
      }
    };
  },

  /**
   * Create a storage operations test
   */
  createStorageTest(storage: any): HealthTest {
    let testKey: string | null = null;
    
    return {
      name: 'storage_operations',
      test: async () => {
        await storage.initialize();
        
        testKey = `health-check/${Date.now()}-test.txt`;
        const testContent = `Storage health check - ${TimestampUtils.now()}`;
        const testBuffer = Buffer.from(testContent, 'utf-8');

        // Test upload
        const uploadResult = await storage.upload(testKey, testBuffer, {
          contentType: 'text/plain',
          metadata: { uploadedBy: 'health-check', test: 'true' }
        });

        // Test other operations
        const exists = await storage.exists(testKey);
        const headResult = await storage.head(testKey);
        const downloadResult = await storage.download(testKey);
        const downloadedContent = downloadResult.data.toString('utf-8');

        return {
          provider: storage.getProvider(),
          isLocal: storage.isLocal(),
          upload_success: uploadResult.key === testKey,
          exists_success: exists === true,
          head_success: headResult?.key === testKey,
          download_success: downloadedContent === testContent,
          content_matches: downloadedContent === testContent
        };
      },
      cleanup: async () => {
        if (testKey) {
          await storage.delete(testKey);
        }
      }
    };
  }
};