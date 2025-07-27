export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { ApiResponse, ApiErrors, TimestampUtils, withDevOnlyAccess, withAuth } from '@/lib/auth-utils';

export const GET = withDevOnlyAccess(withAuth(async (request: NextRequest, userEmail: string) => {
  // Use centralized auth wrapper (DRY: eliminates ~6 lines of duplicated auth logic)
  return ApiResponse.operation('protected.get', {
    result: {
      message: "This is protected API data",
      userEmail,
      timestamp: TimestampUtils.now(),
    },
    status: 'success'
  });
}));

export const POST = withDevOnlyAccess(withAuth(async (request: NextRequest, userEmail: string) => {
  // Use centralized auth wrapper (DRY: eliminates ~6 lines of duplicated auth logic)
  try {
    // Parse the request body
    const body = await request.json();
    
    // Process the data and return a response
    return ApiResponse.operation('protected.post', {
      result: {
        message: "Data received successfully",
        receivedData: body,
        userEmail,
        timestamp: TimestampUtils.now(),
      },
      status: 'created'
    });
  } catch (error) {
    return ApiErrors.badRequest('Invalid JSON data');
  }
})); 