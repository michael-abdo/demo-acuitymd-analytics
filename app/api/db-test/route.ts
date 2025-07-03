import { NextResponse } from 'next/server';
import { testDatabaseConnection, executeQuery } from '@/lib/db';

export async function GET() {
  try {
    // First test the connection
    const connectionTest = await testDatabaseConnection();
    
    if (!connectionTest.success) {
      return NextResponse.json({
        success: false,
        error: 'Database connection test failed',
        details: connectionTest
      }, { status: 500 });
    }
    
    // Then check if we can query the truck table
    const tableName = process.env.TRUCK_TABLE_NAME;
    
    if (!tableName) {
      return NextResponse.json({
        success: false,
        error: 'TRUCK_TABLE_NAME environment variable is not set'
      }, { status: 500 });
    }
    
    console.log(`Testing query on table: ${tableName}`);
    
    try {
      // Try to count rows in the table
      const query = `SELECT COUNT(*) as count FROM ${tableName}`;
      const result = await executeQuery<any[]>({ query });
      
      // Try to get the first record from the table
      const sampleQuery = `SELECT * FROM ${tableName} LIMIT 1`;
      const sampleResult = await executeQuery<any[]>({ query: sampleQuery });
      
      return NextResponse.json({
        success: true,
        message: 'Database connection and table query successful',
        rowCount: result[0].count,
        tableName: tableName,
        sample: sampleResult.length > 0 ? sampleResult[0] : null,
        tableStructure: sampleResult.length > 0 ? Object.keys(sampleResult[0]) : []
      });
    } catch (queryError) {
      return NextResponse.json({
        success: false,
        error: 'Database query failed',
        tableName: tableName,
        details: queryError instanceof Error ? queryError.message : String(queryError)
      }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to test database connection',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 