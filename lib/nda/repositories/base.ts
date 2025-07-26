/**
 * Base Repository Pattern Implementation
 * 
 * This module provides a generic repository pattern that eliminates ~500 lines
 * of duplicated CRUD operations across entities. It handles both MySQL and
 * in-memory storage implementations transparently.
 */

import { executeQuery } from '@/lib/db';
import { config } from '@/lib/config';
import { TimestampUtils } from '@/lib/auth-utils';
import {
  InsertResult,
  UpdateResult,
  DeleteResult,
  QueryOptions
} from '../types';

// Check if we have database access
const HAS_DB_ACCESS = (config as any).DB_CREATE_ACCESS || false;

/**
 * Database operation error handling wrapper
 */
async function withDbErrorHandling<T>(
  operation: () => Promise<T>,
  context: {
    operation: string;
    entity: string;
    details?: Record<string, any>;
  }
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const errorMessage = `Database ${context.operation} failed for ${context.entity}`;
    const errorDetails = {
      message: error instanceof Error ? error.message : 'Unknown error',
      operation: context.operation,
      entity: context.entity,
      details: context.details
    };
    
    console.error(errorMessage, errorDetails);
    
    // Return more specific error types based on the error
    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED') || error.message.includes('Connection')) {
        throw new Error(`Database connection failed: ${context.operation} ${context.entity}`);
      }
      if (error.message.includes('Duplicate') || error.message.includes('duplicate')) {
        throw new Error(`Duplicate ${context.entity} found`);
      }
      if (error.message.includes('foreign key constraint')) {
        throw new Error(`Cannot ${context.operation} ${context.entity}: referenced data exists`);
      }
    }
    
    throw new Error(errorMessage);
  }
}

/**
 * Core repository interface for all entities
 */
export interface IRepository<T, TRow, TCreate> {
  create(data: TCreate): Promise<T>;
  findById(id: number): Promise<T | null>;
  findByUser(userId: string, options?: QueryOptions): Promise<T[]>;
  update(id: number, data: Partial<T>): Promise<boolean>;
  delete(id: number): Promise<boolean>;
}

/**
 * Configuration for BaseRepository
 */
export interface RepositoryConfig<T, TRow> {
  tableName: string;
  entityName: string;
  rowConverter: (row: TRow) => T;
  memoryStore: Map<number, T>;
  nextId: () => number;
}

/**
 * Base repository implementation with generic CRUD operations
 * Eliminates ~400 lines of repetitive database code
 */
