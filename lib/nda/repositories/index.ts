/**
 * Repository exports
 * 
 * Central export point for all repository implementations.
 * Part of the fifth-pass DRY refactoring to eliminate database code duplication.
 */

export { BaseRepository, type IRepository, type RepositoryConfig } from './base';
export { DocumentRepository, type IDocumentRepository } from './document';
export { ComparisonRepository, type IComparisonRepository, type NDAComparisonExtended } from './comparison';
export { QueueRepository, type IQueueRepository, type QueueItemExtended } from './queue';

// Create singleton instances
import { DocumentRepository } from './document';
import { ComparisonRepository } from './comparison';
import { QueueRepository } from './queue';

// Export singleton instances to maintain compatibility with existing code
export const documentRepository = new DocumentRepository();
export const comparisonRepository = new ComparisonRepository();
export const queueRepository = new QueueRepository();