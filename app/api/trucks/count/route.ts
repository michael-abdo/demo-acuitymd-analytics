import { NextResponse } from 'next/server';
import { countTrucksWithFilters } from '@/lib/mysql-filters';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { filters } = data;
    
    console.log('POST request received for truck count with filters:', JSON.stringify(filters, null, 2));
    
    // Check if environment variable is set
    if (!process.env.TRUCK_TABLE_NAME) {
      console.error('TRUCK_TABLE_NAME environment variable is not set');
      return NextResponse.json({ success: false, error: 'Table name not configured' }, { status: 500 });
    }
    
    // Use the dedicated function for counting trucks
    const result = await countTrucksWithFilters(filters);
    
    console.log(`Count result: ${result.count} trucks`);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error counting trucks:', error);
    return NextResponse.json({ error: 'Failed to count trucks' }, { status: 500 });
  }
} 