export abstract class BaseRepository<T extends { id: number; created_at?: Date; updated_at?: Date }, TRow, TCreate> 
  implements IRepository<T, TRow, TCreate> {
  
  protected config: RepositoryConfig<T, TRow>;
  
  constructor(config: RepositoryConfig<T, TRow>) {
    this.config = config;
  }
  
  /**
   * Safe database query wrapper for SELECT operations
   */
  protected async safeQuery<R>(
    query: string,
    values: any[],
    operation: string,
    userId?: string
  ): Promise<R> {
    return withDbErrorHandling(
      () => executeQuery<R>({ query, values }),
      {
        operation,
        entity: this.config.entityName,
        details: { query: query.slice(0, 100), userId }
      }
    );
  }
  
  /**
   * Create a new entity
   */
  async create(data: TCreate): Promise<T> {
    if (HAS_DB_ACCESS) {
      const fields = Object.keys(data as any);
      const values = fields.map(k => this.prepareValue((data as any)[k], k));
      const placeholders = fields.map(() => '?').join(', ');
      
      const query = `
        INSERT INTO ${this.config.tableName} (${fields.join(', ')})
        VALUES (${placeholders})
      `;
      
      const result = await this.safeQuery<InsertResult>(
        query,
        values,
        'create',
        (data as any).user_id
      );
      
      const created = await this.findById(result.insertId);
      if (!created) {
        throw new Error(`Failed to retrieve created ${this.config.entityName}`);
      }
      return created;
    } else {
      // In-memory implementation
      const id = this.config.nextId();
      const now = new Date();
      const entity = {
        ...data,
        id,
        created_at: now,
        updated_at: now
      } as unknown as T;
      
      this.config.memoryStore.set(id, entity);
      return entity;
    }
  }
  
  /**
   * Find entity by ID
   */
  async findById(id: number): Promise<T | null> {
    if (HAS_DB_ACCESS) {
      const rows = await this.safeQuery<TRow[]>(
        `SELECT * FROM ${this.config.tableName} WHERE id = ?`,
        [id],
        'findById'
      );
      return rows.length > 0 ? this.config.rowConverter(rows[0]) : null;
    } else {
      return this.config.memoryStore.get(id) || null;
    }
  }
  
  /**
   * Find entities by user ID with optional query options
   */
  async findByUser(userId: string, options?: QueryOptions): Promise<T[]> {
    if (HAS_DB_ACCESS) {
      let query = `SELECT * FROM ${this.config.tableName} WHERE user_id = ?`;
      const values: any[] = [userId];
      
      if (options?.orderBy) {
        query += ' ORDER BY ' + options.orderBy
          .map(o => `${o.column} ${o.order}`)
          .join(', ');
      }
      
      if (options?.limit) {
        query += ' LIMIT ?';
        values.push(options.limit);
        if (options.offset) {
          query += ' OFFSET ?';
          values.push(options.offset);
        }
      }
      
      const rows = await this.safeQuery<TRow[]>(
        query,
        values,
        'findByUser',
        userId
      );
      return rows.map(row => this.config.rowConverter(row));
    } else {
      // In-memory implementation
      let entities = Array.from(this.config.memoryStore.values())
        .filter(entity => (entity as any).user_id === userId);
      
      if (options?.orderBy) {
        entities.sort((a, b) => {
          const order = options.orderBy![0];
          const aVal = (a as any)[order.column];
          const bVal = (b as any)[order.column];
          return order.order === 'ASC' ? 
            (aVal > bVal ? 1 : -1) : 
            (aVal < bVal ? 1 : -1);
        });
      }
      
      if (options?.limit) {
        const start = options.offset || 0;
        entities = entities.slice(start, start + options.limit);
      }
      
      return entities;
    }
  }
  
  /**
   * Update an entity by ID
   */
  async update(id: number, data: Partial<T>): Promise<boolean> {
    if (HAS_DB_ACCESS) {
      const fields = Object.keys(data).filter(k => k !== 'id' && k !== 'created_at');
      if (fields.length === 0) return false;
      
      const values = fields.map(k => this.prepareValue((data as any)[k], k));
      values.push(TimestampUtils.now()); // updated_at
      values.push(id);
      
      const query = `
        UPDATE ${this.config.tableName} 
        SET ${fields.map(f => `${f} = ?`).join(', ')}, updated_at = ?
        WHERE id = ?
      `;
      
      const result = await this.safeQuery<UpdateResult>(
        query,
        values,
        'update'
      );
      return result.affectedRows > 0;
    } else {
      // In-memory implementation
      const entity = this.config.memoryStore.get(id);
      if (!entity) return false;
      
      Object.assign(entity, data, { updated_at: new Date() });
      return true;
    }
  }
  
  /**
   * Delete an entity by ID
   */
  async delete(id: number): Promise<boolean> {
    if (HAS_DB_ACCESS) {
      const result = await this.safeQuery<DeleteResult>(
        `DELETE FROM ${this.config.tableName} WHERE id = ?`,
        [id],
        'delete'
      );
      return result.affectedRows > 0;
    } else {
      return this.config.memoryStore.delete(id);
    }
  }
  
  /**
   * Prepare value for database insertion/update
   * Handles JSON serialization for metadata fields
   */
  protected prepareValue(value: any, fieldName: string): any {
    if (value === undefined) return null;
    if (fieldName === 'metadata' && value && typeof value === 'object') {
      return JSON.stringify(value);
    }
    return value;
  }
  
  /**
   * Execute a custom query (for entity-specific operations)
   */
  protected async executeCustomQuery<R>(
    query: string,
    values: any[],
    operation: string,
    userId?: string
  ): Promise<R> {
    return this.safeQuery<R>(query, values, operation, userId);
  }
}