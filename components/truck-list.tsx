"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronRight } from "lucide-react"
import { useState, useEffect } from "react"

// Truck type definition
interface Truck {
  id: number | string;
  make: string;
  model: string;
  year: number;
  miles: number;
  price: number;
  location: string;
  condition: string;
  daysListed: number;
  truckPaperUrl: string;
  horsepower?: string;
  transmission?: string;
  transmissionManufacturer?: string;
  engineManufacturer?: string;
  engineModel?: string;
  cab?: string;
  // Add these properties to fix type errors
  manufacturer?: string;
  mileage?: number;
  retail_price?: number;
  truck_location?: string;
  url?: string;
  engine_model?: string;
  isValidUrl?: boolean;
  mileage_clean?: number;
  year_clean?: number;
  truck_type?: string;
}

// Filter type definition
interface TruckFilters {
  makes?: string[];
  models?: string[];
  year?: { value: number; delta: number };
  miles?: { value: number; delta: number };
  horsepower?: { value: number; delta: number };
  transmission?: string[];
  transmissionManufacturer?: string[];
  engineManufacturer?: string[];
  engineModel?: string[];
  cab?: string[];
  states?: string[];
}

// Updated mock data for semi truck makes and models
const truckMakeModels: Record<string, Array<{ value: string; label: string }>> = {
  freightliner: [
    { value: "cascadia", label: "Cascadia" },
    { value: "coronado", label: "Coronado" },
    { value: "columbia", label: "Columbia" },
    { value: "m2-106", label: "M2 106" },
    { value: "m2-112", label: "M2 112" },
  ],
  peterbilt: [
    { value: "389", label: "389" },
    { value: "379", label: "379" },
    { value: "579", label: "579" },
    { value: "567", label: "567" },
    { value: "387", label: "387" },
  ],
  kenworth: [
    { value: "t680", label: "T680" },
    { value: "t800", label: "T800" },
    { value: "w900", label: "W900" },
    { value: "t660", label: "T660" },
    { value: "t700", label: "T700" },
  ],
  volvo: [
    { value: "vnl-300", label: "VNL 300" },
    { value: "vnl-670", label: "VNL 670" },
    { value: "vnl-780", label: "VNL 780" },
    { value: "vnl-860", label: "VNL 860" },
    { value: "vnr", label: "VNR" },
  ],
  international: [
    { value: "prostar", label: "ProStar" },
    { value: "lonestar", label: "LoneStar" },
    { value: "lt", label: "LT Series" },
    { value: "hx", label: "HX Series" },
    { value: "rv", label: "RV Series" },
  ],
  mack: [
    { value: "anthem", label: "Anthem" },
    { value: "pinnacle", label: "Pinnacle" },
    { value: "granite", label: "Granite" },
    { value: "ch", label: "CH" },
    { value: "cl", label: "CL" },
  ],
  "western-star": [
    { value: "4900", label: "4900" },
    { value: "5700", label: "5700" },
    { value: "4800", label: "4800" },
    { value: "4700", label: "4700" },
    { value: "6900", label: "6900" },
  ],
}

// Updated locations for variety - typical semi truck sales locations
const locations = [
  "Dallas, TX",
  "Chicago, IL",
  "Atlanta, GA",
  "Los Angeles, CA",
  "Oklahoma City, OK",
  "Columbus, OH",
  "Memphis, TN",
  "Salt Lake City, UT",
  "Kansas City, MO",
  "Little Rock, AR",
]

