/**
 * Minimal Queue System
 * Simple background job processing
 */

import { getRedis } from './connection';

const QUEUE_KEY = 'vvg:jobs';

interface Job {
  id: string;
  type: string;
  data: any;
  createdAt: number;
}

export const queue = {
  /**
   * Add job to queue
   */
  async add(type: string, data: any): Promise<string> {
    const jobId = `${type}:${Date.now()}:${Math.random().toString(36).substring(7)}`;
    
    const job: Job = {
      id: jobId,
      type,
      data,
      createdAt: Date.now()
    };

    try {
      const redis = getRedis();
      await redis.lpush(QUEUE_KEY, JSON.stringify(job));
      console.log(`✅ Job queued: ${jobId}`);
      return jobId;
    } catch (error) {
      console.error(`❌ Failed to queue job ${jobId}:`, error instanceof Error ? error.message : String(error));
      throw error;
    }
  },

  /**
   * Process one job (call this in a loop or cron)
   */
  async processNext(): Promise<boolean> {
    try {
      const redis = getRedis();
      const jobData = await redis.brpop(QUEUE_KEY, 1); // 1 second timeout
      
      if (!jobData) return false; // No jobs available
      
      const job: Job = JSON.parse(jobData[1]);
      console.log(`🔄 Processing job: ${job.id}`);
      
      // Process based on job type
      await processJob(job);
      
      console.log(`✅ Job completed: ${job.id}`);
      return true;
    } catch (error) {
      console.error('❌ Job processing failed:', error instanceof Error ? error.message : String(error));
      return false;
    }
  }
};

// Simple job processor
async function processJob(job: Job) {
  switch (job.type) {
    case 'process-document':
      // Add your document processing here
      console.log(`📄 Processing document: ${job.data.fileId}`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate work
      break;
    
    case 'send-email':
      console.log(`📧 Sending email to: ${job.data.to}`);
      await new Promise(resolve => setTimeout(resolve, 500));
      break;
    
    default:
      console.warn(`Unknown job type: ${job.type}`);
  }
}