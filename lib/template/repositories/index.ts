/**
 * Repository exports
 * 
 * Central export point for all repository implementations.
 * Part of the fifth-pass DRY refactoring to eliminate database code duplication.
 */

export { BaseRepository, type IRepository, type RepositoryConfig } from './base';
export { DocumentRepository, type IDocumentRepository } from './document';
export { ComparisonRepository } from './comparison';
// export { QueueRepository, type IQueueRepository, type QueueItemExtended } from './queue'; // TODO: Create when needed

// Create singleton instances
import { DocumentRepository } from './document';
import { ComparisonRepository } from './comparison';
// import { QueueRepository } from './queue'; // TODO: Create when needed

// Export singleton instances to maintain compatibility with existing code
export const documentRepository = new DocumentRepository();
export const comparisonRepository = new ComparisonRepository();
// export const queueRepository = new QueueRepository(); // TODO: Create when needed

// Export database functions for backwards compatibility
export const documentDb = documentRepository;
export const comparisonDb = comparisonRepository;
// export const queueDb = queueRepository; // TODO: Create when needed

// Placeholder database functions
export async function executeQuery(sql: string, values?: any[]): Promise<any> {
  throw new Error('Raw SQL queries not supported in development mode');
}

export async function getConnection(): Promise<any> {
  throw new Error('Database connections not supported in development mode');
}