import { executeQuery } from "@/lib/db";

interface FilterOptions {
  makes: Array<{ value: string; label: string }>;
  states: Array<{ value: string; label: string }>;
  models: Record<string, Array<{ value: string; label: string }>>;
  transmissions: Array<{ value: string; label: string }>;
  transmissionManufacturers: Array<{ value: string; label: string }>;
  engineManufacturers: Array<{ value: string; label: string }>;
  engineModels: Record<string, Array<{ value: string; label: string }>>;
  cabTypes: Array<{ value: string; label: string }>;
  truckTypes: Array<{ value: string; label: string }>;
  sleeperTypes: Array<{ value: string; label: string }>;
  sources: Array<{ value: string; label: string }>;
  minYear?: number;
  maxYear?: number;
  minPrice?: number;
  maxPrice?: number;
  minMileage?: number;
  maxMileage?: number;
  success?: boolean;
}

let optionsCache: FilterOptions | null = null;
let lastCacheUpdate: number = 0;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export async function getFilterOptions(): Promise<FilterOptions> {
  const now = Date.now();
  
  // Return cached options if available and not expired
  if (optionsCache && (now - lastCacheUpdate < CACHE_TTL)) {
    console.log('Returning cached filter options');
    return optionsCache;
  }
  
  console.log('Fetching fresh filter options from database');
  
  // Fetch all distinct filter option values from the database
  try {
    const tableName = process.env.TRUCK_TABLE_NAME;
    
    console.log('Fetching filter options from MySQL table:', tableName);
    
    // Using MySQL, we can optimize by querying distinct values for each column
    // Create separate queries for each distinct value we need
    
    // Get all manufacturers (makes)
    const makesQuery = `SELECT DISTINCT manufacturer FROM ${tableName} WHERE manufacturer IS NOT NULL AND manufacturer != '0'`;
    const makesResult = await executeQuery<Array<{manufacturer: string}>>({ query: makesQuery });
    const makes = new Set<string>(makesResult.map(row => row.manufacturer));
    
    // Get all states
    const statesQuery = `SELECT DISTINCT state FROM ${tableName} WHERE state IS NOT NULL`;
    const statesResult = await executeQuery<Array<{state: string}>>({ query: statesQuery });
    const states = new Set<string>(statesResult.map(row => row.state));
    
    // Get all models with their makes
    const modelsQuery = `SELECT DISTINCT manufacturer, model FROM ${tableName} WHERE manufacturer IS NOT NULL AND model IS NOT NULL`;
    const modelsResult = await executeQuery<Array<{manufacturer: string, model: string}>>({ query: modelsQuery });
    
    const modelsByMake: Record<string, Set<string>> = {};
    modelsResult.forEach(row => {
      if (!modelsByMake[row.manufacturer]) {
        modelsByMake[row.manufacturer] = new Set<string>();
      }
      modelsByMake[row.manufacturer].add(row.model);
    });
    
    // Get min/max year
    const yearQuery = `
      SELECT 
        MIN(year) as minYear,
        MAX(year) as maxYear
      FROM ${tableName}
      WHERE year IS NOT NULL AND year > 0
    `;
    const yearResult = await executeQuery<Array<{minYear: number, maxYear: number}>>({ query: yearQuery });
    const minYear = yearResult[0]?.minYear;
    const maxYear = yearResult[0]?.maxYear;
    
    // Get min/max price
    const priceQuery = `
      SELECT 
        MIN(price_clean) as minPrice,
        MAX(price_clean) as maxPrice
      FROM ${tableName}
      WHERE price_clean IS NOT NULL AND price_clean > 0
    `;
    const priceResult = await executeQuery<Array<{minPrice: number, maxPrice: number}>>({ query: priceQuery });
    const minPrice = priceResult[0]?.minPrice;
    const maxPrice = priceResult[0]?.maxPrice;
    
    // Get min/max mileage
    const mileageQuery = `
      SELECT 
        MIN(mileage_clean) as minMileage,
        MAX(mileage_clean) as maxMileage
      FROM ${tableName}
      WHERE mileage_clean IS NOT NULL AND mileage_clean > 0
    `;
    const mileageResult = await executeQuery<Array<{minMileage: number, maxMileage: number}>>({ query: mileageQuery });
    const minMileage = mileageResult[0]?.minMileage;
    const maxMileage = mileageResult[0]?.maxMileage;
    
    // Get all transmissions
    const transmissionsQuery = `SELECT DISTINCT transmission FROM ${tableName} WHERE transmission IS NOT NULL`;
    const transmissionsResult = await executeQuery<Array<{transmission: string}>>({ query: transmissionsQuery });
    const transmissions = new Set<string>(transmissionsResult.map(row => row.transmission));
    
    // Get all transmission manufacturers
    const transmissionMfrQuery = `SELECT DISTINCT transmission_manufacturer FROM ${tableName} WHERE transmission_manufacturer IS NOT NULL`;
    const transmissionMfrResult = await executeQuery<Array<{transmission_manufacturer: string}>>({ query: transmissionMfrQuery });
    const transmissionManufacturers = new Set<string>(transmissionMfrResult.map(row => row.transmission_manufacturer));
    
    // Get all engine manufacturers
    const engineMfrQuery = `SELECT DISTINCT engine_manufacturer FROM ${tableName} WHERE engine_manufacturer IS NOT NULL`;
    const engineMfrResult = await executeQuery<Array<{engine_manufacturer: string}>>({ query: engineMfrQuery });
    const engineManufacturers = new Set<string>(engineMfrResult.map(row => row.engine_manufacturer));
    
    // Get all engine models with their manufacturers
    const engineModelsQuery = `
      SELECT DISTINCT engine_manufacturer, engine_model 
      FROM ${tableName} 
      WHERE engine_manufacturer IS NOT NULL AND engine_model IS NOT NULL
    `;
    const engineModelsResult = await executeQuery<Array<{engine_manufacturer: string, engine_model: string}>>({ query: engineModelsQuery });
    
    const engineModelsByMfr: Record<string, Set<string>> = {};
    engineModelsResult.forEach(row => {
      if (!engineModelsByMfr[row.engine_manufacturer]) {
        engineModelsByMfr[row.engine_manufacturer] = new Set<string>();
      }
      engineModelsByMfr[row.engine_manufacturer].add(row.engine_model);
    });
    
    // Get all cab types
    const cabQuery = `SELECT DISTINCT cab FROM ${tableName} WHERE cab IS NOT NULL`;
    const cabResult = await executeQuery<Array<{cab: string}>>({ query: cabQuery });
    const cabTypes = new Set<string>(cabResult.map(row => row.cab));
    
    // Get all truck types (sleeper vs day cab)
    const truckTypeQuery = `SELECT DISTINCT truck_type FROM ${tableName} WHERE truck_type IS NOT NULL`;
    const truckTypeResult = await executeQuery<Array<{truck_type: string}>>({ query: truckTypeQuery });
    const truckTypes = new Set<string>(truckTypeResult.map(row => row.truck_type));
    
    // Get all sleeper types
    const sleeperTypeQuery = `SELECT DISTINCT sleeper_type FROM ${tableName} WHERE sleeper_type IS NOT NULL`;
    const sleeperTypeResult = await executeQuery<Array<{sleeper_type: string}>>({ query: sleeperTypeQuery });
    const sleeperTypes = new Set<string>(sleeperTypeResult.map(row => row.sleeper_type));
    
    // Get all sources
    const sourcesQuery = `SELECT DISTINCT source FROM ${tableName} WHERE source IS NOT NULL AND source != ''`;
    const sourcesResult = await executeQuery<Array<{source: string}>>({ query: sourcesQuery });
    const sources = new Set<string>(sourcesResult.map(row => row.source));
    
    // Convert sets to arrays of objects with value and label properties
    const formattedMakes = Array.from(makes).map(make => ({
      value: make.toLowerCase(),
      label: make
    })).sort((a, b) => a.label.localeCompare(b.label));
    
    const formattedStates = Array.from(states).map(state => ({
      value: state,
      label: state
    })).sort((a, b) => a.label.localeCompare(b.label));
    
    // Convert modelsByMake to the required format
    const formattedModels: Record<string, Array<{ value: string; label: string }>> = {};
    
    Object.entries(modelsByMake).forEach(([make, modelsSet]) => {
      formattedModels[make] = Array.from(modelsSet).map(model => ({
        value: model.toLowerCase(),
        label: model
      })).sort((a, b) => a.label.localeCompare(b.label));
    });
    
    // Format the new option types
    const formattedTransmissions = Array.from(transmissions).map(transmission => ({
      value: transmission.toLowerCase(),
      label: transmission
    })).sort((a, b) => a.label.localeCompare(b.label));
    
    const formattedTransmissionManufacturers = Array.from(transmissionManufacturers).map(manufacturer => ({
      value: manufacturer.toLowerCase(),
      label: manufacturer
    })).sort((a, b) => a.label.localeCompare(b.label));
    
    const formattedEngineManufacturers = Array.from(engineManufacturers).map(manufacturer => ({
      value: manufacturer.toLowerCase(),
      label: manufacturer
    })).sort((a, b) => a.label.localeCompare(b.label));
    
    // Convert engineModelsByMfr to the required format
    const formattedEngineModels: Record<string, Array<{ value: string; label: string }>> = {};
    
    Object.entries(engineModelsByMfr).forEach(([mfr, modelsSet]) => {
      formattedEngineModels[mfr] = Array.from(modelsSet).map(model => ({
        value: model.toLowerCase(),
        label: model
      })).sort((a, b) => a.label.localeCompare(b.label));
    });
    
    const formattedCabTypes = Array.from(cabTypes).map(cab => ({
      value: cab.toLowerCase(),
      label: cab
    })).sort((a, b) => a.label.localeCompare(b.label));
    
    const formattedTruckTypes = Array.from(truckTypes).map(type => ({
      value: type.toLowerCase(),
      label: type
    })).sort((a, b) => a.label.localeCompare(b.label));
    
    const formattedSleeperTypes = Array.from(sleeperTypes).map(type => ({
      value: type.toLowerCase(),
      label: type
    })).sort((a, b) => a.label.localeCompare(b.label));
    
    const formattedSources = Array.from(sources).map(source => ({
      value: source.toLowerCase(),
      label: source
    })).sort((a, b) => a.label.localeCompare(b.label));
    
    // Update cache
    optionsCache = {
      makes: formattedMakes,
      states: formattedStates,
      models: formattedModels,
      transmissions: formattedTransmissions,
      transmissionManufacturers: formattedTransmissionManufacturers,
      engineManufacturers: formattedEngineManufacturers,
      engineModels: formattedEngineModels,
      cabTypes: formattedCabTypes,
      truckTypes: formattedTruckTypes,
      sleeperTypes: formattedSleeperTypes,
      sources: formattedSources,
      minYear,
      maxYear,
      minPrice,
      maxPrice,
      minMileage,
      maxMileage,
      success: true
    };
    
    console.log('Created filter options cache:', optionsCache);
    
    lastCacheUpdate = now;
    return optionsCache;
  } catch (error: unknown) {
    console.error("Failed to fetch filter options:", error);
    // Check if error is an Error object before accessing .message
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Error fetching filter options: ${errorMessage}`);
  }
}

// Function to manually refresh the cache
export function refreshOptionsCache(): void {
  optionsCache = null;
  lastCacheUpdate = 0;
} 