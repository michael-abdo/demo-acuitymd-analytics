import { executeQuery } from "@/lib/db";

// Define the truck type
interface Truck {
  id: string;
  manufacturer: string;
  model: string;
  year: number;
  mileage: number;
  horsepower?: number;
  transmission?: string;
  transmission_manufacturer?: string;
  engine_manufacturer?: string;
  engine_model?: string;
  cab?: string;
  price?: number;
  truck_type?: string;
  sleeper_type?: string;
  [key: string]: any; // Allow for other properties
}

// Cache state
let trucksCache: Truck[] = [];
let lastFetchTime: number = 0;
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours (1 day)

// Function to get all trucks, using cache if available and not expired
export async function getAllTrucks(): Promise<Truck[]> {
  const now = Date.now();
  
  // If cache is empty or expired, refresh it
  if (trucksCache.length === 0 || now - lastFetchTime > CACHE_TTL) {
    console.log("Cache empty or expired. Refreshing from database...");
    try {
      // Query MySQL to get all truck records
      const tableName = process.env.TRUCK_TABLE_NAME;
      const query = `SELECT * FROM ${tableName}`;
      
      const trucks = await executeQuery<Truck[]>({ query });
      trucksCache = trucks;
      lastFetchTime = now;
      
      console.log(`Loaded ${trucksCache.length} trucks into cache`);
    } catch (error) {
      console.error("Error loading trucks into cache:", error);
      // If there's an error but we have cached data, keep using it
      if (trucksCache.length === 0) {
        throw error; // Only throw if we have no data at all
      }
    }
  } else {
    console.log(`Using cached trucks (${trucksCache.length} items)`);
  }
  
  return trucksCache;
}

