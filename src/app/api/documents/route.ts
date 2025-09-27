export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/with-auth';

export const GET = withAuth(async (_request, { userEmail }) => {
  try {
    // Now we have access to the authenticated session
    // This follows the DAL pattern - authentication happens at data access level
    
    // TODO: Implement actual document fetching logic here
    // For now, return a success response with user info
    return NextResponse.json({
      success: true,
      message: 'Documents retrieved successfully',
      user: userEmail,
      documents: [], // TODO: Fetch actual documents from database
      timestamp: new Date().toISOString()
    }, { status: 200 });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch documents',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
});