export type QueueJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface QueueJobRow {
  id: number;
  job_type: string;
  payload: any;
  status: QueueJobStatus;
  available_at: Date;
  attempts: number;
  max_attempts: number;
  last_error: string | null;
  locked_at: Date | null;
  locked_by: string | null;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateQueueJobData {
  jobType: string;
  payload: unknown;
  runAt?: Date;
  maxAttempts?: number;
}

export interface ClaimedQueueJob extends QueueJobRow {
  payload: unknown;
  attempts: number;
}

export interface QueueJobRepository {
  enqueueJob(data: CreateQueueJobData): Promise<number>;
  claimNextJob(workerId: string): Promise<QueueJobRow | null>;
  markJobCompleted(id: number): Promise<void>;
  markJobFailed(id: number, error: string, retryDelaySeconds: number): Promise<{ finalFailure: boolean }>;
}
