import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function GET(request: NextRequest) {
  // Production guard - FAIL FAST
  if (process.env.NODE_ENV === 'production') {
    return new Response(null, { status: 404 });
  }

  // Get the JWT token to verify authentication server-side
  const token = await getToken({ req: request });
  
  // If no token exists, the request is not authenticated
  if (!token) {
    return NextResponse.json(
      { error: "Unauthorized: Authentication required" },
      { status: 401 }
    );
  }
  
  // Only proceed if the user is authenticated
  return NextResponse.json({
    message: "This is protected API data",
    userId: token.id,
    timestamp: new Date().toISOString(),
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
    return NextResponse.json(
      { error: "Unauthorized: Authentication required" },
      { status: 401 }
    );
  }
  
  try {
    // Parse the request body
    const body = await request.json();
    
    // Process the data and return a response
    return NextResponse.json({
      message: "Data received successfully",
      receivedData: body,
      userId: token.id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid JSON data" },
      { status: 400 }
    );
  }
} 