// Get unique filter values from the cached trucks
export async function getFilterOptions() {
  const trucks = await getAllTrucks();
  
  // Extract unique values for each filter
  const makes = new Set<string>();
  const modelsMap: Record<string, Set<string>> = {};
  const transmissionTypes = new Set<string>();
  const transmissionManufacturers = new Set<string>();
  const engineManufacturers = new Set<string>();
  const engineModelsMap: Record<string, Set<string>> = {};
  const cabTypes = new Set<string>();
  const truckTypes = new Set<string>();
  const sleeperTypes = new Set<string>();
  
  // Process each truck to extract unique values
  trucks.forEach(truck => {
    // Extract manufacturer (make)
    if (truck.manufacturer) {
      makes.add(truck.manufacturer.toLowerCase());
    }
    
    // Extract model and associate with manufacturer
    if (truck.manufacturer && truck.model) {
      const makeKey = truck.manufacturer.toLowerCase();
      if (!modelsMap[makeKey]) {
        modelsMap[makeKey] = new Set<string>();
      }
      modelsMap[makeKey].add(truck.model.toLowerCase());
    }
    
    // Extract transmission type
    if (truck.transmission) {
      transmissionTypes.add(truck.transmission.toLowerCase());
    }
    
    // Extract transmission manufacturer
    if (truck.transmission_manufacturer) {
      transmissionManufacturers.add(truck.transmission_manufacturer.toLowerCase());
    }
    
    // Extract engine manufacturer
    if (truck.engine_manufacturer) {
      engineManufacturers.add(truck.engine_manufacturer.toLowerCase());
    }
    
    // Extract engine model and associate with manufacturer
    if (truck.engine_manufacturer && truck.engine_model) {
      const engineMfrKey = truck.engine_manufacturer.toLowerCase();
      if (!engineModelsMap[engineMfrKey]) {
        engineModelsMap[engineMfrKey] = new Set<string>();
      }
      engineModelsMap[engineMfrKey].add(truck.engine_model.toLowerCase());
    }
    
    // Extract cab type
    if (truck.cab) {
      cabTypes.add(truck.cab.toLowerCase());
    }
    
    // Extract truck type (sleeper vs day cab)
    if (truck.truck_type) {
      truckTypes.add(truck.truck_type.toLowerCase());
    }
    
    // Extract sleeper type
    if (truck.sleeper_type) {
      sleeperTypes.add(truck.sleeper_type.toLowerCase());
    }
  });
  
  // Convert the sets to arrays with proper format for UI components
  const makesArray = Array.from(makes).map(make => ({
    value: make,
    label: make.charAt(0).toUpperCase() + make.slice(1)
  }));
  
  // Convert models map to the format expected by the UI
  const modelsObject: Record<string, Array<{ value: string; label: string }>> = {};
  Object.keys(modelsMap).forEach(make => {
    modelsObject[make] = Array.from(modelsMap[make]).map(model => ({
      value: model,
      label: model.charAt(0).toUpperCase() + model.slice(1)
    }));
  });
  
  // Convert remaining sets to arrays with proper format
  const transmissionTypesArray = Array.from(transmissionTypes).map(type => ({
    value: type,
    label: type.charAt(0).toUpperCase() + type.slice(1)
  }));
  
  const transmissionManufacturersArray = Array.from(transmissionManufacturers).map(mfr => ({
    value: mfr,
    label: mfr.charAt(0).toUpperCase() + mfr.slice(1)
  }));
  
  const engineManufacturersArray = Array.from(engineManufacturers).map(mfr => ({
    value: mfr,
    label: mfr.charAt(0).toUpperCase() + mfr.slice(1)
  }));
  
  // Convert engine models map to the format expected by the UI
  const engineModelsObject: Record<string, Array<{ value: string; label: string }>> = {};
  Object.keys(engineModelsMap).forEach(mfr => {
    engineModelsObject[mfr] = Array.from(engineModelsMap[mfr]).map(model => ({
      value: model,
      label: model.charAt(0).toUpperCase() + model.slice(1)
    }));
  });
  
  const cabTypesArray = Array.from(cabTypes).map(cab => ({
    value: cab,
    label: cab.charAt(0).toUpperCase() + cab.slice(1)
  }));
  
  const truckTypesArray = Array.from(truckTypes).map(type => ({
    value: type,
    label: type.charAt(0).toUpperCase() + type.slice(1)
  }));
  
  const sleeperTypesArray = Array.from(sleeperTypes).map(type => ({
    value: type,
    label: type.charAt(0).toUpperCase() + type.slice(1)
  }));
  
  return {
    makes: makesArray,
    models: modelsObject,
    transmissionTypes: transmissionTypesArray,
    transmissionManufacturers: transmissionManufacturersArray,
    engineManufacturers: engineManufacturersArray,
    engineModels: engineModelsObject,
    cabTypes: cabTypesArray,
    truckTypes: truckTypesArray,
    sleeperTypes: sleeperTypesArray
  };
}

