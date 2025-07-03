import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { 
  DynamoDBDocumentClient, 
  GetCommand, 
  PutCommand, 
  QueryCommand, 
  ScanCommand, 
  UpdateCommand, 
  DeleteCommand 
} from "@aws-sdk/lib-dynamodb";

// Create the DynamoDB client for server-side operations only
// This file should only be imported in server components or API routes
const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ""
  }
});

// Create a document client for easier handling of JavaScript objects
const docClient = DynamoDBDocumentClient.from(client);

/**
 * Get a single item from DynamoDB by its primary key
 */
export async function getItem(tableName: string, key: Record<string, any>) {
  const command = new GetCommand({
    TableName: tableName,
    Key: key,
  });

  try {
    const response = await docClient.send(command);
    return response.Item;
  } catch (error) {
    console.error("Error getting item from DynamoDB:", error);
    throw error;
  }
}

/**
 * Query VIN information from DynamoDB using GSI
 */
export async function queryVinInformation(vin: string) {
  const tableName = process.env.TRUCK_TABLE_NAME;
  
  console.log(`Searching for VIN: ${vin} in table: ${tableName} using GSI: vin-index`);
  
  // Use QueryCommand instead of GetCommand for GSI
  const command = new QueryCommand({
    TableName: tableName,
    IndexName: "vin-index", // Specify the GSI name
    KeyConditionExpression: "vin = :vinValue",
    ExpressionAttributeValues: {
      ":vinValue": vin
    }
  });

  try {
    const response = await docClient.send(command);
    return response.Items && response.Items.length > 0 ? response.Items[0] : null;
  } catch (error) {
    console.error("Error searching VIN:", error);
    throw error;
  }
}

/**
 * Query similar trucks from DynamoDB based on filter criteria
 */
export async function querySimilarTrucks(filters: {
  makes?: string[],
  models?: string[],
  year?: { value: number, delta: number },
  miles?: { value: number, delta: number }
}) {
  const tableName = process.env.TRUCK_TABLE_NAME;
  
  // Build filter expression based on provided filters
  let filterExpressions = [];
  let expressionAttributeValues: Record<string, any> = {};
  let expressionAttributeNames: Record<string, string> = {};
  
  // Add manufacturer filter if specified (was previously make)
  if (filters.makes && filters.makes.length > 0) {
    const makeValues = filters.makes.map((make, index) => `:make${index}`);
    filterExpressions.push(`#make IN (${makeValues.join(', ')})`);
    filters.makes.forEach((make, index) => {
      expressionAttributeValues[`:make${index}`] = make;
    });
    expressionAttributeNames['#make'] = 'manufacturer'; // Changed from 'make' to 'manufacturer'
  }
  
  // Add model filter if specified
  if (filters.models && filters.models.length > 0) {
    const modelValues = filters.models.map((model, index) => `:model${index}`);
    filterExpressions.push(`#model IN (${modelValues.join(', ')})`);
    filters.models.forEach((model, index) => {
      expressionAttributeValues[`:model${index}`] = model;
    });
    expressionAttributeNames['#model'] = 'model';
  }
  
  // Add year filter if specified
  if (filters.year) {
    const minYear = filters.year.value - filters.year.delta;
    const maxYear = filters.year.value + filters.year.delta;
    filterExpressions.push('(#year BETWEEN :minYear AND :maxYear)');
    expressionAttributeValues[':minYear'] = minYear;
    expressionAttributeValues[':maxYear'] = maxYear;
    expressionAttributeNames['#year'] = 'year';
  }
  
  // Add mileage filter if specified (was previously miles)
  if (filters.miles) {
    const minMiles = filters.miles.value - filters.miles.delta;
    const maxMiles = filters.miles.value + filters.miles.delta;
    filterExpressions.push('(#miles BETWEEN :minMiles AND :maxMiles)');
    expressionAttributeValues[':minMiles'] = minMiles;
    expressionAttributeValues[':maxMiles'] = maxMiles;
    expressionAttributeNames['#miles'] = 'mileage'; // Changed from 'miles' to 'mileage'
  }
  
  // Combine filter expressions
  const filterExpression = filterExpressions.length > 0 
    ? filterExpressions.join(' AND ') 
    : undefined;
  
  // Create the scan command
  const command = new ScanCommand({
    TableName: tableName,
    FilterExpression: filterExpression,
    ExpressionAttributeValues: Object.keys(expressionAttributeValues).length > 0 ? expressionAttributeValues : undefined,
    ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
    Limit: 10 // Limit to 10 results for performance
  });

  try {
    const response = await docClient.send(command);
    return response.Items || [];
  } catch (error) {
    console.error("Error querying similar trucks:", error);
    throw error;
  }
}

/**
 * Put a new item into DynamoDB
 */
export async function putItem(tableName: string, item: Record<string, any>) {
  const command = new PutCommand({
    TableName: tableName,
    Item: item,
  });

  try {
    return await docClient.send(command);
  } catch (error) {
    console.error("Error putting item to DynamoDB:", error);
    throw error;
  }
}

/**
 * Query items from DynamoDB based on key condition expression
 */
export async function queryItems(
  tableName: string, 
  keyConditionExpression: string,
  expressionAttributeValues: Record<string, any>,
  indexName?: string
) {
  const command = new QueryCommand({
    TableName: tableName,
    KeyConditionExpression: keyConditionExpression,
    ExpressionAttributeValues: expressionAttributeValues,
    IndexName: indexName,
  });

  try {
    const response = await docClient.send(command);
    return response.Items;
  } catch (error) {
    console.error("Error querying items from DynamoDB:", error);
    throw error;
  }
}

/**
 * Scan all items from a DynamoDB table
 */
export async function scanItems(
  tableName: string,
  filterExpression?: string,
  expressionAttributeValues?: Record<string, any>
) {
  const command = new ScanCommand({
    TableName: tableName,
    FilterExpression: filterExpression,
    ExpressionAttributeValues: expressionAttributeValues,
  });

  try {
    const response = await docClient.send(command);
    return response.Items;
  } catch (error) {
    console.error("Error scanning items from DynamoDB:", error);
    throw error;
  }
}

/**
 * Update an item in DynamoDB
 */
export async function updateItem(
  tableName: string,
  key: Record<string, any>,
  updateExpression: string,
  expressionAttributeValues: Record<string, any>,
  expressionAttributeNames?: Record<string, string>
) {
  const command = new UpdateCommand({
    TableName: tableName,
    Key: key,
    UpdateExpression: updateExpression,
    ExpressionAttributeValues: expressionAttributeValues,
    ExpressionAttributeNames: expressionAttributeNames,
    ReturnValues: "ALL_NEW",
  });

  try {
    const response = await docClient.send(command);
    return response.Attributes;
  } catch (error) {
    console.error("Error updating item in DynamoDB:", error);
    throw error;
  }
}

/**
 * Delete an item from DynamoDB
 */
export async function deleteItem(tableName: string, key: Record<string, any>) {
  const command = new DeleteCommand({
    TableName: tableName,
    Key: key,
  });

  try {
    return await docClient.send(command);
  } catch (error) {
    console.error("Error deleting item from DynamoDB:", error);
    throw error;
  }
} 