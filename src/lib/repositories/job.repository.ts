import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import pool, { executeQuery } from '../database/connection';
import {
  CreateQueueJobData,
  QueueJobRepository,
  QueueJobRow
} from './interfaces/job.repository.interface';

type RawQueueRow = RowDataPacket & {
  id: number;
  job_type: string;
  payload: string | object | null;
  status: string;
  available_at: Date;
  attempts: number;
  max_attempts: number;
  last_error: string | null;
  locked_at: Date | null;
  locked_by: string | null;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

function normalizePayload(rawPayload: RawQueueRow['payload']): unknown {
  if (rawPayload === null || rawPayload === undefined) {
    return null;
  }

  if (typeof rawPayload === 'string') {
    try {
      return JSON.parse(rawPayload);
    } catch {
      return rawPayload;
    }
  }

  return rawPayload;
}

function mapRow(row: RawQueueRow): QueueJobRow {
  return {
    id: Number(row.id),
    job_type: row.job_type,
    payload: normalizePayload(row.payload),
    status: row.status as QueueJobRow['status'],
    available_at: row.available_at,
    attempts: Number(row.attempts),
    max_attempts: Number(row.max_attempts),
    last_error: row.last_error,
    locked_at: row.locked_at,
    locked_by: row.locked_by,
    completed_at: row.completed_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

const BASE_SELECT_FIELDS = `
  id,
  job_type,
  payload,
  status,
  available_at,
  attempts,
  max_attempts,
  last_error,
  locked_at,
  locked_by,
  completed_at,
  created_at,
  updated_at
`;

export class DbQueueJobRepository implements QueueJobRepository {
  async enqueueJob(data: CreateQueueJobData): Promise<number> {
    const runAt = data.runAt ?? new Date();
    const maxAttempts = Number.isFinite(data.maxAttempts) && data.maxAttempts
      ? Math.max(1, Math.floor(data.maxAttempts))
      : 5;

    const result = await executeQuery(
      `INSERT INTO queue_jobs (job_type, payload, available_at, max_attempts)
       VALUES (?, CAST(? AS JSON), ?, ?)`,
      [
        data.jobType,
        JSON.stringify(data.payload ?? null),
        runAt,
        maxAttempts,
      ]
    ) as ResultSetHeader;

    return Number(result.insertId);
  }

  async claimNextJob(workerId: string): Promise<QueueJobRow | null> {
    let connection: PoolConnection | null = null;

    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      const [rows] = await connection.query<RawQueueRow[]>(
        `
        SELECT ${BASE_SELECT_FIELDS}
        FROM queue_jobs
        WHERE status = 'pending'
          AND available_at <= NOW()
        ORDER BY available_at ASC, id ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
        `
      );

      if (!rows.length) {
        await connection.rollback();
        return null;
      }

      const row = rows[0];

      await connection.query(
        `
        UPDATE queue_jobs
        SET status = 'processing',
            locked_at = NOW(),
            locked_by = ?,
            attempts = attempts + 1,
            updated_at = NOW()
        WHERE id = ?
        `,
        [workerId, row.id]
      );

      await connection.commit();

      const updatedRow: RawQueueRow = {
        ...row,
        status: 'processing',
        locked_at: new Date(),
        locked_by: workerId,
        attempts: Number(row.attempts) + 1,
      };

      return mapRow(updatedRow);
    } catch (error) {
      if (connection) {
        await connection.rollback();
      }
      throw error;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  async markJobCompleted(id: number): Promise<void> {
    await executeQuery(
      `
      UPDATE queue_jobs
      SET status = 'completed',
          completed_at = NOW(),
          locked_at = NULL,
          locked_by = NULL,
          updated_at = NOW()
      WHERE id = ?
      `,
      [id]
    );
  }

  async markJobFailed(id: number, error: string, retryDelaySeconds: number): Promise<{ finalFailure: boolean }> {
    const rows = await executeQuery(
      'SELECT attempts, max_attempts FROM queue_jobs WHERE id = ? LIMIT 1',
      [id]
    ) as Array<{ attempts: number; max_attempts: number }>;

    if (!rows.length) {
      return { finalFailure: true };
    }

    const attempts = Number(rows[0].attempts);
    const maxAttempts = Number(rows[0].max_attempts);
    const finalFailure = attempts >= maxAttempts;

    if (finalFailure) {
      await executeQuery(
        `
        UPDATE queue_jobs
        SET status = 'failed',
            last_error = ?,
            completed_at = NOW(),
            locked_at = NULL,
            locked_by = NULL,
            updated_at = NOW()
        WHERE id = ?
        `,
        [error, id]
      );
    } else {
      await executeQuery(
        `
        UPDATE queue_jobs
        SET status = 'pending',
            last_error = ?,
            available_at = DATE_ADD(NOW(), INTERVAL ? SECOND),
            locked_at = NULL,
            locked_by = NULL,
            updated_at = NOW()
        WHERE id = ?
        `,
        [error, retryDelaySeconds, id]
      );
    }

    return { finalFailure };
  }
}

export const queueJobRepository = new DbQueueJobRepository();
