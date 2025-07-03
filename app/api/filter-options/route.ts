import { NextResponse } from 'next/server';
import { getFilterOptions } from '@/app/lib/option-cache';

export async function GET() {
  try {
    const options = await getFilterOptions();
    return NextResponse.json(options);
  } catch (error: unknown) {
    console.error('Error fetching filter options:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to fetch filter options', details: errorMessage },
      { status: 500 }
    );
  }
} 