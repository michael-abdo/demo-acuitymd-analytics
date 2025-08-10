export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';

export async function POST(_request: NextRequest) {
  try {
    const body = await _request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json({
        success: false,
        operation: 'url.validate',
        message: 'URL is required',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    // Basic URL validation
    try {
      new URL(url);
      return NextResponse.json({
        success: true,
        operation: 'url.validate',
        message: 'URL is valid',
        data: { url, valid: true },
        timestamp: new Date().toISOString()
      });
    } catch {
      return NextResponse.json({
        success: false,
        operation: 'url.validate',
        message: 'Invalid URL format',
        data: { url, valid: false },
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      operation: 'url.validate',
      message: 'Invalid request body',
      timestamp: new Date().toISOString()
    }, { status: 400 });
  }
}