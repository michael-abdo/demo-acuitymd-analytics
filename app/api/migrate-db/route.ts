export const dynamic = "force-dynamic";
import { executeQuery } from '@/lib/db'
import { NextResponse } from 'next/server'
import { ApiResponse } from '@/lib/auth-utils'
import { ApiErrors } from '@/lib/utils'

export async function POST() {
  // Production guard - FAIL FAST
  if (process.env.NODE_ENV === 'production') {
    return new Response(null, { status: 404 });
  }

  try {
    // Create NDA documents table
    await executeQuery({
      query: `
        CREATE TABLE IF NOT EXISTS nda_documents (
          id INT AUTO_INCREMENT PRIMARY KEY,
          filename VARCHAR(255) NOT NULL,
          original_name VARCHAR(255) NOT NULL,
          file_hash VARCHAR(64) UNIQUE NOT NULL,
          s3_url VARCHAR(500) NOT NULL,
          file_size BIGINT NOT NULL,
          upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          user_id VARCHAR(255) NOT NULL,
          status ENUM('uploaded', 'processing', 'processed', 'error') DEFAULT 'uploaded',
          extracted_text MEDIUMTEXT NULL,
          is_standard BOOLEAN DEFAULT FALSE,
          metadata JSON NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_user_id (user_id),
          INDEX idx_status (status),
          INDEX idx_upload_date (upload_date),
          INDEX idx_is_standard (is_standard)
        )
      `
    })

    // Create NDA comparisons table
    await executeQuery({
      query: `
        CREATE TABLE IF NOT EXISTS nda_comparisons (
          id INT AUTO_INCREMENT PRIMARY KEY,
          document1_id INT NOT NULL,
          document2_id INT NOT NULL,
          comparison_result_s3_url VARCHAR(500),
          comparison_summary TEXT,
          similarity_score FLOAT NULL,
          key_differences JSON NULL,
          ai_suggestions JSON NULL,
          created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          user_id VARCHAR(255) NOT NULL,
          status ENUM('pending', 'processing', 'completed', 'error') DEFAULT 'pending',
          error_message TEXT NULL,
          processing_time_ms INT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (document1_id) REFERENCES nda_documents(id) ON DELETE CASCADE,
          FOREIGN KEY (document2_id) REFERENCES nda_documents(id) ON DELETE CASCADE,
          INDEX idx_user_id (user_id),
          INDEX idx_status (status),
          INDEX idx_created_date (created_date),
          UNIQUE KEY unique_comparison (document1_id, document2_id)
        )
      `
    })

    // Create NDA exports table
    await executeQuery({
      query: `
        CREATE TABLE IF NOT EXISTS nda_exports (
          id INT AUTO_INCREMENT PRIMARY KEY,
          comparison_id INT NOT NULL,
          export_type ENUM('pdf', 'docx') NOT NULL,
          export_s3_url VARCHAR(500) NOT NULL,
          file_size BIGINT NOT NULL DEFAULT 0,
          created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          user_id VARCHAR(255) NOT NULL,
          download_count INT DEFAULT 0,
          last_downloaded_at TIMESTAMP NULL,
          metadata JSON NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (comparison_id) REFERENCES nda_comparisons(id) ON DELETE CASCADE,
          INDEX idx_user_id (user_id),
          INDEX idx_created_date (created_date)
        )
      `
    })

    // Create processing queue table
    await executeQuery({
      query: `
        CREATE TABLE IF NOT EXISTS nda_processing_queue (
          id INT AUTO_INCREMENT PRIMARY KEY,
          document_id INT NOT NULL,
          task_type ENUM('extract_text', 'compare', 'export') NOT NULL,
          priority INT DEFAULT 5,
          status ENUM('queued', 'processing', 'completed', 'failed') DEFAULT 'queued',
          attempts INT DEFAULT 0,
          max_attempts INT DEFAULT 3,
          scheduled_at TIMESTAMP NULL,
          started_at TIMESTAMP NULL,
          completed_at TIMESTAMP NULL,
          error_message TEXT NULL,
          result JSON NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (document_id) REFERENCES nda_documents(id) ON DELETE CASCADE,
          INDEX idx_status (status),
          INDEX idx_priority_scheduled (priority, scheduled_at),
          INDEX idx_document_id (document_id)
        )
      `
    })

    return ApiResponse.operation('db.migrate', {
      result: {
        status: 'success',
        message: 'Database schema created successfully',
        tables: ['nda_documents', 'nda_comparisons', 'nda_exports', 'nda_processing_queue']
      },
      status: 'created'
    })

  } catch (error) {
    return ApiErrors.serverError('Failed to create database schema', {
      error: error instanceof Error ? error.message : String(error)
    })
  }
}