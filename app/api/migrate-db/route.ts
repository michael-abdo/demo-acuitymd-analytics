import { executeQuery } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function POST() {
  // Only available in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
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
          INDEX idx_user_id (user_id),
          INDEX idx_status (status),
          INDEX idx_upload_date (upload_date)
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
          created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          user_id VARCHAR(255) NOT NULL,
          status ENUM('pending', 'processing', 'completed', 'error') DEFAULT 'pending',
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
          created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          user_id VARCHAR(255) NOT NULL,
          download_count INT DEFAULT 0,
          FOREIGN KEY (comparison_id) REFERENCES nda_comparisons(id) ON DELETE CASCADE,
          INDEX idx_user_id (user_id),
          INDEX idx_created_date (created_date)
        )
      `
    })

    return NextResponse.json({
      status: 'success',
      message: 'Database schema created successfully',
      tables: ['nda_documents', 'nda_comparisons', 'nda_exports']
    })

  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Failed to create database schema',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}