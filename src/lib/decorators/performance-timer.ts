/**
 * Performance Timing Decorator
 * 
 * Provides consistent performance measurement and logging across all operations.
 * Eliminates ~30 lines of duplicated timing logic throughout the codebase.
 * 
 * Supports both sync/async functions, method decorators, and manual timing.
 */


/**
 * Performance measurement result
 */
export interface PerformanceResult<T> {
  result: T;
  timing: {
    startTime: Date;
    endTime: Date;
    duration: number;
    durationMs: number;
    durationFormatted: string;
    operationName: string;
  };
}

/**
 * Performance timing options
 */
export interface TimingOptions {
  operationName?: string;
  logResult?: boolean;
  threshold?: number; // Log only if duration exceeds threshold (ms)
  metadata?: Record<string, any>;
  logger?: {
    log: (message: string, data?: any) => void;
    warn: (message: string, data?: any) => void;
    error: (message: string, error?: Error) => void;
  };
}

/**
 * Manual performance timer for fine-grained control
 */
export class PerformanceTimer {
  private startTime: number;
  private operationName: string;
  private metadata: Record<string, any>;
  
  constructor(operationName: string, metadata: Record<string, any> = {}) {
    this.startTime = Date.now();
    this.operationName = operationName;
    this.metadata = metadata;
  }
  
  /**
   * Get elapsed time without ending the timer
   */
  elapsed(): number {
    return Date.now() - this.startTime;
  }
  
  /**
   * Get formatted elapsed time
   */
  elapsedFormatted(): string {
    return this.formatDuration(this.elapsed());
  }
  
  /**
   * End the timer and get timing information
   */
  end(): PerformanceResult<void>['timing'] {
    const endTime = Date.now();
    const duration = endTime - this.startTime;
    
    return {
      startTime: new Date(this.startTime),
      endTime: new Date(endTime),
      duration,
      durationMs: duration,
      durationFormatted: this.formatDuration(duration),
      operationName: this.operationName
    };
  }
  
  /**
   * End the timer with logging
   */
  endWithLog(
    options: {
      logger?: TimingOptions['logger'];
      threshold?: number;
      level?: 'log' | 'warn';
    } = {}
  ): PerformanceResult<void>['timing'] {
    const timing = this.end();
    const { logger, threshold = 0, level = 'log' } = options;
    
    if (timing.duration >= threshold) {
      const message = `${this.operationName} completed in ${timing.durationFormatted}`;
      const logData = {
        duration: timing.duration,
        startTime: timing.startTime.toISOString(),
        endTime: timing.endTime.toISOString(),
        ...this.metadata
      };
      
      if (logger) {
        logger[level](message, logData);
      } else {
        console[level](`[PERFORMANCE] ${message}`, logData);
      }
    }
    
    return timing;
  }
  
  /**
   * Format duration in human-readable format
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(2)}m`;
    return `${(ms / 3600000).toFixed(2)}h`;
  }
}

/**
 * Performance timing decorator for functions
 */
export function withPerformanceTiming<T extends (...args: any[]) => any>(
  fn: T,
  options: TimingOptions = {}
): T {
  const {
    operationName = fn.name || 'anonymous',
    logResult = true,
    threshold = 0,
    metadata = {},
    logger
  } = options;
  
  return (async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    const timer = new PerformanceTimer(operationName, {
      ...metadata,
      args: args.length
    });
    
    try {
      const result = await fn(...args);
      
      if (logResult) {
        timer.endWithLog({
          logger,
          threshold,
          level: timer.elapsed() > threshold * 2 ? 'warn' : 'log'
        });
      }
      
      return result;
    } catch (error) {
      const timing = timer.end();
      
      if (logger) {
        logger.error(`${operationName} failed after ${timing.durationFormatted}`, error as Error);
      } else {
        console.error(`[PERFORMANCE] ${operationName} failed after ${timing.durationFormatted}`, error);
      }
      
      throw error;
    }
  }) as T;
}

/**
 * Async function timing wrapper
 */
export async function measureAsync<T>(
  operation: () => Promise<T>,
  options: TimingOptions = {}
): Promise<PerformanceResult<T>> {
  const {
    operationName = 'async operation',
    logResult = false,
    threshold = 0,
    metadata = {},
    logger
  } = options;
  
  const timer = new PerformanceTimer(operationName, metadata);
  
  try {
    const result = await operation();
    const timing = timer.end();
    
    if (logResult && timing.duration >= threshold) {
      const message = `${operationName} completed in ${timing.durationFormatted}`;
      if (logger) {
        logger.log(message, { ...timing, ...metadata });
      } else {
        console.log(`[PERFORMANCE] ${message}`, { ...timing, ...metadata });
      }
    }
    
    return { result, timing };
  } catch (error) {
    const timing = timer.end();
    
    if (logger) {
      logger.error(`${operationName} failed after ${timing.durationFormatted}`, error as Error);
    } else {
      console.error(`[PERFORMANCE] ${operationName} failed after ${timing.durationFormatted}`, error);
    }
    
    throw error;
  }
}