// Function to generate a random truck based on filters
const generateRandomTruck = (id: number, filters: TruckFilters): Truck => {
  // Default values if no filters are applied - updated for semi trucks
  let makes = Object.keys(truckMakeModels)
  let models = []
  let yearMin = 2015
  let yearMax = 2022
  let milesMin = 200000
  let milesMax = 700000

  // Apply make filter if specified
  if (filters.makes && filters.makes.length > 0) {
    makes = filters.makes
  }

  // Select a random make from the filtered list
  const make = makes[Math.floor(Math.random() * makes.length)]

  // Get available models for the selected make
  const availableModels = truckMakeModels[make] || []

  // Apply model filter if specified
  if (filters.models && filters.models.length > 0) {
    // Find models that match both the selected make and the filter
    const makeModels = availableModels.map((m) => m.value)
    const filteredModels = filters.models.filter((m) => makeModels.includes(m))

    // If there are matching models, use them; otherwise use all models for the make
    if (filteredModels.length > 0) {
      models = filteredModels
    } else {
      models = makeModels
    }
  } else {
    // No model filter, use all models for the selected make
    models = availableModels.map((m) => m.value)
  }

  // If no models are available (shouldn't happen), use a default
  if (models.length === 0) {
    models = ["default"]
  }

  // Select a random model from the filtered list
  const modelValue = models[Math.floor(Math.random() * models.length)]
  const modelObj = availableModels.find((m) => m.value === modelValue) || { value: modelValue, label: modelValue }

  // Apply year filter if specified
  if (filters.year) {
    yearMin = filters.year.value - filters.year.delta
    yearMax = filters.year.value + filters.year.delta
  }

  // Apply miles filter if specified
  if (filters.miles) {
    milesMin = filters.miles.value - filters.miles.delta
    milesMax = filters.miles.value + filters.miles.delta
  }

  // Generate random values within the filtered ranges
  const year = Math.floor(yearMin + Math.random() * (yearMax - yearMin + 1))
  const miles = Math.floor(milesMin + Math.random() * (milesMax - milesMin + 1))

  // Calculate a realistic price based on year and miles for semi trucks
  // Semi trucks have much higher base prices than pickup trucks
  const basePrice = 85000 + (year - 2015) * 8000 - (miles / 100000) * 10000 + Math.random() * 15000
  const price = Math.max(35000, Math.round(basePrice / 1000) * 1000) // Round to nearest $1000

  const location = locations[Math.floor(Math.random() * locations.length)]
  const daysListed = 1 + Math.floor(Math.random() * 45) // Semi trucks typically stay on market longer
  
  // Updated conditions for semi trucks
  const conditions = ["Excellent", "Good", "Average", "Fair"]
  const condition = conditions[Math.floor(Math.random() * conditions.length)]

  // Get the display label for the make - properly capitalize, including Western-Star
  let makeLabel
  if (make === "western-star") {
    makeLabel = "Western Star"
  } else {
    makeLabel = make.charAt(0).toUpperCase() + make.slice(1)
  }

  // Random URLs for different semi trucks on TruckPaper
  const truckPaperUrls = [
    "https://www.truckpaper.com/listing/for-sale/242838377/2022-kenworth-t680-sleeper-trucks",
    "https://www.truckpaper.com/listing/for-sale/242773426/2021-peterbilt-389-sleeper-trucks",
    "https://www.truckpaper.com/listing/for-sale/242896172/2020-freightliner-cascadia-126-sleeper-trucks",
    "https://www.truckpaper.com/listing/for-sale/242850138/2019-volvo-vnl64t-760-sleeper-trucks",
    "https://www.truckpaper.com/listing/for-sale/243035265/2018-mack-anthem-sleeper-trucks"
  ]

  return {
    id,
    make: makeLabel,
    model: modelObj.label,
    year,
    miles,
    price,
    location,
    condition,
    daysListed,
    truckPaperUrl: truckPaperUrls[Math.floor(Math.random() * truckPaperUrls.length)],
    horsepower: "",
    transmission: "",
    transmissionManufacturer: "",
    engineManufacturer: "",
    engineModel: "",
    cab: "",
    isValidUrl: true
  }
}

interface TruckListProps {
  refreshTrigger?: number;
  filters?: TruckFilters;
  trucks?: Truck[];
  disableExternalFetching?: boolean;
  currentPage?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  totalItems?: number;
  totalPages?: number;
  loading?: boolean;
}

