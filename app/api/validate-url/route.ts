import { NextRequest, NextResponse } from 'next/server';

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
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Ensure URL is valid before proceeding
    try {
      new URL(url);
    } catch (e) {
      return NextResponse.json({ isValid: false }, { status: 200 });
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
      
      return NextResponse.json({ isValid });
    } catch (error) {
      console.error(`Failed to validate URL ${url}:`, error);
      return NextResponse.json({ isValid: false });
    }
  } catch (error) {
    console.error('Error in validate-url API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 