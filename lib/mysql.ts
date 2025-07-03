import { executeQuery, convertBinaryToBoolean } from './db';

/**
 * Get a single item from MySQL by its primary key
 */
export async function getItem(tableName: string, key: Record<string, any>) {
  // Extract the primary key field name and value
  const keyField = Object.keys(key)[0];
  const keyValue = key[keyField];
  
  const query = `SELECT * FROM ${tableName} WHERE ${keyField} = ? LIMIT 1`;
  
  try {
    const results = await executeQuery<any[]>({ 
      query, 
      values: [keyValue] 
    });
    
    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error("Error getting item from MySQL:", error);
    throw error;
  }
}

/**
 * Query VIN information from MySQL
 */
export async function queryVinInformation(vin: string) {
  const tableName = process.env.TRUCK_TABLE_NAME;
  
  console.log(`Searching for VIN: ${vin} in table: ${tableName}`);
  
  const query = `SELECT * FROM ${tableName} WHERE vin = ? LIMIT 1`;
  
  try {
    const results = await executeQuery<any[]>({ 
      query, 
      values: [vin] 
    });
    
    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error("Error searching VIN:", error);
    throw error;
  }
}

/**
 * Query similar trucks from MySQL based on filter criteria
 */
export async function querySimilarTrucks(filters: {
  makes?: string[],
  models?: string[],
  year?: { value: number, delta: number },
  miles?: { value: number, delta: number }
}) {
  const tableName = process.env.TRUCK_TABLE_NAME;
  
  // Build WHERE clauses based on provided filters
  const whereConditions: string[] = [];
  const values: any[] = [];
  
  // Add manufacturer filter if specified (was previously make)
  if (filters.makes && filters.makes.length > 0) {
    const placeholders = filters.makes.map(() => '?').join(', ');
    whereConditions.push(`manufacturer IN (${placeholders})`);
    values.push(...filters.makes);
  }
  
  // Add model filter if specified
  if (filters.models && filters.models.length > 0) {
    const placeholders = filters.models.map(() => '?').join(', ');
    whereConditions.push(`model IN (${placeholders})`);
    values.push(...filters.models);
  }
  
  // Add year filter if specified
  if (filters.year) {
    const minYear = filters.year.value - filters.year.delta;
    const maxYear = filters.year.value + filters.year.delta;
    whereConditions.push('year BETWEEN ? AND ?');
    values.push(minYear, maxYear);
  }
  
  // Add mileage filter if specified (was previously miles)
  if (filters.miles) {
    const minMiles = filters.miles.value - filters.miles.delta;
    const maxMiles = filters.miles.value + filters.miles.delta;
    whereConditions.push('mileage BETWEEN ? AND ?');
    values.push(minMiles, maxMiles);
  }
  
  // Combine WHERE clauses
  const whereClause = whereConditions.length > 0 
    ? `WHERE ${whereConditions.join(' AND ')}` 
    : '';
  
  // Create the query
  const query = `SELECT * FROM ${tableName} ${whereClause} LIMIT 10`;

  try {
    const results = await executeQuery<any[]>({ 
      query, 
      values 
    });
    
    return results;
  } catch (error) {
    console.error("Error querying similar trucks:", error);
    throw error;
  }
}

/**
 * Put a new item into MySQL (insert or update)
 */
export async function putItem(tableName: string, item: Record<string, any>) {
  // Extract keys and values
  const fields = Object.keys(item);
  const values = Object.values(item);
  
  // Create placeholders for values
  const placeholders = fields.map(() => '?').join(', ');
  
  // Create update pairs for duplicate key handling
  const updatePairs = fields.map(field => `${field} = VALUES(${field})`).join(', ');
  
  // Create the query using INSERT ... ON DUPLICATE KEY UPDATE
  const query = `
    INSERT INTO ${tableName} (${fields.join(', ')})
    VALUES (${placeholders})
    ON DUPLICATE KEY UPDATE ${updatePairs}
  `;

  try {
    return await executeQuery<any>({ query, values });
  } catch (error) {
    console.error("Error putting item to MySQL:", error);
    throw error;
  }
}

/**
 * Query items from MySQL based on conditions
 */
