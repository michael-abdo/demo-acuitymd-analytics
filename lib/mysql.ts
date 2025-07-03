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
 * Query items from MySQL with optional filters
 */
export async function queryItems(
  tableName: string, 
  filters?: Record<string, any>,
  limit?: number,
  offset?: number
) {
  let query = `SELECT * FROM ${tableName}`;
  const values: any[] = [];
  
  if (filters && Object.keys(filters).length > 0) {
    const conditions = Object.entries(filters)
      .map(([key, value]) => {
        values.push(value);
        return `${key} = ?`;
      })
      .join(' AND ');
    
    query += ` WHERE ${conditions}`;
  }
  
  if (limit) {
    query += ` LIMIT ${limit}`;
    if (offset) {
      query += ` OFFSET ${offset}`;
    }
  }
  
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
 * Insert an item into MySQL
 */
export async function putItem(tableName: string, item: Record<string, any>) {
  const fields = Object.keys(item);
  const values = Object.values(item);
  const placeholders = fields.map(() => '?').join(', ');
  
  const query = `INSERT INTO ${tableName} (${fields.join(', ')}) VALUES (${placeholders})`;
  
  try {
    const result = await executeQuery({ 
      query, 
      values 
    });
    
    return result;
  } catch (error) {
    console.error("Error inserting item into MySQL:", error);
    throw error;
  }
}

/**
 * Update an item in MySQL
 */
export async function updateItem(
  tableName: string, 
  key: Record<string, any>, 
  updates: Record<string, any>
) {
  const keyField = Object.keys(key)[0];
  const keyValue = key[keyField];
  
  const updateFields = Object.keys(updates);
  const updateValues = Object.values(updates);
  
  const setClause = updateFields.map(field => `${field} = ?`).join(', ');
  
  const query = `UPDATE ${tableName} SET ${setClause} WHERE ${keyField} = ?`;
  const values = [...updateValues, keyValue];
  
  try {
    const result = await executeQuery({ 
      query, 
      values 
    });
    
    return result;
  } catch (error) {
    console.error("Error updating item in MySQL:", error);
    throw error;
  }
}

/**
 * Delete an item from MySQL
 */
export async function deleteItem(tableName: string, key: Record<string, any>) {
  const keyField = Object.keys(key)[0];
  const keyValue = key[keyField];
  
  const query = `DELETE FROM ${tableName} WHERE ${keyField} = ?`;
  
  try {
    const result = await executeQuery({ 
      query, 
      values: [keyValue] 
    });
    
    return result;
  } catch (error) {
    console.error("Error deleting item from MySQL:", error);
    throw error;
  }
}