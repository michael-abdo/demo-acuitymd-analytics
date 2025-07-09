import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Get the search parameters from the incorrect callback URL
  const searchParams = request.nextUrl.searchParams;
  
  // Build the correct callback URL with all parameters
  const baseUrl = request.headers.get('host') ? 
    `https://${request.headers.get('host')}` : 
    'https://legal.vtc.systems';
  const correctCallbackUrl = new URL('/nda-analyzer/api/auth/callback/azure-ad', baseUrl);
  
  // Copy all query parameters to the correct URL
  searchParams.forEach((value, key) => {
    correctCallbackUrl.searchParams.set(key, value);
  });
  
  // Redirect to the correct NextAuth callback URL
  return NextResponse.redirect(correctCallbackUrl.toString(), 307);
}

export async function POST(request: NextRequest) {
  // Handle POST requests the same way
  return GET(request);
}