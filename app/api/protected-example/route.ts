export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { ApiResponse, ApiErrors, TimestampUtils } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
  // Production guard - FAIL FAST
  if (process.env.NODE_ENV === 'production') {
    return new Response(null, { status: 404 });
  }

  // Get the JWT token to verify authentication server-side
  const token = await getToken({ req: request });
  
  // If no token exists, the request is not authenticated
  if (!token) {
    return ApiErrors.unauthorized('Authentication required');
  }
  
  // Only proceed if the user is authenticated
  return ApiResponse.operation('protected.get', {
    result: {
      message: "This is protected API data",
      userId: token.id,
      timestamp: TimestampUtils.now(),
    },
    status: 'success'
  });
}

export async function POST(request: NextRequest) {
  // Production guard - FAIL FAST
  if (process.env.NODE_ENV === 'production') {
    return new Response(null, { status: 404 });
  }

  // Get the JWT token to verify authentication server-side
  const token = await getToken({ req: request });
  
  // If no token exists, the request is not authenticated
  if (!token) {
    return ApiErrors.unauthorized('Authentication required');
  }
  
  try {
    // Parse the request body
    const body = await request.json();
    
    // Process the data and return a response
    return ApiResponse.operation('protected.post', {
      result: {
        message: "Data received successfully",
        receivedData: body,
        userId: token.id,
        timestamp: TimestampUtils.now(),
      },
      status: 'created'
    });
  } catch (error) {
    return ApiErrors.badRequest('Invalid JSON data');
  }
} 