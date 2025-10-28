import { randomUUID } from 'crypto';
import { config } from '../config';
import { queueJobRepository } from '../repositories/job.repository';
import type { QueueJobRow } from '../repositories/interfaces/job.repository.interface';

export interface QueueJob {
  id: number;
  type: string;
  payload: unknown;
  attempts: number;
  maxAttempts: number;
  availableAt: Date;
  lastError: string | null;
  lockedAt: Date | null;
  lockedBy: string | null;
}

export interface EnqueueJobOptions {
  runAt?: Date;
  maxAttempts?: number;
}

export type JobHandler = (job: QueueJob) => Promise<void>;

const DEFAULT_RETRY_DELAY_SECONDS = Math.max(0, config.queue.retryDelaySeconds);

function toQueueJob(row: QueueJobRow): QueueJob {
  return {
    id: row.id,
    type: row.job_type,
    payload: row.payload,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    availableAt: row.available_at,
    lastError: row.last_error,
    lockedAt: row.locked_at,
    lockedBy: row.locked_by,
  };
}

export class JobService {
  private handlers = new Map<string, JobHandler>();
  private readonly workerId: string;
  private readonly retryDelaySeconds: number;

  constructor() {
    this.workerId = process.env.QUEUE_WORKER_ID ?? `worker-${randomUUID()}`;
    this.retryDelaySeconds = DEFAULT_RETRY_DELAY_SECONDS;
  }

  registerHandler(type: string, handler: JobHandler) {
    this.handlers.set(type, handler);
  }

  async enqueueJob(type: string, payload: unknown, options: EnqueueJobOptions = {}) {
    const maxAttempts = options.maxAttempts ?? config.queue.maxAttemptsDefault;

    return queueJobRepository.enqueueJob({
      jobType: type,
      payload,
      runAt: options.runAt,
      maxAttempts,
    });
  }

  async processNext(): Promise<{
    processed: boolean;
    failed?: boolean;
    finalFailure?: boolean;
    missingHandler?: boolean;
  }> {
    const row = await queueJobRepository.claimNextJob(this.workerId);
    if (!row) {
      return { processed: false };
    }

    const job = toQueueJob(row);
    const handler = this.handlers.get(job.type);

    if (!handler) {
      const errorMessage = `No handler registered for job type "${job.type}"`;
      await queueJobRepository.markJobFailed(job.id, errorMessage, this.retryDelaySeconds);
      console.error(errorMessage);
      return { processed: true, failed: true, missingHandler: true, finalFailure: false };
    }

    try {
      await handler(job);
      await queueJobRepository.markJobCompleted(job.id);
      return { processed: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Job ${job.id} failed:`, errorMessage);
      const { finalFailure } = await queueJobRepository.markJobFailed(
        job.id,
        errorMessage,
        this.retryDelaySeconds
      );
      return { processed: true, failed: true, finalFailure };
    }
  }

  getRegisteredJobTypes(): string[] {
    return Array.from(this.handlers.keys());
  }
}

export const jobService = new JobService();
