/**
 * ApprovalProcess Repository Implementation
 * Handles all database operations for approval_processes
 */

import { executeQuery } from '../database/connection';
import {
  IApprovalProcessRepository,
  CreateApprovalProcessData,
  UpdateApprovalProcessData,
  ApprovalProcessRow,
  ApprovalProcessQueryOptions,
  PaginatedApprovalProcesssResult
} from './interfaces/approval_process.repository.interface';

export class ApprovalProcessRepository implements IApprovalProcessRepository {

  private async withErrorHandling<T>(operation: () => Promise<T>, operationName: string): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`Repository error in ${operationName}:`, error);

      let helpMessage = `Database error during "${operationName}".\n`;

      if (errorMsg.includes('ECONNREFUSED')) {
        helpMessage += 'MySQL server is not running. Start it with: brew services start mysql (macOS) or sudo systemctl start mysql (Linux)';
      } else if (errorMsg.includes("doesn't exist") || errorMsg.includes('Unknown table')) {
        helpMessage += 'Database table is missing. Run: npm run db:setup';
      } else if (errorMsg.includes('Duplicate entry')) {
        helpMessage += 'A approval_process with this data already exists.';
      } else if (errorMsg.includes('Data too long')) {
        helpMessage += 'Input data exceeds maximum length.';
      } else if (errorMsg.includes('Access denied')) {
        helpMessage += 'Database credentials are incorrect. Check DATABASE_URL in .env';
      } else {
        helpMessage += `Technical details: ${errorMsg}`;
      }

      throw new Error(helpMessage);
    }
  }

  async createApprovalProcess(data: CreateApprovalProcessData): Promise<{ insertId: number }> {
    return this.withErrorHandling(async () => {
      const result = await executeQuery(
        `INSERT INTO approval_processes (stage_name, start_date, end_date, status, responsible_person, user_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [data.stage_name, data.start_date, data.end_date, data.status, data.responsible_person, data.user_id]
      );
      return result as { insertId: number };
    }, 'createApprovalProcess');
  }

  async getApprovalProcessById(id: number): Promise<ApprovalProcessRow | null> {
    return this.withErrorHandling(async () => {
      const results = await executeQuery(
        'SELECT * FROM approval_processes WHERE id = ?',
        [id]
      ) as ApprovalProcessRow[];
      return Array.isArray(results) && results.length > 0 ? results[0] : null;
    }, 'getApprovalProcessById');
  }

  async getUserApprovalProcesss(userId: string): Promise<ApprovalProcessRow[]> {
    return this.withErrorHandling(async () => {
      return executeQuery(
        'SELECT * FROM approval_processes WHERE user_id = ? ORDER BY created_at DESC',
        [userId]
      ) as Promise<ApprovalProcessRow[]>;
    }, 'getUserApprovalProcesss');
  }

  async getUserApprovalProcesssWithFilters(
    userId: string,
    options: ApprovalProcessQueryOptions
  ): Promise<PaginatedApprovalProcesssResult> {
    return this.withErrorHandling(async () => {
      const {
        search,
        page = 1,
        pageSize = 25,
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = options;

      const MAX_PAGE_SIZE = 100;
      const safePage = Math.max(1, Math.floor(Number(page) || 1));
      const safePageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(Number(pageSize) || 25)));
      const offset = (safePage - 1) * safePageSize;

      const conditions: string[] = ['user_id = ?'];
      const args: unknown[] = [userId];

      if (search) {
        conditions.push('(stage_name LIKE ? OR status LIKE ? OR responsible_person LIKE ?)');
        const likeQuery = `%${search}%`;
        args.push(likeQuery);
        args.push(likeQuery);
        args.push(likeQuery);

      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;
      const allowedSortColumns = new Set(['created_at', 'stage_name']);
      const orderColumn = allowedSortColumns.has(sortBy ?? '') ? sortBy : 'created_at';
      const orderDirection = sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      const approval_processes = await executeQuery(
        `SELECT * FROM approval_processes ${whereClause}
         ORDER BY ${orderColumn} ${orderDirection}
         LIMIT ${safePageSize} OFFSET ${offset}`,
        args
      ) as ApprovalProcessRow[];

      const countResult = await executeQuery(
        `SELECT COUNT(*) as total FROM approval_processes ${whereClause}`,
        args
      ) as Array<{ total: number }>;

      return {
        approval_processes,
        total: countResult?.[0]?.total ?? 0,
        page: safePage,
        pageSize: safePageSize
      };
    }, 'getUserApprovalProcesssWithFilters');
  }

  async updateApprovalProcess(id: number, updates: UpdateApprovalProcessData): Promise<void> {
    return this.withErrorHandling(async () => {
      const allowedColumns = new Set(['stage_name', 'start_date', 'end_date', 'status', 'responsible_person']);
      const safeUpdates = Object.entries(updates).filter(([key]) => allowedColumns.has(key));

      if (safeUpdates.length === 0) {
        throw new Error(
          'No valid update fields provided.\n' +
          'Allowed fields: stage_name, start_date, end_date, status, responsible_person'
        );
      }

      const setClause = safeUpdates.map(([key]) => `${key} = ?`).join(', ');
      const values = [...safeUpdates.map(([, value]) => value), id];

      await executeQuery(
        `UPDATE approval_processes SET ${setClause}, updated_at = NOW() WHERE id = ?`,
        values
      );
    }, 'updateApprovalProcess');
  }

  async deleteApprovalProcess(id: number): Promise<void> {
    return this.withErrorHandling(async () => {
      await executeQuery('DELETE FROM approval_processes WHERE id = ?', [id]);
    }, 'deleteApprovalProcess');
  }
}

export const approvalProcessRepository = new ApprovalProcessRepository();
