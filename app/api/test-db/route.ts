import mysql from 'mysql2/promise'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Log current environment variables for debugging
    const envInfo = {
      MYSQL_HOST: process.env.MYSQL_HOST,
      MYSQL_PORT: process.env.MYSQL_PORT,
      MYSQL_USER: process.env.MYSQL_USER,
      MYSQL_DATABASE: process.env.MYSQL_DATABASE,
      NODE_ENV: process.env.NODE_ENV
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
      host: process.env.MYSQL_HOST,
      port: process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT) : 3306,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
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