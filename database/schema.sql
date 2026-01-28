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

-- Success message
SELECT 'Database setup complete!' AS status;