// Add this skeleton component 
const TruckCardSkeleton = () => {
  return (
    <div className="border rounded-lg p-4 shadow-sm">
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2"></div>
            <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4"></div>
          </div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3"></div>
            <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

const TruckList: React.FC<TruckListProps> = ({
  trucks: propTrucks = [],
  filters = {},
  disableExternalFetching = false,
  currentPage = 1,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  totalItems: propTotalItems,
  totalPages: propTotalPages,
  loading: propLoading,
}) => {
  // State for tracking which truck cards are expanded
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  
  // If external fetching is disabled, use the provided trucks directly
  // Otherwise, we'll manage trucks internally
  const [trucks, setTrucks] = useState<Truck[]>(disableExternalFetching ? propTrucks : []);
  
  // Pagination state
  const [page, setPage] = useState(currentPage);
  const [itemsPerPage, setItemsPerPage] = useState(pageSize);
  
  // Loading state - initialize with propLoading if provided, otherwise false
  const [loading, setLoading] = useState(propLoading || false);
  
  // For when we need to manage pagination internally
  const [internalTotalItems, setInternalTotalItems] = useState(propTrucks.length);
  const [internalTotalPages, setInternalTotalPages] = useState(
    Math.max(1, Math.ceil(propTrucks.length / pageSize))
  );
  
  // Use provided total values or our internal calculations
  const totalItems = propTotalItems !== undefined ? propTotalItems : internalTotalItems;
  const totalPages = propTotalPages !== undefined ? propTotalPages : internalTotalPages;
  
  // Function to toggle card expansion
  const toggleCard = (truckId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(truckId)) {
        newSet.delete(truckId);
      } else {
        newSet.add(truckId);
      }
      return newSet;
    });
  };

  // Function to validate TruckPaper URLs 
  const validateTruckPaperUrls = async (trucksToValidate: Truck[]) => {
    const validatedTrucks = await Promise.all(
      trucksToValidate.map(async (truck) => {
        // Skip validation if we don't have a URL
        if (!truck.truckPaperUrl && !truck.url) {
          return { ...truck, isValidUrl: false };
        }

        const urlToCheck = truck.truckPaperUrl || truck.url || '';
        
        try {
          // Call our API endpoint to validate the URL
          const response = await fetch('/api/validate-url', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: urlToCheck }),
          });
          
          if (!response.ok) {
            console.error(`Failed to validate URL ${urlToCheck}: API returned ${response.status}`);
            return { ...truck, isValidUrl: true }; // Default to true if API call fails
          }
          
          const data = await response.json();
          return { ...truck, isValidUrl: data.isValid };
        } catch (error) {
          console.error(`Failed to validate URL ${urlToCheck}:`, error);
          return { ...truck, isValidUrl: true }; // Default to true if validation fails
        }
      })
    );
    
    return validatedTrucks;
  };
  
  // Update internal state when props change and validate URLs
  useEffect(() => {
    if (disableExternalFetching) {
      // Always sync trucks to propTrucks, even if empty
      setTrucks(propTrucks || []);
      setInternalTotalItems(propTrucks.length);
      setInternalTotalPages(Math.max(1, Math.ceil(propTrucks.length / itemsPerPage)));
    }
    // Always sync with the parent component's current page
    setPage(currentPage);
    setItemsPerPage(pageSize);
    // Update loading state from props
    if (propLoading !== undefined) {
      setLoading(propLoading);
    }
  }, [propTrucks, disableExternalFetching, currentPage, pageSize, itemsPerPage, propLoading]);
  
  // Generate similar trucks search URL
  const getSimilarTrucksUrl = (truck: Truck) => {
    // Get the truck parameters, handling different property names
    const make = truck.make || truck.manufacturer || '';
    const model = truck.model || '';
    const year = truck.year_clean || 0;
    const miles = truck.mileage_clean || 0;
    const truckType = truck.truck_type || '';
    console.log("Truck:", truck);
    
    // Calculate year range (+/- 1 year)
    const yearMin = year - 1;
    const yearMax = year + 1;
    
    // Calculate mileage range (+/- 50,000 miles)
    const milesMin = Math.max(0, miles - 50000);
    const milesMax = miles + 50000;
    
    // Format the URL with search parameters
    const searchParams = new URLSearchParams();
    
    // Determine category based on truck type
    // Category 16013 for Day Cab, 16045 for Sleeper Cab, default to 16045
    let category = '16045'; // Default to Sleeper Cab
    
    if (truckType) {
      const normalizedType = truckType.toLowerCase();
      if (normalizedType.includes('day cab')) {
        category = '16013';
      } else if (normalizedType.includes('sleeper')) {
        category = '16045';
      }
    }
    
    searchParams.append('Category', category);
    
    // Add manufacturer if available
    if (make) {
      searchParams.append('Manufacturer', make);
    }
    
    // Add model if available
    if (model) {
      searchParams.append('Model', model);
    }
    
    // Add year range if available
    if (year > 0) {
      searchParams.append('Year', `${yearMin}*${yearMax}`);
    }
    
    // Add mileage range if available
    if (miles > 0) {
      searchParams.append('Mileage', `${milesMin}*${milesMax}`);
    }
    
    // Build the complete URL
    return `https://www.truckpaper.com/listings/search?${searchParams.toString()}`;
  };
  
  // Handle page change
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    
    if (onPageChange) {
      // If we have an external handler, use it
      onPageChange(newPage);
    } else if (disableExternalFetching) {
      // For client-side pagination, update our view of the data
      // This would slice the propTrucks array based on the new page
      const startIndex = (newPage - 1) * itemsPerPage;
      const paginatedTrucks = propTrucks.slice(startIndex, startIndex + itemsPerPage);
      setTrucks(paginatedTrucks);
    }
  };
  
  // Handle page size change
  const handlePageSizeChange = (newSize: number) => {
    setItemsPerPage(newSize);
    
    if (onPageSizeChange) {
      // If we have an external handler, use it
      onPageSizeChange(newSize);
    } else if (disableExternalFetching) {
      // For client-side pagination, recalculate total pages and update our view
      const newTotalPages = Math.max(1, Math.ceil(propTrucks.length / newSize));
      setInternalTotalPages(newTotalPages);
      
      // Reset to page 1 and update truck list
      setPage(1);
      const paginatedTrucks = propTrucks.slice(0, newSize);
      setTrucks(paginatedTrucks);
    }
  };

  // When page or filters change, fetch new trucks (if external fetching is enabled)
  useEffect(() => {
    if (disableExternalFetching) {
      return; // Skip fetching if we're using externally provided data
    }
    
    // Here would be the code to fetch trucks from API
    // For this component, we'll assume that's handled by the parent

  }, [page, filters, disableExternalFetching]);
  
  // If loading, show skeleton
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <TruckCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  // If no trucks found, show message
  if (trucks.length === 0) {
    return (
      <div className="text-center py-10">
        <h3 className="text-lg font-medium text-gray-900">No trucks found</h3>
        <p className="mt-1 text-sm text-gray-500">Try adjusting your search filters</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Make/Model</TableHead>
              <TableHead>Year</TableHead>
              <TableHead>Miles</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trucks.map((truck) => (
              <TableRow key={truck.id} className="transition-colors duration-300">
                <TableCell className="font-medium">
                  <div>
                    {truck.make || truck.manufacturer} {truck.model}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {truck.condition}
                    </Badge>
                    {(truck.horsepower || truck.engine_model) && (
                      <Badge variant="outline" className="text-xs">
                        {truck.horsepower || truck.engine_model}
                      </Badge>
                    )}
                    {truck.cab && (
                      <Badge variant="outline" className="text-xs">
                        {truck.cab}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>{truck.year}</TableCell>
                <TableCell>{truck.miles || truck.mileage}</TableCell>
                <TableCell>{truck.price || truck.retail_price}</TableCell>
                <TableCell>{truck.location || truck.truck_location}</TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    asChild
                  >
                    <a 
                      href={truck.isValidUrl === false ? getSimilarTrucksUrl(truck) : (truck.truckPaperUrl || truck.url)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      {truck.isValidUrl === false ? "Show Similar Trucks" : "Details"}
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </a>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination controls */}
      {totalItems > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Show</span>
            <select 
              className="h-8 w-16 rounded-md border border-input bg-background px-2 text-sm"
              value={itemsPerPage}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              disabled={loading}
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="20">20</option>
            </select>
            <span className="text-sm text-muted-foreground">per page</span>
          </div>
          
          <div className="text-sm text-muted-foreground">
            Showing {Math.min((page - 1) * itemsPerPage + 1, totalItems)} to {Math.min(page * itemsPerPage, totalItems)} of {totalItems} entries
          </div>
          
          <div className="flex items-center space-x-2">
            {/* First page button */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handlePageChange(1)}
              disabled={page === 1 || loading}
              className="hidden sm:flex"
            >
              First
            </Button>

            {/* Previous button */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1 || loading}
            >
              Previous
            </Button>
            
            {/* Page numbers */}
            <div className="flex items-center space-x-1">
              {(() => {
                // Calculate which page numbers to show
                let startPage = 1;
                let endPage = totalPages;
                
                if (totalPages > 5) {
                  // Always show 5 pages
                  if (page <= 3) {
                    // Near the start
                    startPage = 1;
                    endPage = 5;
                  } else if (page >= totalPages - 2) {
                    // Near the end
                    startPage = totalPages - 4;
                    endPage = totalPages;
                  } else {
                    // In the middle
                    startPage = page - 2;
                    endPage = page + 2;
                  }
                }
                
                // Generate page buttons
                const pages = [];
                for (let i = startPage; i <= endPage; i++) {
                  pages.push(
                    <Button
                      key={i}
                      variant={page === i ? "default" : "outline"}
                      size="sm"
                      className="w-8 h-8 p-0"
                      onClick={() => handlePageChange(i)}
                      disabled={loading}
                    >
                      {i}
                    </Button>
                  );
                }
                
                // Add ellipsis for gaps
                if (startPage > 1) {
                  pages.unshift(
                    <span key="start-ellipsis" className="px-2">
                      ...
                    </span>
                  );
                }
                
                if (endPage < totalPages) {
                  pages.push(
                    <span key="end-ellipsis" className="px-2">
                      ...
                    </span>
                  );
                }
                
                return pages;
              })()}
            </div>
            
            {/* Next button */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages || loading}
            >
              Next
            </Button>

            {/* Last page button */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handlePageChange(totalPages)}
              disabled={page === totalPages || loading}
              className="hidden sm:flex"
            >
              Last
            </Button>

            {/* Page jump for large page counts */}
            {totalPages > 10 && (
              <div className="hidden sm:flex items-center space-x-2 ml-2">
                <span className="text-sm">Go to:</span>
                <input
                  type="number"
                  min="1"
                  max={totalPages}
                  value={page}
                  onChange={(e) => {
                    const page = parseInt(e.target.value);
                    if (page >= 1 && page <= totalPages) {
                      handlePageChange(page);
                    }
                  }}
                  className="w-16 h-8 rounded-md border border-input bg-background px-2 text-sm"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default TruckList