// Filter trucks based on search criteria
export async function filterTrucks(filters: any) {
  const trucks = await getAllTrucks();
  
  // If no filters, return all trucks
  if (!filters || Object.keys(filters).length === 0) {
    return trucks;
  }
  
  return trucks.filter(truck => {
    // Check make filter
    if (filters.makes && Array.isArray(filters.makes) && filters.makes.length > 0) {
      const truckMake = truck.manufacturer?.toLowerCase();
      if (!truckMake || !filters.makes.some((make: string) => truckMake.includes(make.toLowerCase()))) {
        return false;
      }
    }
    
    // Check model filter
    if (filters.models && Array.isArray(filters.models) && filters.models.length > 0) {
      const truckModel = truck.model?.toLowerCase();
      if (!truckModel || !filters.models.some((model: string) => truckModel.includes(model.toLowerCase()))) {
        return false;
      }
    }
    
    // Check year filter
    if (filters.year && typeof filters.year.value === 'number' && typeof filters.year.delta === 'number') {
      const minYear = filters.year.value - filters.year.delta;
      const maxYear = filters.year.value + filters.year.delta;
      
      if (!truck.year || truck.year < minYear || truck.year > maxYear) {
        return false;
      }
    }
    
    // Check miles filter
    if (filters.miles && typeof filters.miles.value === 'number' && typeof filters.miles.delta === 'number') {
      const minMiles = filters.miles.value - filters.miles.delta;
      const maxMiles = filters.miles.value + filters.miles.delta;
      
      if (!truck.mileage || truck.mileage < minMiles || truck.mileage > maxMiles) {
        return false;
      }
    }
    
    // Check horsepower filter
    if (filters.horsepower && typeof filters.horsepower.value === 'number' && typeof filters.horsepower.delta === 'number') {
      const minHP = filters.horsepower.value - filters.horsepower.delta;
      const maxHP = filters.horsepower.value + filters.horsepower.delta;
      
      if (!truck.horsepower || truck.horsepower < minHP || truck.horsepower > maxHP) {
        return false;
      }
    }
    
    // Check transmission filter
    if (filters.transmission && Array.isArray(filters.transmission) && filters.transmission.length > 0) {
      const truckTransmission = truck.transmission?.toLowerCase();
      if (!truckTransmission || !filters.transmission.some((trans: string) => 
        truckTransmission.includes(trans.toLowerCase()))) {
        return false;
      }
    }
    
    // Check transmission manufacturer filter
    if (filters.transmissionManufacturer && Array.isArray(filters.transmissionManufacturer) && filters.transmissionManufacturer.length > 0) {
      const truckTransMfr = truck.transmission_manufacturer?.toLowerCase();
      if (!truckTransMfr || !filters.transmissionManufacturer.some((mfr: string) => 
        truckTransMfr.includes(mfr.toLowerCase()))) {
        return false;
      }
    }
    
    // Check engine manufacturer filter
    if (filters.engineManufacturer && Array.isArray(filters.engineManufacturer) && filters.engineManufacturer.length > 0) {
      const truckEngineMfr = truck.engine_manufacturer?.toLowerCase();
      if (!truckEngineMfr || !filters.engineManufacturer.some((mfr: string) => 
        truckEngineMfr.includes(mfr.toLowerCase()))) {
        return false;
      }
    }
    
    // Check engine model filter
    if (filters.engineModel && Array.isArray(filters.engineModel) && filters.engineModel.length > 0) {
      const truckEngineModel = truck.engine_model?.toLowerCase();
      if (!truckEngineModel || !filters.engineModel.some((model: string) => 
        truckEngineModel.includes(model.toLowerCase()))) {
        return false;
      }
    }
    
    // Check cab type filter
    if (filters.cab && Array.isArray(filters.cab) && filters.cab.length > 0) {
      const truckCab = truck.cab?.toLowerCase();
      if (!truckCab || !filters.cab.some((cab: string) => 
        truckCab.includes(cab.toLowerCase()))) {
        return false;
      }
    }
    
    // Check truck type filter (sleeper vs day cab)
    if (filters.truckType && Array.isArray(filters.truckType) && filters.truckType.length > 0) {
      const truckType = truck.truck_type?.toLowerCase();
      if (!truckType || !filters.truckType.some((type: string) => 
        truckType.includes(type.toLowerCase()))) {
        return false;
      }
    }
    
    // Check sleeper type filter
    if (filters.sleeperType && Array.isArray(filters.sleeperType) && filters.sleeperType.length > 0) {
      const sleeperType = truck.sleeper_type?.toLowerCase();
      if (!sleeperType || !filters.sleeperType.some((type: string) => 
        sleeperType.includes(type.toLowerCase()))) {
        return false;
      }
    }
    
    // All filters passed, include this truck
    return true;
  });
}

// Force a refresh of the cache
export function refreshCache() {
  trucksCache = [];
  lastFetchTime = 0;
  console.log("Truck cache cleared. Will be refreshed on next request.");
} 