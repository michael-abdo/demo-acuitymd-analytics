import { NextResponse } from 'next/server';
import { buildSqlFilterFromParams, buildSqlFilterFromJsonBody, queryTrucksWithFilters } from '@/lib/mysql-filters';
import { executeQuery } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const searchTerm = searchParams.get('searchTerm') || '';
    const minYear = searchParams.get('minYear') || '';
    const maxYear = searchParams.get('maxYear') || '';
    const minMileage = searchParams.get('minMileage') || '';
    const maxMileage = searchParams.get('maxMileage') || '';
    const minPrice = searchParams.get('minPrice') || '';
    const maxPrice = searchParams.get('maxPrice') || '';
    const makes = searchParams.get('makes') || '';
    const states = searchParams.get('states') || '';
    const minHorsepower = searchParams.get('minHorsepower') || '';
    const maxHorsepower = searchParams.get('maxHorsepower') || '';
    const transmission = searchParams.get('transmission') || '';
    const transmissionManufacturer = searchParams.get('transmissionManufacturer') || '';
    const engineManufacturer = searchParams.get('engineManufacturer') || '';
    const engineModel = searchParams.get('engineModel') || '';
    const cabType = searchParams.get('cabType') || '';
    const source = searchParams.get('source') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    
    console.log('Filter params received:', { 
      searchTerm, minYear, maxYear, minMileage, maxMileage, 
      minPrice, maxPrice, makes, states, 
      minHorsepower, maxHorsepower, transmission, transmissionManufacturer,
      engineManufacturer, engineModel, cabType,
      source,
      page, limit 
    });
    
    // Parse the makes and states arrays
    const selectedMakes = makes ? JSON.parse(makes) : [];
    const selectedStates = states ? JSON.parse(states) : [];
    
    console.log('Parsed states:', selectedStates);
    
    // Convert DynamoDB style filters to MySQL WHERE clauses
    const { whereClause, values } = buildSqlFilterFromParams({
      searchTerm,
      minYear,
      maxYear,
      minMileage,
      maxMileage,
      minPrice,
      maxPrice,
      makes,
      states,
      minHorsepower,
      maxHorsepower,
      transmission,
      transmissionManufacturer,
      engineManufacturer,
      engineModel,
      cabType,
      source
    });
    
    // Check if environment variable is set
    if (!process.env.TRUCK_TABLE_NAME) {
      console.error('TRUCK_TABLE_NAME environment variable is not set');
      return NextResponse.json({ success: false, error: 'Table name not configured' }, { status: 500 });
    }
    
    // Log the table information for debugging
    console.log('Using MySQL table:', process.env.TRUCK_TABLE_NAME);
    console.log('Using MySQL database:', process.env.MYSQL_DATABASE);
    console.log('MySQL connection details:', {
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      database: process.env.MYSQL_DATABASE
    });
    
    try {
      // Calculate offset for pagination
      const offset = (page - 1) * limit;
      
      // Get total count for pagination
      const tableName = process.env.TRUCK_TABLE_NAME;
      const countQuery = `SELECT COUNT(*) as total FROM ${tableName} ${whereClause}`;
      
      console.log("Count query:", countQuery);
      console.log("With values:", values);
      
      const countResult = await executeQuery<any[]>({ query: countQuery, values });
      const totalItems = countResult[0]?.total || 0;
      
      // Execute MySQL query with pagination
      const query = `SELECT * FROM ${tableName} ${whereClause} LIMIT ? OFFSET ?`;
      
      console.log("Executing query:", query);
      console.log("With values:", [...values, limit, offset]);
      
      const trucks = await executeQuery<any[]>({ 
        query, 
        values: [...values, limit, offset] 
      });
      
      console.log(`Retrieved ${trucks.length} trucks after filtering (page ${page} of ${Math.ceil(totalItems / limit)})`);
      if (trucks.length > 0) {
        console.log('First truck sample:', trucks[0]);
      }
      
      // Return with pagination metadata
      return NextResponse.json({
        success: true,
        trucks,
        pagination: {
          totalItems,
          page,
          limit,
          totalPages: Math.ceil(totalItems / limit)
        }
      });
    } catch (dbError) {
      console.error('Database error retrieving trucks:', dbError);
      return NextResponse.json({ 
        error: 'Failed to filter trucks due to database error', 
        details: dbError instanceof Error ? dbError.message : String(dbError) 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error filtering trucks:', error);
    return NextResponse.json({ 
      error: 'Failed to filter trucks',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { filters, page = 1, limit = 20 } = data;
    
    console.log('POST request received with filters:', JSON.stringify(filters, null, 2));
    console.log('Pagination params:', { page, limit });
    
    // Check if environment variable is set
    if (!process.env.TRUCK_TABLE_NAME) {
      console.error('TRUCK_TABLE_NAME environment variable is not set');
      return NextResponse.json({ success: false, error: 'Table name not configured' }, { status: 500 });
    }
    
    // Log the table information for debugging
    console.log('Using MySQL table:', process.env.TRUCK_TABLE_NAME);
    console.log('Using MySQL database:', process.env.MYSQL_DATABASE);
    
    try {
      // Use the dedicated function for querying trucks with filters
      const result = await queryTrucksWithFilters(filters, page, limit);
      
      console.log(`Retrieved ${result.trucks.length} trucks after filtering (page ${page} of ${result.pagination.totalPages})`);
      
      // Make sure to format the response correctly
      return NextResponse.json({
        success: true,
        trucks: result.trucks,
        pagination: {
          totalItems: result.pagination.total,
          page: result.pagination.page,
          limit: result.pagination.limit,
          totalPages: result.pagination.totalPages
        }
      });
    } catch (dbError) {
      console.error('Database error retrieving trucks:', dbError);
      return NextResponse.json({ 
        error: 'Failed to filter trucks due to database error', 
        details: dbError instanceof Error ? dbError.message : String(dbError) 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error filtering trucks:', error);
    return NextResponse.json({ 
      error: 'Failed to filter trucks',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 