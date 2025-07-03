import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const vin = searchParams.get('vin');
    
    if (!vin) {
      return NextResponse.json({ error: 'VIN parameter is required' }, { status: 400 });
    }
    
    console.log(`Searching for VIN: ${vin}`);
    
    // Check if environment variable is set
    if (!process.env.TRUCK_TABLE_NAME) {
      console.error('TRUCK_TABLE_NAME environment variable is not set');
      return NextResponse.json({ error: 'Table name not configured' }, { status: 500 });
    }
    
    // Query the database for the VIN
    const tableName = process.env.TRUCK_TABLE_NAME;
    const query = `SELECT * FROM ${tableName} WHERE vin = ? LIMIT 1`;
    const values = [vin];
    
    console.log(`Executing query: ${query} with value: ${vin}`);
    
    const results = await executeQuery<any[]>({ query, values });
    
    if (results.length === 0) {
      return NextResponse.json({ error: 'VIN not found' }, { status: 404 });
    }
    
    return NextResponse.json(results[0]);
  } catch (error) {
    console.error('Error searching VIN:', error);
    return NextResponse.json({ error: 'Failed to search VIN' }, { status: 500 });
  }
} 