export async function queryItems(
  tableName: string, 
  keyConditionExpression: string,
  expressionAttributeValues: Record<string, any>,
  indexName?: string
) {
  // Parse the DynamoDB-style key condition to SQL WHERE clause
  // This is a simplified conversion that assumes format like "id = :id AND status = :status"
  let sqlWhereClause = keyConditionExpression;
  const values: any[] = [];
  
  // Replace DynamoDB-style placeholders with MySQL '?' placeholders
  Object.keys(expressionAttributeValues).forEach(placeholder => {
    sqlWhereClause = sqlWhereClause.replace(
      new RegExp(placeholder, 'g'), 
      '?'
    );
    values.push(expressionAttributeValues[placeholder]);
  });
  
  // Optional ORDER BY if the index was specified in DynamoDB
  const orderBy = indexName ? `ORDER BY ${indexName.replace('-index', '')}` : '';
  
  const query = `SELECT * FROM ${tableName} WHERE ${sqlWhereClause} ${orderBy}`;

  try {
    const results = await executeQuery<any[]>({ 
      query, 
      values 
    });
    
    return results;
  } catch (error) {
    console.error("Error querying items from MySQL:", error);
    throw error;
  }
}

/**
 * Scan all items from a MySQL table
 */
export async function scanItems(
  tableName: string,
  filterExpression?: string,
  expressionAttributeValues?: Record<string, any>
) {
  let whereClause = '';
  let values: any[] = [];
  
  if (filterExpression && expressionAttributeValues) {
    // Convert DynamoDB filter expression to SQL WHERE clause
    // Simple conversion assuming format like "attribute = :value"
    let sqlWhereClause = filterExpression;
    
    // Replace DynamoDB placeholders with MySQL '?' placeholders
    Object.keys(expressionAttributeValues).forEach(placeholder => {
      sqlWhereClause = sqlWhereClause.replace(
        new RegExp(placeholder, 'g'), 
        '?'
      );
      values.push(expressionAttributeValues[placeholder]);
    });
    
    whereClause = `WHERE ${sqlWhereClause}`;
  }
  
  const query = `SELECT * FROM ${tableName} ${whereClause}`;

  try {
    const results = await executeQuery<any[]>({ 
      query, 
      values 
    });
    
    return results;
  } catch (error) {
    console.error("Error scanning items from MySQL:", error);
    throw error;
  }
}

/**
 * Update an item in MySQL
 */
export async function updateItem(
  tableName: string,
  key: Record<string, any>,
  updateExpression: string,
  expressionAttributeValues: Record<string, any>,
  expressionAttributeNames?: Record<string, string>
) {
  // Extract key field name and value for the WHERE clause
  const keyField = Object.keys(key)[0];
  const keyValue = key[keyField];
  
  // Parse the DynamoDB update expression into SQL SET statements
  // We're simplifying and assuming the update expression is in the format "SET attribute1 = :value1, attribute2 = :value2"
  let setStatement = updateExpression.replace('SET ', '');
  const values: any[] = [];
  
  // Replace DynamoDB-style placeholders and attribute names with MySQL column names
  Object.keys(expressionAttributeValues).forEach(placeholder => {
    setStatement = setStatement.replace(
      new RegExp(placeholder, 'g'), 
      '?'
    );
    values.push(expressionAttributeValues[placeholder]);
  });
  
  // Replace attribute name placeholders if provided
  if (expressionAttributeNames) {
    Object.keys(expressionAttributeNames).forEach(namePlaceholder => {
      setStatement = setStatement.replace(
        new RegExp(namePlaceholder, 'g'), 
        expressionAttributeNames[namePlaceholder]
      );
    });
  }
  
  const query = `UPDATE ${tableName} SET ${setStatement} WHERE ${keyField} = ?`;
  values.push(keyValue);

  try {
    await executeQuery<any>({ query, values });
    
    // Return updated item by querying it again
    return getItem(tableName, key);
  } catch (error) {
    console.error("Error updating item in MySQL:", error);
    throw error;
  }
}

/**
 * Delete an item from MySQL
 */
export async function deleteItem(tableName: string, key: Record<string, any>) {
  // Extract key field name and value for the WHERE clause
  const keyField = Object.keys(key)[0];
  const keyValue = key[keyField];
  
  const query = `DELETE FROM ${tableName} WHERE ${keyField} = ?`;

  try {
    return await executeQuery<any>({ query, values: [keyValue] });
  } catch (error) {
    console.error("Error deleting item from MySQL:", error);
    throw error;
  }
} 