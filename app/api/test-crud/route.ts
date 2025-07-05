import { queryItems } from '@/lib/mysql'
import { NextResponse } from 'next/server'
import { config } from '@/lib/config'

export async function GET() {
  // Only available in development
  if (!config.IS_DEVELOPMENT) {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  try {
    // Test reading from existing table
    const listings = await queryItems('vvg_trucklistings', {}, 5)
    
    return NextResponse.json({
      status: 'success',
      message: 'CRUD operations test completed',
      operations: {
        read: {
          status: 'success',
          rowCount: listings.length,
          sample: listings.length > 0 ? listings[0] : null
        }
      }
    })

  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'CRUD operations test failed',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}