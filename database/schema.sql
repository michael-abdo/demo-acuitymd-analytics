-- VVG Template Database Schema
-- Run this to set up your database tables

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS vvg_template
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE vvg_template;

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size INT UNSIGNED NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  status ENUM('uploaded', 'processing', 'completed', 'failed') DEFAULT 'uploaded',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Indexes for common queries
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tags table (demonstrates entity relationships)
-- User-scoped tags that can be applied to documents
CREATE TABLE IF NOT EXISTS tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Each user can have unique tag names
  UNIQUE KEY unique_tag_per_user (user_id, name),
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Document-Tag relationship (many-to-many join table)
-- Demonstrates foreign key relationships with cascading deletes
CREATE TABLE IF NOT EXISTS document_tags (
  document_id INT NOT NULL,
  tag_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (document_id, tag_id),
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Success message
SELECT 'Database setup complete!' AS status;
