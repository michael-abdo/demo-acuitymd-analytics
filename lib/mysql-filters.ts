import { executeQuery } from './db';

/**
 * Convert DynamoDB-style filter expressions to MySQL query parts
 */
export function buildSqlFilterFromParams({
  searchTerm = '',
  minYear = '',
  maxYear = '',
  minMileage = '',
  maxMileage = '',
  minPrice = '',
  maxPrice = '',
  makes = '',
  states = '',
  minHorsepower = '',
  maxHorsepower = '',
  transmission = '',
  transmissionManufacturer = '',
  engineManufacturer = '',
  engineModel = '',
  cabType = '',
  truckType = '',
  sleeperType = '',
  source = ''
}: {
  searchTerm?: string,
  minYear?: string,
  maxYear?: string,
  minMileage?: string,
  maxMileage?: string,
  minPrice?: string,
  maxPrice?: string,
  makes?: string,
  states?: string,
  minHorsepower?: string,
  maxHorsepower?: string,
  transmission?: string,
  transmissionManufacturer?: string,
  engineManufacturer?: string,
  engineModel?: string,
  cabType?: string,
  truckType?: string,
  sleeperType?: string,
  source?: string
}) {
  const whereConditions: string[] = [];
  const values: any[] = [];
  
  // Always exclude manufacturer = "0"
  whereConditions.push("(manufacturer != '0' AND manufacturer IS NOT NULL)");
  
  // Parse the arrays
  const selectedMakes = makes ? JSON.parse(makes) : [];
  const selectedStates = states ? JSON.parse(states) : [];
  const selectedTransmissions = transmission ? JSON.parse(transmission) : [];
  const selectedTransMfrs = transmissionManufacturer ? JSON.parse(transmissionManufacturer) : [];
  const selectedEngineMfrs = engineManufacturer ? JSON.parse(engineManufacturer) : [];
  const selectedEngineModels = engineModel ? JSON.parse(engineModel) : [];
  const selectedCabTypes = cabType ? JSON.parse(cabType) : [];
  const selectedTruckTypes = truckType ? JSON.parse(truckType) : [];
  const selectedSleeperTypes = sleeperType ? JSON.parse(sleeperType) : [];
  const selectedSources = source ? JSON.parse(source) : [];
  
  // Search term filter (search in manufacturer, model, and description)
  if (searchTerm) {
    whereConditions.push("(manufacturer LIKE ? OR model LIKE ? OR description LIKE ?)");
    values.push(`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`);
  }
  
  // Year range filter
  if (minYear) {
    whereConditions.push("year_clean >= ?");
    values.push(Number(minYear));
  }
  
  if (maxYear) {
    whereConditions.push("year_clean <= ?");
    values.push(Number(maxYear));
  }
  
  // Mileage range filter
  if (minMileage) {
    whereConditions.push("mileage_clean >= ?");
    values.push(Number(minMileage));
  }
  
  if (maxMileage) {
    whereConditions.push("mileage_clean <= ?");
    values.push(Number(maxMileage));
  }
  
  // Price range filter
  if (minPrice) {
    whereConditions.push("price_clean >= ?");
    values.push(Number(minPrice));
  }
  
  if (maxPrice) {
    whereConditions.push("price_clean <= ?");
    values.push(Number(maxPrice));
  }
  
  // Horsepower range filter
  if (minHorsepower) {
    whereConditions.push("horsepower >= ?");
    values.push(Number(minHorsepower));
  }
  
  if (maxHorsepower) {
    whereConditions.push("horsepower <= ?");
    values.push(Number(maxHorsepower));
  }
  
  // Makes filter
  if (selectedMakes.length > 0) {
    const placeholders = selectedMakes.map(() => '?').join(', ');
    whereConditions.push(`manufacturer IN (${placeholders})`);
    values.push(...selectedMakes);
  }
  
  // State filter
  if (selectedStates.length > 0) {
    const placeholders = selectedStates.map(() => '?').join(', ');
    whereConditions.push(`state IN (${placeholders})`);
    values.push(...selectedStates);
  }
  
  // Transmission type filter
  if (selectedTransmissions.length > 0) {
    const placeholders = selectedTransmissions.map(() => '?').join(', ');
    whereConditions.push(`transmission IN (${placeholders})`);
    values.push(...selectedTransmissions);
  }
  
  // Transmission manufacturer filter
  if (selectedTransMfrs.length > 0) {
    const placeholders = selectedTransMfrs.map(() => '?').join(', ');
    whereConditions.push(`transmission_manufacturer IN (${placeholders})`);
    values.push(...selectedTransMfrs);
  }
  
  // Engine manufacturer filter
  if (selectedEngineMfrs.length > 0) {
    const placeholders = selectedEngineMfrs.map(() => '?').join(', ');
    whereConditions.push(`engine_manufacturer IN (${placeholders})`);
    values.push(...selectedEngineMfrs);
  }
  
  // Engine model filter
  if (selectedEngineModels.length > 0) {
    const placeholders = selectedEngineModels.map(() => '?').join(', ');
    whereConditions.push(`engine_model IN (${placeholders})`);
    values.push(...selectedEngineModels);
  }
  
  // Cab type filter
  if (selectedCabTypes.length > 0) {
    const placeholders = selectedCabTypes.map(() => '?').join(', ');
    whereConditions.push(`cab IN (${placeholders})`);
    values.push(...selectedCabTypes);
  }
  
  // Truck type filter (sleeper vs day cab)
  if (selectedTruckTypes.length > 0) {
    const placeholders = selectedTruckTypes.map(() => '?').join(', ');
    whereConditions.push(`truck_type IN (${placeholders})`);
    values.push(...selectedTruckTypes);
  }
  
  // Sleeper type filter
  if (selectedSleeperTypes.length > 0) {
    const placeholders = selectedSleeperTypes.map(() => '?').join(', ');
    whereConditions.push(`sleeper_type IN (${placeholders})`);
    values.push(...selectedSleeperTypes);
  }
  
  // Source filter
  if (selectedSources.length > 0) {
    const placeholders = selectedSources.map(() => '?').join(', ');
    whereConditions.push(`source IN (${placeholders})`);
    values.push(...selectedSources);
  }
  
  return {
    whereClause: whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '',
    values
  };
}

