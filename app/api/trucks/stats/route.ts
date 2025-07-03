import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { buildSqlFilterFromJsonBody } from '@/lib/mysql-filters';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { filters } = data;
    
    console.log('POST request received for truck statistics with filters:', JSON.stringify(filters, null, 2));
    
    // Check if environment variable is set
    if (!process.env.TRUCK_TABLE_NAME) {
      console.error('TRUCK_TABLE_NAME environment variable is not set');
      return NextResponse.json({ success: false, error: 'Table name not configured' }, { status: 500 });
    }
    
    // Log the table information for debugging
    console.log('Using MySQL table:', process.env.TRUCK_TABLE_NAME);
    console.log('Using MySQL database:', process.env.MYSQL_DATABASE);
    
    try {
      const tableName = process.env.TRUCK_TABLE_NAME;
      const { whereClause, values } = buildSqlFilterFromJsonBody(filters);
      
      // Get statistics using multiple queries
      const statsQueries = [
        // Count query
        executeQuery<any[]>({ query: `SELECT COUNT(*) as count FROM ${tableName} ${whereClause}`, values }),
        
        // Price stats
        executeQuery<any[]>({ query: `
          SELECT 
            MIN(price_clean) as min_price, 
            MAX(price_clean) as max_price, 
            AVG(price_clean) as avg_price 
          FROM ${tableName} 
          ${whereClause}
        `, values }),
        
        // Year stats
        executeQuery<any[]>({ query: `
          SELECT 
            MIN(year_clean) as min_year, 
            MAX(year_clean) as max_year, 
            AVG(year_clean) as avg_year 
          FROM ${tableName} 
          ${whereClause}
        `, values }),
        
        // Mileage stats
        executeQuery<any[]>({ query: `
          SELECT 
            MIN(mileage_clean) as min_mileage, 
            MAX(mileage_clean) as max_mileage, 
            AVG(mileage_clean) as avg_mileage 
          FROM ${tableName} 
          ${whereClause}
        `, values }),
        
        // Top manufacturers
        executeQuery<any[]>({ query: `
          SELECT manufacturer, COUNT(*) as count 
          FROM ${tableName} 
          ${whereClause} 
          AND manufacturer != '0' AND manufacturer IS NOT NULL
          GROUP BY manufacturer 
          ORDER BY count DESC 
          LIMIT 10
        `, values }),
        
        // Top models
        executeQuery<any[]>({ query: `
          SELECT model, COUNT(*) as count 
          FROM ${tableName} 
          ${whereClause} 
          GROUP BY model 
          ORDER BY count DESC 
          LIMIT 10
        `, values }),
      ];
      
      const statsResults = await Promise.all(statsQueries);
      
      // Format the result
      const result = {
        count: statsResults[0][0].count || 0,
        price: {
          min: statsResults[1][0].min_price || 0,
          max: statsResults[1][0].max_price || 0,
          avg: statsResults[1][0].avg_price || 0
        },
        year: {
          min: statsResults[2][0].min_year || 0,
          max: statsResults[2][0].max_year || 0,
          avg: statsResults[2][0].avg_year || 0
        },
        mileage: {
          min: statsResults[3][0].min_mileage || 0,
          max: statsResults[3][0].max_mileage || 0,
          avg: statsResults[3][0].avg_mileage || 0
        },
        topManufacturers: statsResults[4],
        topModels: statsResults[5]
      };
      
      return NextResponse.json(result);
    } catch (dbError) {
      console.error('Database error calculating truck statistics:', dbError);
      return NextResponse.json({ 
        error: 'Failed to calculate truck statistics', 
        details: dbError instanceof Error ? dbError.message : String(dbError) 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error processing truck statistics request:', error);
    return NextResponse.json({ 
      error: 'Failed to process truck statistics request',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 