/**
 * Sync function timing wrapper
 */
export function measureSync<T>(
  operation: () => T,
  options: TimingOptions = {}
): PerformanceResult<T> {
  const {
    operationName = 'sync operation',
    logResult = false,
    threshold = 0,
    metadata = {},
    logger
  } = options;
  
  const timer = new PerformanceTimer(operationName, metadata);
  
  try {
    const result = operation();
    const timing = timer.end();
    
    if (logResult && timing.duration >= threshold) {
      const message = `${operationName} completed in ${timing.durationFormatted}`;
      if (logger) {
        logger.log(message, { ...timing, ...metadata });
      } else {
        console.log(`[PERFORMANCE] ${message}`, { ...timing, ...metadata });
      }
    }
    
    return { result, timing };
  } catch (error) {
    const timing = timer.end();
    
    if (logger) {
      logger.error(`${operationName} failed after ${timing.durationFormatted}`, error as Error);
    } else {
      console.error(`[PERFORMANCE] ${operationName} failed after ${timing.durationFormatted}`, error);
    }
    
    throw error;
  }
}

/**
 * Method decorator for class methods (experimental)
 */
export function PerformanceTracked(
  operationName?: string,
  options: Omit<TimingOptions, 'operationName'> = {}
) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const methodName = operationName || `${target.constructor.name}.${propertyKey}`;
    
    descriptor.value = withPerformanceTiming(originalMethod, {
      ...options,
      operationName: methodName
    });
    
    return descriptor;
  };
}

/**
 * Batch timing for multiple operations
 */
export class BatchTimer {
  private operations: Map<string, PerformanceTimer> = new Map();
  private results: Map<string, PerformanceResult<any>['timing']> = new Map();
  
  /**
   * Start timing an operation
   */
  start(operationName: string, metadata: Record<string, any> = {}): void {
    this.operations.set(operationName, new PerformanceTimer(operationName, metadata));
  }
  
  /**
   * End timing an operation
   */
  end(operationName: string): PerformanceResult<void>['timing'] | null {
    const timer = this.operations.get(operationName);
    if (!timer) return null;
    
    const timing = timer.end();
    this.results.set(operationName, timing);
    this.operations.delete(operationName);
    
    return timing;
  }
  
  /**
   * Get all completed timings
   */
  getAllTimings(): Record<string, PerformanceResult<void>['timing']> {
    const timings: Record<string, PerformanceResult<void>['timing']> = {};
    for (const [name, timing] of this.results) {
      timings[name] = timing;
    }
    return timings;
  }
  
  /**
   * Get total duration of all operations
   */
  getTotalDuration(): number {
    let total = 0;
    for (const timing of this.results.values()) {
      total += timing.duration;
    }
    return total;
  }
  
  /**
   * Clear all results
   */
  clear(): void {
    this.operations.clear();
    this.results.clear();
  }
}

/**
 * Convenience functions for common timing patterns
 */
export const PerformanceUtils = {
  /**
   * Time a database operation
   */
  async timeDatabase<T>(
    operation: () => Promise<T>,
    operationName: string,
    metadata: Record<string, any> = {}
  ): Promise<PerformanceResult<T>> {
    return measureAsync(operation, {
      operationName: `DB: ${operationName}`,
      logResult: true,
      threshold: 100, // Log slow DB operations (>100ms)
      metadata: { type: 'database', ...metadata }
    });
  },
  
  /**
   * Time an API call
   */
  async timeApiCall<T>(
    operation: () => Promise<T>,
    endpoint: string,
    metadata: Record<string, any> = {}
  ): Promise<PerformanceResult<T>> {
    return measureAsync(operation, {
      operationName: `API: ${endpoint}`,
      logResult: true,
      threshold: 500, // Log slow API calls (>500ms)
      metadata: { type: 'api', endpoint, ...metadata }
    });
  },
  
  /**
   * Time a file operation
   */
  async timeFileOperation<T>(
    operation: () => Promise<T>,
    operationType: string,
    metadata: Record<string, any> = {}
  ): Promise<PerformanceResult<T>> {
    return measureAsync(operation, {
      operationName: `FILE: ${operationType}`,
      logResult: true,
      threshold: 200, // Log slow file operations (>200ms)
      metadata: { type: 'file', ...metadata }
    });
  },
  
  /**
   * Time text processing operations
   */
  async timeTextProcessing<T>(
    operation: () => Promise<T>,
    processingType: string,
    metadata: Record<string, any> = {}
  ): Promise<PerformanceResult<T>> {
    return measureAsync(operation, {
      operationName: `TEXT: ${processingType}`,
      logResult: true,
      threshold: 1000, // Log slow text processing (>1s)
      metadata: { type: 'text-processing', ...metadata }
    });
  },
  
  /**
   * Create a timer for manual timing
   */
  createTimer(operationName: string, metadata: Record<string, any> = {}): PerformanceTimer {
    return new PerformanceTimer(operationName, metadata);
  },
  
  /**
   * Create a batch timer for multiple operations
   */
  createBatchTimer(): BatchTimer {
    return new BatchTimer();
  }
};