/**
 * Convert the more complex trucks POST filter object to SQL parts
 */
export function buildSqlFilterFromJsonBody(filters: any) {
  const whereConditions: string[] = [];
  const values: any[] = [];
  
  // Always exclude manufacturer = "0"
  whereConditions.push("(manufacturer != '0' AND manufacturer IS NOT NULL)");
  
  // Makes filter
  if (filters.makes && filters.makes.length > 0) {
    const placeholders = filters.makes.map(() => '?').join(', ');
    whereConditions.push(`manufacturer IN (${placeholders})`);
    values.push(...filters.makes);
  }
  
  // States filter
  if (filters.states && filters.states.length > 0) {
    const placeholders = filters.states.map(() => '?').join(', ');
    whereConditions.push(`state IN (${placeholders})`);
    values.push(...filters.states);
  }
  
  // Models filter
  if (filters.models && filters.models.length > 0) {
    const placeholders = filters.models.map(() => '?').join(', ');
    whereConditions.push(`model IN (${placeholders})`);
    values.push(...filters.models);
  }
  
  // Year range filter (direct min/max)
  if (filters.yearRange) {
    if (filters.yearRange.min !== undefined) {
      whereConditions.push("year_clean >= ?");
      values.push(Number(filters.yearRange.min));
    }
    if (filters.yearRange.max !== undefined) {
      whereConditions.push("year_clean <= ?");
      values.push(Number(filters.yearRange.max));
    }
  }
  
  // Miles range filter (direct min/max)
  if (filters.milesRange) {
    if (filters.milesRange.min !== undefined) {
      whereConditions.push("mileage_clean >= ?");
      values.push(Number(filters.milesRange.min));
    }
    if (filters.milesRange.max !== undefined) {
      whereConditions.push("mileage_clean <= ?");
      values.push(Number(filters.milesRange.max));
    }
  }
  
  // Horsepower range filter (direct min/max)
  if (filters.horsepowerRange) {
    if (filters.horsepowerRange.min !== undefined) {
      whereConditions.push("horsepower >= ?");
      values.push(Number(filters.horsepowerRange.min));
    }
    if (filters.horsepowerRange.max !== undefined) {
      whereConditions.push("horsepower <= ?");
      values.push(Number(filters.horsepowerRange.max));
    }
  }
  
  // Price range filter
  if (filters.priceRange) {
    if (filters.priceRange.min !== undefined) {
      whereConditions.push("price_clean >= ?");
      values.push(Number(filters.priceRange.min));
    }
    if (filters.priceRange.max !== undefined) {
      whereConditions.push("price_clean <= ?");
      values.push(Number(filters.priceRange.max));
    }
  }
  
  // Search term filter (search in multiple fields)
  if (filters.searchTerm) {
    whereConditions.push("(manufacturer LIKE ? OR model LIKE ? OR description LIKE ?)");
    values.push(
      `%${filters.searchTerm}%`, 
      `%${filters.searchTerm}%`, 
      `%${filters.searchTerm}%`
    );
  }
  
  // Support for legacy year filter with delta (from VIN search)
  if (filters.year && typeof filters.year.value === 'number' && typeof filters.year.delta === 'number') {
    const minYear = filters.year.value - filters.year.delta;
    const maxYear = filters.year.value + filters.year.delta;
    whereConditions.push("year_clean BETWEEN ? AND ?");
    values.push(minYear, maxYear);
  }
  
  // Support for legacy miles/mileage filter with delta (from VIN search)
  if (filters.miles && typeof filters.miles.value === 'number' && typeof filters.miles.delta === 'number') {
    const minMiles = filters.miles.value - filters.miles.delta;
    const maxMiles = filters.miles.value + filters.miles.delta;
    whereConditions.push("mileage_clean BETWEEN ? AND ?");
    values.push(minMiles, maxMiles);
  }
  
  // Support for legacy horsepower filter with delta
  if (filters.horsepower && typeof filters.horsepower.value === 'number' && typeof filters.horsepower.delta === 'number') {
    const minHP = filters.horsepower.value - filters.horsepower.delta;
    const maxHP = filters.horsepower.value + filters.horsepower.delta;
    whereConditions.push("horsepower BETWEEN ? AND ?");
    values.push(minHP, maxHP);
  }
  
  // Transmission type filter
  if (filters.transmission && Array.isArray(filters.transmission) && filters.transmission.length > 0) {
    const placeholders = filters.transmission.map(() => '?').join(', ');
    whereConditions.push(`transmission IN (${placeholders})`);
    values.push(...filters.transmission);
  }
  
  // Transmission manufacturer filter
  if (filters.transmissionManufacturer && Array.isArray(filters.transmissionManufacturer) && filters.transmissionManufacturer.length > 0) {
    const placeholders = filters.transmissionManufacturer.map(() => '?').join(', ');
    whereConditions.push(`transmission_manufacturer IN (${placeholders})`);
    values.push(...filters.transmissionManufacturer);
  }
  
  // Engine manufacturer filter
  if (filters.engineManufacturer && Array.isArray(filters.engineManufacturer) && filters.engineManufacturer.length > 0) {
    const placeholders = filters.engineManufacturer.map(() => '?').join(', ');
    whereConditions.push(`engine_manufacturer IN (${placeholders})`);
    values.push(...filters.engineManufacturer);
  }
  
  // Engine model filter
  if (filters.engineModel && Array.isArray(filters.engineModel) && filters.engineModel.length > 0) {
    const placeholders = filters.engineModel.map(() => '?').join(', ');
    whereConditions.push(`engine_model IN (${placeholders})`);
    values.push(...filters.engineModel);
  }
  
  // Cab type filter
  if (filters.cab && Array.isArray(filters.cab) && filters.cab.length > 0) {
    const placeholders = filters.cab.map(() => '?').join(', ');
    whereConditions.push(`cab IN (${placeholders})`);
    values.push(...filters.cab);
  }
  
  // Truck type filter (sleeper vs day cab)
  if (filters.truckType && Array.isArray(filters.truckType) && filters.truckType.length > 0) {
    const placeholders = filters.truckType.map(() => '?').join(', ');
    whereConditions.push(`truck_type IN (${placeholders})`);
    values.push(...filters.truckType);
  }
  
  // Sleeper type filter
  if (filters.sleeperType && Array.isArray(filters.sleeperType) && filters.sleeperType.length > 0) {
    const placeholders = filters.sleeperType.map(() => '?').join(', ');
    whereConditions.push(`sleeper_type IN (${placeholders})`);
    values.push(...filters.sleeperType);
  }
  
  // Source filter
  if (filters.source && Array.isArray(filters.source) && filters.source.length > 0) {
    const placeholders = filters.source.map(() => '?').join(', ');
    whereConditions.push(`source IN (${placeholders})`);
    values.push(...filters.source);
  }
  
  return {
    whereClause: whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '',
    values
  };
}

