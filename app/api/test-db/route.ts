import mysql from 'mysql2/promise'
import { NextResponse } from 'next/server'
import { config } from '@/lib/config'

export async function GET() {
  // Only available in development
  if (!config.IS_DEVELOPMENT) {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  try {
    // Log current environment variables for debugging
    const envInfo = {
      MYSQL_HOST: config.MYSQL_HOST,
      MYSQL_PORT: config.MYSQL_PORT,
      MYSQL_USER: config.MYSQL_USER,
      MYSQL_DATABASE: config.MYSQL_DATABASE,
      NODE_ENV: config.NODE_ENV
    }
    
    // Direct connection test to bypass any connection pool issues
    const directTest = await testDirectConnection()
    
    return NextResponse.json({
      status: 'success',
      message: 'Database connection test completed',
      environment: envInfo,
      connection: directTest
    })
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Database connection test failed',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

async function testDirectConnection() {
  try {
    const connection = await mysql.createConnection({
      host: config.MYSQL_HOST,
      port: config.MYSQL_PORT,
      user: config.MYSQL_USER,
      password: config.MYSQL_PASSWORD,
      database: config.MYSQL_DATABASE,
      connectTimeout: 10000
    })
    
    const [result] = await connection.execute('SELECT 1 as test')
    await connection.end()
    
    return { success: true, message: 'Direct connection successful', result }
  } catch (error) {
    return { 
      success: false, 
      message: 'Direct connection failed',
      error: error instanceof Error ? error.message : String(error)
    }
  }
}