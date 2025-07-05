import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { NextResponse } from "next/server"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Centralized API error response utilities for consistent error handling
 */
export const ApiErrors = {
  unauthorized: () => NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
  notFound: (resource: string) => NextResponse.json({ error: `${resource} not found` }, { status: 404 }),
  badRequest: (message: string) => NextResponse.json({ error: message }, { status: 400 }),
  serverError: (message: string) => NextResponse.json({ error: message }, { status: 500 }),
  forbidden: (message: string = 'Access denied') => NextResponse.json({ error: message }, { status: 403 }),
  conflict: (message: string) => NextResponse.json({ error: message }, { status: 409 }),
  validation: (message: string, details?: any) => NextResponse.json({ 
    error: message, 
    details 
  }, { status: 422 })
};

/**
 * Utility function to ensure endpoint is only available in development environment
 * Throws error that can be caught and converted to 403 response
 */
export function requireDevelopment() {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('Not available in production');
  }
}