/**
 * Execute a paginated trucks query with the given filters
 */
export async function queryTrucksWithFilters(filters: any, page = 1, limit = 20) {
  if (!process.env.TRUCK_TABLE_NAME) {
    throw new Error('TRUCK_TABLE_NAME environment variable is not set');
  }
  
  // Log table information for debugging
  console.log('In queryTrucksWithFilters - Using table:', process.env.TRUCK_TABLE_NAME);
  
  try {
    const tableName = process.env.TRUCK_TABLE_NAME;
    const { whereClause, values } = buildSqlFilterFromJsonBody(filters);
    
    // Calculate offset for pagination
    const offset = (page - 1) * limit;
    
    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) as total FROM ${tableName} ${whereClause}`;
    console.log("Count query:", countQuery);
    console.log("With values:", values);
    
    const countResult = await executeQuery<any[]>({ query: countQuery, values });
    const total = countResult[0]?.total || 0;
    
    // Get paginated results
    const query = `
      SELECT * FROM ${tableName} 
      ${whereClause} 
      LIMIT ? OFFSET ?
    `;
    
    console.log("Data query:", query);
    console.log("With values:", [...values, limit, offset]);
    
    const results = await executeQuery<any[]>({ 
      query, 
      values: [...values, limit, offset] 
    });
    
    return {
      trucks: results,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error("Error in queryTrucksWithFilters:", error);
    throw error;
  }
}

/**
 * Count trucks with the given filters
 */
export async function countTrucksWithFilters(filters: any) {
  if (!process.env.TRUCK_TABLE_NAME) {
    throw new Error('TRUCK_TABLE_NAME environment variable is not set');
  }
  
  // Log table information for debugging
  console.log('In countTrucksWithFilters - Using table:', process.env.TRUCK_TABLE_NAME);
  
  try {
    const tableName = process.env.TRUCK_TABLE_NAME;
    const { whereClause, values } = buildSqlFilterFromJsonBody(filters);
    
    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM ${tableName} ${whereClause}`;
    console.log("Count query:", countQuery);
    console.log("With values:", values);
    
    const countResult = await executeQuery<any[]>({ query: countQuery, values });
    
    return {
      count: countResult[0]?.total || 0
    };
  } catch (error) {
    console.error("Error in countTrucksWithFilters:", error);
    throw error;
  }
} 