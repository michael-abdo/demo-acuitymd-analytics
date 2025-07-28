/**
 * Simplified Utilities - No Circular Dependencies
 * 
 * This file contains essential utilities without complex imports
 * to break circular dependency issues during build.
 */

import { NextResponse } from "next/server";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function for merging Tailwind classes
 * Extracted from utils.ts to avoid circular dependencies
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Simple timestamp utility
 */
export const SimpleTimestamp = {
  now: () => new Date().toISOString(),
  fromDate: (date: Date) => date.toISOString(),
};

/**
 * Simple API error responses
 */
export const SimpleApiErrors = {
  badRequest: (message: string = 'Bad request') => 
    NextResponse.json({ error: message, timestamp: SimpleTimestamp.now() }, { status: 400 }),
    
  unauthorized: (message: string = 'Authentication required') => 
    NextResponse.json({ error: message, timestamp: SimpleTimestamp.now() }, { status: 401 }),
    
  notFound: (message: string = 'Resource not found') => 
    NextResponse.json({ error: message, timestamp: SimpleTimestamp.now() }, { status: 404 }),
    
  serverError: (message: string = 'Internal server error') => 
    NextResponse.json({ error: message, timestamp: SimpleTimestamp.now() }, { status: 500 }),
};

/**
 * Simple API responses
 */
export const SimpleApiResponse = {
  success: (data?: any, message?: string) => 
    NextResponse.json({ 
      success: true, 
      data, 
      message,
      timestamp: SimpleTimestamp.now() 
    }),
    
  created: (data?: any, message?: string) => 
    NextResponse.json({ 
      success: true, 
      data, 
      message,
      timestamp: SimpleTimestamp.now() 
    }, { status: 201 }),
};

/**
 * Simple logger for debugging
 */
export const SimpleLogger = {
  info: (message: string, data?: any) => {
    console.log(`[INFO] ${message}`, data ? data : '');
  },
  
  error: (message: string, error?: Error) => {
    console.error(`[ERROR] ${message}`, error?.message || '');
  },
  
  warn: (message: string, data?: any) => {
    console.warn(`[WARN] ${message}`, data ? data : '');
  },
};