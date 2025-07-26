/**
 * Repository exports
 * 
 * Central export point for all repository implementations.
 * Part of the fifth-pass DRY refactoring to eliminate database code duplication.
 */

export { BaseRepository, type IRepository, type RepositoryConfig } from './base';
export { DocumentRepository, type IDocumentRepository } from './document';

// Create singleton instances
import { DocumentRepository } from './document';

// Export singleton instances to maintain compatibility with existing code
export const documentRepository = new DocumentRepository();