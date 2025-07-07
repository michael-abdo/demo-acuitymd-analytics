/**
 * Simple in-memory rate limiter
 * SMALLEST FEATURE: Basic rate limiting for expensive operations
 * FAIL FAST: Immediately reject when limit exceeded
 */

import { APP_CONSTANTS } from './config';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export class RateLimiter {
  private limits = new Map<string, RateLimitEntry>();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests = 10, windowMinutes = 60) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMinutes * 60 * 1000;
  }

  /**
   * Check if user is rate limited
   * @returns true if request should be allowed, false if rate limited
   */
  checkLimit(userId: string): boolean {
    const now = Date.now();
    const entry = this.limits.get(userId);

    // Clean up old entries periodically
    if (this.limits.size > APP_CONSTANTS.RATE_LIMITS.CLEANUP_THRESHOLD) {
      this.cleanup();
    }

    // No entry or expired window - allow request
    if (!entry || now > entry.resetTime) {
      this.limits.set(userId, {
        count: 1,
        resetTime: now + this.windowMs
      });
      return true;
    }

    // Within window - check count
    if (entry.count >= this.maxRequests) {
      return false; // Rate limited
    }

    // Increment count
    entry.count++;
    return true;
  }

  /**
   * Get remaining requests for user
   */
  getRemainingRequests(userId: string): number {
    const entry = this.limits.get(userId);
    if (!entry || Date.now() > entry.resetTime) {
      return this.maxRequests;
    }
    return Math.max(0, this.maxRequests - entry.count);
  }

  /**
   * Get reset time for user
   */
  getResetTime(userId: string): number | null {
    const entry = this.limits.get(userId);
    if (!entry || Date.now() > entry.resetTime) {
      return null;
    }
    return entry.resetTime;
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [userId, entry] of this.limits.entries()) {
      if (now > entry.resetTime) {
        this.limits.delete(userId);
      }
    }
  }
}

// Export singleton instances for different endpoints
export const compareRateLimiter = new RateLimiter(
  APP_CONSTANTS.RATE_LIMITS.COMPARE.MAX_REQUESTS, 
  APP_CONSTANTS.RATE_LIMITS.COMPARE.WINDOW_MINUTES
);
export const uploadRateLimiter = new RateLimiter(
  APP_CONSTANTS.RATE_LIMITS.UPLOAD.MAX_REQUESTS,
  APP_CONSTANTS.RATE_LIMITS.UPLOAD.WINDOW_MINUTES
);