/**
 * Template Database Module
 * 
 * Provides database operations for template processing
 */

// Re-export database operations from repositories
export { 
  documentDb, 
  comparisonDb,
  // queueDb, // TODO: Create when needed
  executeQuery,
  getConnection
} from './repositories';

// Initialize database function
export async function initializeDatabase() {
  // Database initialization logic would go here
  // For now, this is a placeholder
  return Promise.resolve();
}