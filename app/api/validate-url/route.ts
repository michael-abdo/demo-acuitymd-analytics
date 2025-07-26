export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, ApiErrors, Logger } from '@/lib/auth-utils';

/**
 * API endpoint that checks if a URL is valid or if it redirects
 * @param request NextRequest containing the URL to validate in the body
 * @returns NextResponse with validation result
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return ApiErrors.badRequest('URL is required');
    }

    // Ensure URL is valid before proceeding
    try {
      new URL(url);
    } catch (e) {
      return ApiResponse.operation('url.validate', {
        result: { isValid: false },
        status: 'success'
      });
    }

    try {
      // Use fetch with HEAD request to check if URL redirects
      const controller = new AbortController();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 5000)
      );
      
      const fetchPromise = fetch(url, {
        method: 'HEAD',
        redirect: 'manual', // Important: don't auto-follow redirects
        signal: controller.signal,
        // Add common headers to avoid being blocked
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        }
      });
      
      // Race between fetch and timeout
      const response = await Promise.race([
        fetchPromise,
        timeoutPromise
      ]) as Response;
      
      // Check if page exists and doesn't redirect
      const isValid = response.status === 200 && !response.redirected;
      
      return ApiResponse.operation('url.validate', {
        result: { isValid },
        status: 'success'
      });
    } catch (error) {
      Logger.api.error('VALIDATE_URL', `Failed to validate URL ${url}`, error as Error);
      return ApiResponse.operation('url.validate', {
        result: { isValid: false },
        status: 'success'
      });
    }
  } catch (error) {
    Logger.api.error('VALIDATE_URL', 'Error in validate-url API', error as Error);
    return ApiErrors.serverError('Internal server error');
  }
} 