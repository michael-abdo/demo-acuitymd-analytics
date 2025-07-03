"use client"

import React, { useImperativeHandle, forwardRef, useState, useEffect } from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Check, ChevronsUpDown, Loader2, Minus, Plus, Search, Link2, ChevronUp, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import TruckList from "./truck-list"
import PriceChart from "./price-chart"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { queryVinInformation } from "@/lib/mysql"
import { states } from "../app/lib/states"
import TruckSummaryStats from "./truck-summary-stats"
import { MultiSelectPills } from "./ui/multi-select-pills"

// Add this interface to fix type errors in the filters object
interface ExtendedTruckFilters {
  makes: string[];
  models: string[];
  milesRange: { min: number; max: number };
  yearRange: { min: number; max: number };
  horsepowerRange: { min: number; max: number };
  transmission: string[];
  transmissionManufacturer: string[];
  engineManufacturer: string[];
  engineModel: string[];
  cab: string[];
  states: string[];
  truckType: string[];
  sleeperType: string[];
  source?: string[];
}

const TruckFinder = forwardRef(function TruckFinder({ onReset }: { onReset?: () => void }, ref) {
  // State for dropdown options from database
  const [truckMakes, setTruckMakes] = useState<Array<{ value: string; label: string }>>([])
  const [truckModels, setTruckModels] = useState<Record<string, Array<{ value: string; label: string }>>>({})
  const [transmissionTypes, setTransmissionTypes] = useState<Array<{ value: string; label: string }>>([])
  const [transmissionManufacturers, setTransmissionManufacturers] = useState<Array<{ value: string; label: string }>>([])
  const [engineManufacturers, setEngineManufacturers] = useState<Array<{ value: string; label: string }>>([])
  const [engineModels, setEngineModels] = useState<Record<string, Array<{ value: string; label: string }>>>({})
  const [cabTypes, setCabTypes] = useState<Array<{ value: string; label: string }>>([])
  const [truckTypes, setTruckTypes] = useState<Array<{ value: string; label: string }>>([])
  const [sleeperTypes, setSleeperTypes] = useState<Array<{ value: string; label: string }>>([])
  const [loading, setLoading] = useState(true)
  
  // Loading states for buttons
  const [searchLoading, setSearchLoading] = useState(false)
  const [vinSearchLoading, setVinSearchLoading] = useState(false)
  const [applyVinSpecsLoading, setApplyVinSpecsLoading] = useState(false)

  // Existing state variables
  const [selectedMakes, setSelectedMakes] = useState<string[]>([])
  const [selectedModels, setSelectedModels] = useState<string[]>([])
  const [makesOpen, setMakesOpen] = useState(false)
  const [modelsOpen, setModelsOpen] = useState(false)
  const [searchPerformed, setSearchPerformed] = useState(false)
  const [searchCount, setSearchCount] = useState(0)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [truckCount, setTruckCount] = useState(67)
  const [activeTab, setActiveTab] = useState("criteria")
  
  // New state for VIN search
  const [vin, setVin] = useState("")
  const [vinSearchPerformed, setVinSearchPerformed] = useState(false)
  const [vinMatchFound, setVinMatchFound] = useState(false)
  const [vinSpecs, setVinSpecs] = useState<any>(null)

  // Update filters state to use the proper type with ranges
  const [filters, setFilters] = useState<ExtendedTruckFilters>({
    makes: [],
    models: [],
    milesRange: { min: 200000, max: 400000 },
    yearRange: { min: 2015, max: 2021 },
    horsepowerRange: { min: 400, max: 500 },
    transmission: [],
    transmissionManufacturer: [],
    engineManufacturer: [],
    engineModel: [],
    cab: [],
    states: [],
    truckType: [],
    sleeperType: [],
    source: []
  })

  // Available models based on selected makes
  const availableModels = selectedMakes.flatMap((make) => {
    // Try to find the manufacturer in truckModels with case-insensitive matching
    const matchingKey = Object.keys(truckModels).find(
      key => key.toLowerCase() === make.toLowerCase()
    );
    return matchingKey ? truckModels[matchingKey] : [];
  });

  // Add new state variables for the new filters
  const [selectedTransmissions, setSelectedTransmissions] = useState<string[]>([])
  const [selectedTransMfrs, setSelectedTransMfrs] = useState<string[]>([])
  const [selectedEngineMfrs, setSelectedEngineMfrs] = useState<string[]>([])
  const [selectedEngineModels, setSelectedEngineModels] = useState<string[]>([])
  const [selectedCabTypes, setSelectedCabTypes] = useState<string[]>([])
  const [transmissionsOpen, setTransmissionsOpen] = useState(false)
  const [transMfrsOpen, setTransMfrsOpen] = useState(false)
  const [engineMfrsOpen, setEngineMfrsOpen] = useState(false)
  const [engineModelsOpen, setEngineModelsOpen] = useState(false)
  const [cabTypesOpen, setCabTypesOpen] = useState(false)

  // Add state variables for the new truck type and sleeper type filters
  const [selectedTruckTypes, setSelectedTruckTypes] = useState<string[]>([])
  const [selectedSleeperTypes, setSelectedSleeperTypes] = useState<string[]>([])
  const [truckTypesOpen, setTruckTypesOpen] = useState(false)
  const [sleeperTypesOpen, setSleeperTypesOpen] = useState(false)

  // Update available engine models based on selected engine manufacturers
  const availableEngineModels = selectedEngineMfrs.flatMap((mfr) => {
    // Try to find the manufacturer in engine models with case-insensitive matching
    const matchingKey = Object.keys(engineModels).find(
      key => key.toLowerCase() === mfr.toLowerCase()
    );
    return matchingKey ? engineModels[matchingKey] : [];
  });

  // Add state variables for the new filters
  const [selectedStates, setSelectedStates] = useState<string[]>([])
  const [statesOpen, setStatesOpen] = useState(false)

  // Get the display names for selected makes and models from dynamically loaded data
  const selectedMakeLabels = selectedMakes.map((make) => 
    truckMakes.find((m) => m.value === make)?.label || make
  )
  
  const selectedModelLabels = selectedModels.map((model) => {
    for (const make in truckModels) {
      const found = truckModels[make]?.find((m) => m.value === model)
      if (found) return found.label
    }
    return model
  })

  // Add state to store truck data 
  const [trucks, setTrucks] = useState<any[]>([])
  const [truckStats, setTruckStats] = useState<any>(null)
  const [displayedTruckStats, setDisplayedTruckStats] = useState<any>(null)

  // Add state for pagination in the parent component
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(5)

  // Add additional pagination state
  const [totalItems, setTotalItems] = useState<number>(0)
  const [totalPages, setTotalPages] = useState<number>(1)

  // Update state variables for ranges instead of value/delta
  const [minMiles, setMinMiles] = useState(200000)
  const [maxMiles, setMaxMiles] = useState(400000)
  const [minYear, setMinYear] = useState(2015)
  const [maxYear, setMaxYear] = useState(2021)
  const [minHorsepower, setMinHorsepower] = useState(400)
  const [maxHorsepower, setMaxHorsepower] = useState(500)

  // Add new state variables for the new filters
  const [availableSources, setAvailableSources] = useState<Array<{ value: string; label: string }>>([])
  const [selectedSources, setSelectedSources] = useState<string[]>([])
  const [sourcesOpen, setSourcesOpen] = useState(false)

  // Fetch filter options from database on component mount
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        setLoading(true)
        
        console.log("Fetching filter options from API...");
        
        // Fetch all filter options from the database
        const response = await fetch('/api/filter-options')
        const data = await response.json()
        
        // Log the complete response for debugging
        console.log("Filter options API response:", data);
        
        if (data.success) {
          // Log each set of options to verify what's being received
          console.log("Makes:", data.makes || []);
          console.log("Models:", data.models || {});
          console.log("Transmissions:", data.transmissions || []);
          console.log("Transmission Manufacturers:", data.transmissionManufacturers || []);
          console.log("Engine Manufacturers:", data.engineManufacturers || []);
          console.log("Engine Models:", data.engineModels || []);
          console.log("Cab Types:", data.cabTypes || []);
          console.log("Truck Types:", data.truckTypes || []);
          console.log("Sleeper Types:", data.sleeperTypes || []);
          
          // Set all dropdown options from the database
          setTruckMakes(data.makes.map((make: { label: string }) => ({ 
            value: make.label.toLowerCase(),
            label: make.label 
          })) || [])
          
          setTruckModels(data.models || {})
          
          // Map transmissions to transmissionTypes (fixing naming mismatch)
          setTransmissionTypes(data.transmissions || [])
          setTransmissionManufacturers(data.transmissionManufacturers || [])
          setEngineManufacturers(data.engineManufacturers || [])
          
          // For engineModels, we need to organize them by manufacturer if it's a flat array
          if (Array.isArray(data.engineModels)) {
            // Create a default category for models without a specific manufacturer
            const modelsByManufacturer: Record<string, Array<{ value: string; label: string }>> = {
              "all": data.engineModels
            };
            
            // If we have engine manufacturers, use the first one as default
            if (data.engineManufacturers && data.engineManufacturers.length > 0) {
              const defaultMfr = data.engineManufacturers[0].value;
              modelsByManufacturer[defaultMfr] = data.engineModels;
            }
            
            setEngineModels(modelsByManufacturer);
          } else {
            // It's already in the correct format
            setEngineModels(data.engineModels || {});
          }
          
          setCabTypes(data.cabTypes || [])
          setTruckTypes(data.truckTypes || [])
          setSleeperTypes(data.sleeperTypes || [])
          setAvailableSources(data.sources || [])
        } else {
          console.error("Failed to fetch filter options:", data.error)
        }
      } catch (error) {
        console.error("Error fetching filter options:", error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchFilterOptions()
  }, [])
  
  // Update the handleSearch function to fix the type error and use the new ranges
  const handleSearch = async () => {
    try {
      setSearchLoading(true)
      
      // Reset to first page when doing a new search
      setCurrentPage(1)
      
      // Use labels for makes and models but keep original values (codes) for states
      const selectedMakeLabels = selectedMakes.map(
        (make: string) => truckMakes.find(m => m.value === make)?.label || make
      )
      
      const newFilters: ExtendedTruckFilters & { source?: string[] } = {
        makes: selectedMakeLabels, // Send labels instead of values
        models: selectedModels.map((model: string) => {
          for (const make in truckModels) {
            const found = truckModels[make]?.find(m => m.value === model)
            if (found) return found.label
          }
          return model
        }),
        milesRange: { min: minMiles, max: maxMiles },
        yearRange: { min: minYear, max: maxYear },
        horsepowerRange: { min: minHorsepower, max: maxHorsepower },
        transmission: selectedTransmissions.map((trans: string) => 
          transmissionTypes.find(t => t.value === trans)?.label || trans
        ),
        transmissionManufacturer: selectedTransMfrs.map((mfr: string) => 
          transmissionManufacturers.find(m => m.value === mfr)?.label || mfr
        ),
        engineManufacturer: selectedEngineMfrs.map((mfr: string) => 
          engineManufacturers.find(m => m.value === mfr)?.label || mfr
        ),
        engineModel: selectedEngineModels.map((model: string) => {
          for (const mfr in engineModels) {
            const found = engineModels[mfr]?.find(m => m.value === model)
            if (found) return found.label
          }
          return model
        }),
        cab: selectedCabTypes.map((cab: string) => 
          cabTypes.find(c => c.value === cab)?.label || cab
        ),
        states: selectedStates, // Send the state codes directly, not the labels
        truckType: selectedTruckTypes.map((type: string) => 
          truckTypes.find(t => t.value === type)?.label || type
        ),
        sleeperType: selectedSleeperTypes.map((type: string) => 
          sleeperTypes.find(t => t.value === type)?.label || type
        ),
        source: selectedSources
      }
      
      // Log the filters being sent to the API
      console.log("Sending filters to API:", JSON.stringify(newFilters, null, 2));
      
      setFilters(newFilters)
      setSearchPerformed(true)
      setSearchCount((prev) => prev + 1)
      setRefreshTrigger((prev) => prev + 1)
      
      console.log("Fetching truck data from APIs simultaneously...");
      
      // Call all three APIs simultaneously using Promise.all
      const [countResponse, trucksResponse, statsResponse] = await Promise.all([
        fetch('/api/trucks/count', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ filters: newFilters }),
        }),
        fetch('/api/trucks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            filters: newFilters,
            page: currentPage,
            limit: pageSize
          }),
        }),
        fetch('/api/trucks/stats', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ filters: newFilters }),
        })
      ]);
      
      // Process count response
      const countData = await countResponse.json();
      console.log("Truck count API response:", countData);
      
      if (countData.count !== undefined) {
        console.log("Truck count:", countData.count);
        setTruckCount(countData.count);
      } else if (countData.error) {
        console.error("Failed to get truck count:", countData.error);
        setTruckCount(0);
      } else {
        console.error("Failed to get truck count: undefined");
        setTruckCount(0);
      }
      
      // Process trucks response
      const trucksData = await trucksResponse.json();
      console.log("Truck data API response:", trucksData);
      
      if (trucksData.success && trucksData.trucks) {
        // Object with trucks and pagination data
        setTrucks(trucksData.trucks);
        
        // Extract pagination data if available
        if (trucksData.pagination) {
          setTotalItems(trucksData.pagination.totalItems || 0);
          setTotalPages(trucksData.pagination.totalPages || 1);
          
          // Ensure currentPage is within valid range
          if (currentPage > trucksData.pagination.totalPages) {
            setCurrentPage(1);
          }
        }
      } else if (Array.isArray(trucksData)) {
        // Direct array of trucks (less common case)
        setTrucks(trucksData);
      } else if (trucksData.error) {
        console.error("Failed to get truck data:", trucksData.error);
        setTrucks([]);
      } else {
        console.error("Failed to get truck data: undefined");
        setTrucks([]);
      }
      
      // Process statistics response
      const statsData = await statsResponse.json();
      console.log("Truck statistics API response:", statsData);
      
      // Update stats state if available
      if (statsData && !statsData.error) {
        setTruckStats(statsData);
        setDisplayedTruckStats(statsData);
      } else {
        console.error("Failed to get truck statistics:", statsData?.error || "undefined");
        setTruckStats(null);
        setDisplayedTruckStats(null);
      }
      
    } catch (error) {
      console.error("Error getting truck data:", error);
      setTruckCount(0);
      setTrucks([]);
    } finally {
      setSearchLoading(false);
    }
  }

  // Update the handleVinSearch function
  const handleVinSearch = async () => {
    if (vin && vin.length >= 17) {
      try {
        setVinSearchLoading(true)
        setVinSearchPerformed(false); // Reset while searching
        
        console.log(`Searching for VIN: ${vin}`);
        
        // Call the server-side API endpoint
        const response = await fetch(`/api/vin?vin=${vin}`);
        const data = await response.json();
        
        // Log the full response for debugging
        console.log("VIN API Response:", data);
        
        if (data && data.id) {
          // If we have a truck object directly
          const truckData = data;
          console.log("VIN match found:", truckData);
          setVinMatchFound(true);
          
          // Parse the mileage string to a number by removing commas and 'mi' suffix
          let mileageValue = 0;
          if (truckData.mileage) {
            // Remove commas and non-numeric characters, then parse as integer
            mileageValue = parseInt(String(truckData.mileage).replace(/,/g, '').replace(/[^0-9]/g, ''));
          }
          
          // Map the MySQL data to the vinSpecs format with correct field names and fallbacks
          const specs = {
            make: truckData.manufacturer || "",
            model: truckData.model || "",
            year: truckData.year ? parseInt(String(truckData.year)) : 0, // Ensure year is a number
            miles: mileageValue, // Use the parsed mileage value
            trim: truckData.trim || "",
            engine: truckData.engine_model || "",
            transmission: truckData.transmission || "",
            exteriorColor: truckData.color || "",
            interiorColor: truckData.seats_upholstery || "",
            axleRatio: truckData.ratio || "",
            suspension: truckData.suspension || "",
            wheelbase: truckData.wheelbase || ""
          };
          
          console.log("Mapped specs:", specs);
          setVinSpecs(specs);
          
          // Only pre-fill the search criteria if values exist
          if (specs.make) setSelectedMakes([specs.make.toLowerCase()]);
          if (specs.model) setSelectedModels([specs.model.toLowerCase()]);
          if (specs.year) setMinYear(specs.year - 3);
          if (specs.year) setMaxYear(specs.year + 3);
          if (specs.miles) setMinMiles(Math.max(0, specs.miles - 100000));
          if (specs.miles) setMaxMiles(specs.miles + 100000);
        } else {
          console.log("No VIN match found");
          setVinMatchFound(false);
          setVinSpecs(null);
        }
      } catch (error) {
        console.error("Error searching VIN:", error);
        setVinMatchFound(false);
        setVinSpecs(null);
      } finally {
        setVinSearchLoading(false)
        setVinSearchPerformed(true);
      }
    } else {
      console.warn("Invalid VIN length:", vin.length);
    }
  }

  const applyVinSpecsToSearch = () => {
    if (vinSpecs) {
      setApplyVinSpecsLoading(true)
      
      // Apply the year from VIN specs with a range of +/- 3 years
      if (vinSpecs.year) {
        setMinYear(vinSpecs.year - 3);
        setMaxYear(vinSpecs.year + 3);
      }
      
      // Apply the miles from VIN specs with a range of +/- 100,000 miles
      if (vinSpecs.miles) {
        setMinMiles(Math.max(0, vinSpecs.miles - 100000));
        setMaxMiles(vinSpecs.miles + 100000);
      }
      
      // Apply the specs to the search and switch to criteria tab
      setActiveTab("criteria");
      
      // Then trigger search
      handleSearch().finally(() => {
        setApplyVinSpecsLoading(false)
      });
    }
  }

  const incrementValue = (setter: React.Dispatch<React.SetStateAction<number>>, value: number, increment: number) => {
    setter(value + increment)
  }

  const decrementValue = (setter: React.Dispatch<React.SetStateAction<number>>, value: number, decrement: number) => {
    setter(Math.max(0, value - decrement))
  }

  // Modify the setActiveTab function to reset relevant states when switching to VIN tab
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    // Reset search results when switching to VIN tab
    if (value === "vin") {
      setSearchPerformed(false);
    }
  }

  // Add a function to handle page changes that will trigger a new API call
  const handlePageChange = async (newPage: number) => {
    console.log(`Changing to page ${newPage}`);
    setCurrentPage(newPage);
    
    // Fetch new data for this page
    try {
      setSearchLoading(true);
      
      // Call the API with the current filters but new page number
      const response = await fetch('/api/trucks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          filters,
          page: newPage,
          limit: pageSize
        }),
      });
      
      const trucksData = await response.json();
      console.log("Page change API response:", trucksData);
      
      if (trucksData.success && trucksData.trucks) {
        setTrucks(trucksData.trucks);
        
        // Update pagination data if available
        if (trucksData.pagination) {
          setTotalItems(trucksData.pagination.totalItems || 0);
          setTotalPages(trucksData.pagination.totalPages || 1);
        }
        
        // Force refresh of the TruckList component
        setRefreshTrigger(prev => prev + 1);
      } else if (trucksData.error) {
        console.error("Failed to get truck data:", trucksData.error);
      }
    } catch (error) {
      console.error("Error getting truck data for page change:", error);
    } finally {
      setSearchLoading(false);
    }
  };

  // Handle page size changes that will trigger a new API call
  const handlePageSizeChange = async (newSize: number) => {
    console.log(`Changing page size to ${newSize}`);
    setPageSize(newSize);
    
    // Reset to page 1 when changing page size
    setCurrentPage(1);
    
    // Fetch new data with the new page size
    try {
      setSearchLoading(true);
      
      const response = await fetch('/api/trucks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          filters,
          page: 1, // Reset to page 1
          limit: newSize
        }),
      });
      
      const trucksData = await response.json();
      
      if (trucksData.success && trucksData.trucks) {
        setTrucks(trucksData.trucks);
        
        // Update pagination data if available
        if (trucksData.pagination) {
          setTotalItems(trucksData.pagination.totalItems || 0);
          setTotalPages(trucksData.pagination.totalPages || 1);
        }
        
        // Force refresh of the TruckList component
        setRefreshTrigger(prev => prev + 1);
      } else if (trucksData.error) {
        console.error("Failed to get truck data:", trucksData.error);
      }
    } catch (error) {
      console.error("Error getting truck data for page size change:", error);
    } finally {
      setSearchLoading(false);
    }
  };

  // Add a new reset function
  const handleReset = () => {
    // Reset all filter selections
    setSelectedMakes([]);
    setSelectedModels([]);
    setMinMiles(200000);
    setMaxMiles(400000);
    setMinYear(2015);
    setMaxYear(2021);
    setMinHorsepower(400);
    setMaxHorsepower(500);
    setSelectedTransmissions([]);
    setSelectedTransMfrs([]);
    setSelectedEngineMfrs([]);
    setSelectedEngineModels([]);
    setSelectedCabTypes([]);
    setSelectedStates([]);
    setSelectedTruckTypes([]);
    setSelectedSleeperTypes([]);
    setSelectedSources([])
    
    // Reset filters object
    setFilters({
      makes: [],
      models: [],
      milesRange: { min: 200000, max: 400000 },
      yearRange: { min: 2015, max: 2021 },
      horsepowerRange: { min: 400, max: 500 },
      transmission: [],
      transmissionManufacturer: [],
      engineManufacturer: [],
      engineModel: [],
      cab: [],
      states: [],
      truckType: [],
      sleeperType: [],
      source: []
    });
    
    // Hide search results
    setSearchPerformed(false);
    
    // Reset VIN search if applicable
    setVin("");
    setVinSearchPerformed(false);
    setVinMatchFound(false);
    setVinSpecs(null);

    if (onReset) onReset();
  }

  useImperativeHandle(ref, () => ({
    handleReset,
  }));

  // Render loading state if options are still loading
  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        <span className="ml-3">Loading filter options...</span>
      </div>
    )
  }
  
  return (
    <div className="space-y-8">
      <div>
        
        <div className="mt-6">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsContent value="criteria" className="m-0">
              <div className="border border-gray-200 rounded-lg p-8 bg-white shadow-sm">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-6 mb-6">
                  <div className="space-y-2 flex flex-col flex-1 min-w-[300px]">
                    <Label htmlFor="source">Source</Label>
                    <Popover open={sourcesOpen} onOpenChange={setSourcesOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={sourcesOpen}
                          className="w-full max-w-[500px] justify-between bg-white"
                        >
                          {selectedSources.length > 0 ? `${selectedSources.length} selected` : "..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full max-w-[500px] p-0">
                        <Command>
                          <CommandInput placeholder="Search sources..." />
                          <CommandList>
                            <CommandEmpty>No source found.</CommandEmpty>
                            <CommandGroup>
                              {availableSources.map((source) => (
                                <CommandItem
                                  key={source.value}
                                  value={source.value}
                                  onSelect={() => {
                                    setSelectedSources(
                                      selectedSources.includes(source.value)
                                        ? selectedSources.filter((s) => s !== source.value)
                                        : [...selectedSources, source.value],
                                    )
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedSources.includes(source.value) ? "opacity-100" : "opacity-0",
                                    )}
                                  />
                                  {source.label}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {selectedSources.length > 0 && (
                      <MultiSelectPills
                        items={selectedSources.map((value) => ({
                          value,
                          label: availableSources.find((s) => s.value === value)?.label || value,
                        }))}
                        onRemove={(value) => setSelectedSources(selectedSources.filter((s) => s !== value))}
                      />
                    )}
                  </div>
                  <TabsList className="grid w-full max-w-[450px] grid-cols-2 p-1 bg-muted rounded-md md:mb-0 mx-auto md:mx-0 mb-2">
                    <TabsTrigger value="criteria" className="rounded-sm py-2">Search by Criteria</TabsTrigger>
                    <TabsTrigger value="vin" className="rounded-sm py-2">Search by VIN</TabsTrigger>
                  </TabsList>
                </div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {/* Make Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="make">Make</Label>
                    <div className="relative">
                      <Popover open={makesOpen} onOpenChange={setMakesOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={makesOpen}
                            className="w-full justify-between bg-white"
                          >
                            {selectedMakes.length > 0 ? `${selectedMakes.length} selected` : "..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0">
                          <Command>
                            <CommandInput placeholder="Search makes..." />
                            <CommandList>
                              <CommandEmpty>No make found.</CommandEmpty>
                              <CommandGroup>
                                {truckMakes.map((make) => (
                                  <CommandItem
                                    key={make.value}
                                    value={make.value}
                                    onSelect={() => {
                                      setSelectedMakes(
                                        selectedMakes.includes(make.value)
                                          ? selectedMakes.filter((m) => m !== make.value)
                                          : [...selectedMakes, make.value],
                                      )
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedMakes.includes(make.value) ? "opacity-100" : "opacity-0",
                                      )}
                                    />
                                    {make.label}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      {selectedMakes.length > 0 && (
                        <MultiSelectPills
                          items={selectedMakes.map((value) => ({
                            value,
                            label: truckMakes.find((m) => m.value === value)?.label || value,
                          }))}
                          onRemove={(value) => setSelectedMakes(selectedMakes.filter((m) => m !== value))}
                        />
                      )}
                    </div>
                  </div>

                  {/* Model Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="model">Model</Label>
                    <div className="relative">
                      <Popover open={modelsOpen} onOpenChange={setModelsOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={modelsOpen}
                            className="w-full justify-between bg-white"
                            disabled={availableModels.length === 0}
                          >
                            {selectedModels.length > 0 ? `${selectedModels.length} selected` : "..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0">
                          <Command>
                            <CommandInput placeholder="Search models..." />
                            <CommandList>
                              <CommandEmpty>No model found.</CommandEmpty>
                              <CommandGroup>
                                {availableModels.map((model) => (
                                  <CommandItem
                                    key={model.value}
                                    value={model.value}
                                    onSelect={() => {
                                      setSelectedModels(
                                        selectedModels.includes(model.value)
                                          ? selectedModels.filter((m) => m !== model.value)
                                          : [...selectedModels, model.value],
                                      )
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedModels.includes(model.value) ? "opacity-100" : "opacity-0",
                                      )}
                                    />
                                    {model.label}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      {selectedModels.length > 0 && (
                        <MultiSelectPills
                          items={selectedModels.map((value) => {
                            let label = value;
                            for (const make in truckModels) {
                              const found = truckModels[make]?.find((m) => m.value === value);
                              if (found) label = found.label;
                            }
                            return { value, label };
                          })}
                          onRemove={(value) => setSelectedModels(selectedModels.filter((m) => m !== value))}
                        />
                      )}
                    </div>
                  </div>

                  {/* Miles range */}
                  <div className="space-y-2">
                    <Label htmlFor="miles">Miles range</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative">
                        <Input
                          type="number"
                          value={minMiles}
                          onChange={(e) => {
                            const value = Number.parseInt(e.target.value) || 0;
                            setMinMiles(value);
                          }}
                          className="pr-8 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          placeholder="10,000"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                          <div className="flex flex-col">
                            <button
                              onClick={() => incrementValue(setMinMiles, minMiles, 10000)}
                              className="h-4 w-4 flex items-center justify-center hover:bg-gray-100 rounded-t-sm"
                            >
                              <ChevronUp className="h-3 w-3 opacity-50" />
                            </button>
                            <button
                              onClick={() => decrementValue(setMinMiles, minMiles, 10000)}
                              className="h-4 w-4 flex items-center justify-center hover:bg-gray-100 rounded-b-sm"
                            >
                              <ChevronDown className="h-3 w-3 opacity-50" />
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="relative">
                        <Input
                          type="number"
                          value={maxMiles}
                          onChange={(e) => {
                            const value = Number.parseInt(e.target.value) || 0;
                            setMaxMiles(value);
                          }}
                          className="pr-8 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          placeholder="80,000"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                          <div className="flex flex-col">
                            <button
                              onClick={() => incrementValue(setMaxMiles, maxMiles, 10000)}
                              className="h-4 w-4 flex items-center justify-center hover:bg-gray-100 rounded-t-sm"
                            >
                              <ChevronUp className="h-3 w-3 opacity-50" />
                            </button>
                            <button
                              onClick={() => decrementValue(setMaxMiles, maxMiles, 10000)}
                              className="h-4 w-4 flex items-center justify-center hover:bg-gray-100 rounded-b-sm"
                            >
                              <ChevronDown className="h-3 w-3 opacity-50" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Year range */}
                  <div className="space-y-2">
                    <Label htmlFor="year">Year range</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative">
                        <Input
                          type="number"
                          value={minYear}
                          onChange={(e) => {
                            const value = Number.parseInt(e.target.value) || 0;
                            setMinYear(value);
                          }}
                          className="pr-8 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          placeholder="2010"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                          <div className="flex flex-col">
                            <button
                              onClick={() => incrementValue(setMinYear, minYear, 1)}
                              className="h-4 w-4 flex items-center justify-center hover:bg-gray-100 rounded-t-sm"
                            >
                              <ChevronUp className="h-3 w-3 opacity-50" />
                            </button>
                            <button
                              onClick={() => decrementValue(setMinYear, minYear, 1)}
                              className="h-4 w-4 flex items-center justify-center hover:bg-gray-100 rounded-b-sm"
                            >
                              <ChevronDown className="h-3 w-3 opacity-50" />
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="relative">
                        <Input
                          type="number"
                          value={maxYear}
                          onChange={(e) => {
                            const value = Number.parseInt(e.target.value) || 0;
                            setMaxYear(value);
                          }}
                          className="pr-8 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          placeholder="2025"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                          <div className="flex flex-col">
                            <button
                              onClick={() => incrementValue(setMaxYear, maxYear, 1)}
                              className="h-4 w-4 flex items-center justify-center hover:bg-gray-100 rounded-t-sm"
                            >
                              <ChevronUp className="h-3 w-3 opacity-50" />
                            </button>
                            <button
                              onClick={() => decrementValue(setMaxYear, maxYear, 1)}
                              className="h-4 w-4 flex items-center justify-center hover:bg-gray-100 rounded-b-sm"
                            >
                              <ChevronDown className="h-3 w-3 opacity-50" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Engine manufacturer */}
                  <div className="space-y-2">
                    <Label htmlFor="engine-mfr">Engine manufacturer</Label>
                    <div className="relative">
                      <Popover open={engineMfrsOpen} onOpenChange={setEngineMfrsOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={engineMfrsOpen}
                            className="w-full justify-between bg-white"
                          >
                            {selectedEngineMfrs.length > 0 ? `${selectedEngineMfrs.length} selected` : "..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0">
                          <Command>
                            <CommandInput placeholder="Search manufacturers..." />
                            <CommandList>
                              <CommandEmpty>No manufacturer found.</CommandEmpty>
                              <CommandGroup>
                                {engineManufacturers.map((mfr) => (
                                  <CommandItem
                                    key={mfr.value}
                                    value={mfr.value}
                                    onSelect={() => {
                                      setSelectedEngineMfrs(
                                        selectedEngineMfrs.includes(mfr.value)
                                          ? selectedEngineMfrs.filter((m) => m !== mfr.value)
                                          : [...selectedEngineMfrs, mfr.value],
                                      )
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedEngineMfrs.includes(mfr.value) ? "opacity-100" : "opacity-0",
                                      )}
                                    />
                                    {mfr.label}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      {selectedEngineMfrs.length > 0 && (
                        <MultiSelectPills
                          items={selectedEngineMfrs.map((value) => ({
                            value,
                            label: engineManufacturers.find((m) => m.value === value)?.label || value,
                          }))}
                          onRemove={(value) => setSelectedEngineMfrs(selectedEngineMfrs.filter((m) => m !== value))}
                        />
                      )}
                    </div>
                  </div>

                  {/* Engine Model */}
                  <div className="space-y-2">
                    <Label htmlFor="engine-model">Engine model</Label>
                    <div className="relative">
                      <Popover open={engineModelsOpen} onOpenChange={setEngineModelsOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={engineModelsOpen}
                            className="w-full justify-between bg-white"
                            disabled={availableEngineModels.length === 0}
                          >
                            {selectedEngineModels.length > 0 ? `${selectedEngineModels.length} selected` : "..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0">
                          <Command>
                            <CommandInput placeholder="Search models..." />
                            <CommandList>
                              <CommandEmpty>No model found.</CommandEmpty>
                              <CommandGroup>
                                {availableEngineModels.map((model) => (
                                  <CommandItem
                                    key={model.value}
                                    value={model.value}
                                    onSelect={() => {
                                      setSelectedEngineModels(
                                        selectedEngineModels.includes(model.value)
                                          ? selectedEngineModels.filter((m) => m !== model.value)
                                          : [...selectedEngineModels, model.value],
                                      )
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedEngineModels.includes(model.value) ? "opacity-100" : "opacity-0",
                                      )}
                                    />
                                    {model.label}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      {selectedEngineModels.length > 0 && (
                        <MultiSelectPills
                          items={selectedEngineModels.map((value) => {
                            let label = value;
                            for (const mfr in engineModels) {
                              const found = engineModels[mfr]?.find((m) => m.value === value);
                              if (found) label = found.label;
                            }
                            return { value, label };
                          })}
                          onRemove={(value) => setSelectedEngineModels(selectedEngineModels.filter((m) => m !== value))}
                        />
                      )}
                    </div>
                  </div>

                  {/* Transmission Type */}
                  <div className="space-y-2">
                    <Label htmlFor="transmission">Transmission type</Label>
                    <Popover open={transmissionsOpen} onOpenChange={setTransmissionsOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={transmissionsOpen}
                          className="w-full justify-between bg-white"
                        >
                          {selectedTransmissions.length > 0 ? `${selectedTransmissions.length} selected` : "..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder="Search transmissions..." />
                          <CommandList>
                            <CommandEmpty>No transmission found.</CommandEmpty>
                            <CommandGroup>
                              {transmissionTypes.map((transmission) => (
                                <CommandItem
                                  key={transmission.value}
                                  value={transmission.value}
                                  onSelect={() => {
                                    setSelectedTransmissions(
                                      selectedTransmissions.includes(transmission.value)
                                        ? selectedTransmissions.filter((t) => t !== transmission.value)
                                        : [...selectedTransmissions, transmission.value],
                                    )
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedTransmissions.includes(transmission.value) ? "opacity-100" : "opacity-0",
                                    )}
                                  />
                                  {transmission.label}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {selectedTransmissions.length > 0 && (
                      <MultiSelectPills
                        items={selectedTransmissions.map((value) => ({
                          value,
                          label: transmissionTypes.find((t) => t.value === value)?.label || value,
                        }))}
                        onRemove={(value) => setSelectedTransmissions(selectedTransmissions.filter((t) => t !== value))}
                      />
                    )}
                  </div>

                  {/* Transmission Manufacturer */}
                  <div className="space-y-2">
                    <Label htmlFor="trans-mfr">Transmission manufacturer</Label>
                    <Popover open={transMfrsOpen} onOpenChange={setTransMfrsOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={transMfrsOpen}
                          className="w-full justify-between bg-white"
                        >
                          {selectedTransMfrs.length > 0 ? `${selectedTransMfrs.length} selected` : "..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder="Search manufacturers..." />
                          <CommandList>
                            <CommandEmpty>No manufacturer found.</CommandEmpty>
                            <CommandGroup>
                              {transmissionManufacturers.map((mfr) => (
                                <CommandItem
                                  key={mfr.value}
                                  value={mfr.value}
                                  onSelect={() => {
                                    setSelectedTransMfrs(
                                      selectedTransMfrs.includes(mfr.value)
                                        ? selectedTransMfrs.filter((m) => m !== mfr.value)
                                        : [...selectedTransMfrs, mfr.value],
                                    )
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedTransMfrs.includes(mfr.value) ? "opacity-100" : "opacity-0",
                                    )}
                                  />
                                  {mfr.label}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {selectedTransMfrs.length > 0 && (
                      <MultiSelectPills
                        items={selectedTransMfrs.map((value) => ({
                          value,
                          label: transmissionManufacturers.find((m) => m.value === value)?.label || value,
                        }))}
                        onRemove={(value) => setSelectedTransMfrs(selectedTransMfrs.filter((m) => m !== value))}
                      />
                    )}
                  </div>

                  {/* Truck Type */}
                  <div className="space-y-2">
                    <Label htmlFor="truck-type">Truck type</Label>
                    <Popover open={truckTypesOpen} onOpenChange={setTruckTypesOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={truckTypesOpen}
                          className="w-full justify-between bg-white"
                        >
                          {selectedTruckTypes.length > 0 ? `${selectedTruckTypes.length} selected` : "..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder="Search truck types..." />
                          <CommandList>
                            <CommandEmpty>No truck type found.</CommandEmpty>
                            <CommandGroup>
                              {truckTypes.map((type) => (
                                <CommandItem
                                  key={type.value}
                                  value={type.value}
                                  onSelect={() => {
                                    setSelectedTruckTypes(
                                      selectedTruckTypes.includes(type.value)
                                        ? selectedTruckTypes.filter((t) => t !== type.value)
                                        : [...selectedTruckTypes, type.value],
                                    )
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedTruckTypes.includes(type.value) ? "opacity-100" : "opacity-0",
                                    )}
                                  />
                                  {type.label}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {selectedTruckTypes.length > 0 && (
                      <MultiSelectPills
                        items={selectedTruckTypes.map((value) => ({
                          value,
                          label: truckTypes.find((t) => t.value === value)?.label || value,
                        }))}
                        onRemove={(value) => setSelectedTruckTypes(selectedTruckTypes.filter((t) => t !== value))}
                      />
                    )}
                  </div>

                  {/* Sleeper Type */}
                  <div className="space-y-2">
                    <Label htmlFor="sleeper-type">Sleeper type</Label>
                    <Popover open={sleeperTypesOpen} onOpenChange={setSleeperTypesOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={sleeperTypesOpen}
                          className="w-full justify-between bg-white"
                        >
                          {selectedSleeperTypes.length > 0 ? `${selectedSleeperTypes.length} selected` : "..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder="Search sleeper types..." />
                          <CommandList>
                            <CommandEmpty>No sleeper type found.</CommandEmpty>
                            <CommandGroup>
                              {sleeperTypes.map((type) => (
                                <CommandItem
                                  key={type.value}
                                  value={type.value}
                                  onSelect={() => {
                                    setSelectedSleeperTypes(
                                      selectedSleeperTypes.includes(type.value)
                                        ? selectedSleeperTypes.filter((t) => t !== type.value)
                                        : [...selectedSleeperTypes, type.value],
                                    )
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedSleeperTypes.includes(type.value) ? "opacity-100" : "opacity-0",
                                    )}
                                  />
                                  {type.label}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {selectedSleeperTypes.length > 0 && (
                      <MultiSelectPills
                        items={selectedSleeperTypes.map((value) => ({
                          value,
                          label: sleeperTypes.find((t) => t.value === value)?.label || value,
                        }))}
                        onRemove={(value) => setSelectedSleeperTypes(selectedSleeperTypes.filter((t) => t !== value))}
                      />
                    )}
                  </div>

                  {/* Cab Type */}
                  <div className="space-y-2">
                    <Label htmlFor="cab-type">Cab type</Label>
                    <Popover open={cabTypesOpen} onOpenChange={setCabTypesOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={cabTypesOpen}
                          className="w-full justify-between bg-white"
                        >
                          {selectedCabTypes.length > 0 ? `${selectedCabTypes.length} selected` : "..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder="Search cab types..." />
                          <CommandList>
                            <CommandEmpty>No cab type found.</CommandEmpty>
                            <CommandGroup>
                              {cabTypes.map((cab) => (
                                <CommandItem
                                  key={cab.value}
                                  value={cab.value}
                                  onSelect={() => {
                                    setSelectedCabTypes(
                                      selectedCabTypes.includes(cab.value)
                                        ? selectedCabTypes.filter((c) => c !== cab.value)
                                        : [...selectedCabTypes, cab.value],
                                    )
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedCabTypes.includes(cab.value) ? "opacity-100" : "opacity-0",
                                    )}
                                  />
                                  {cab.label}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {selectedCabTypes.length > 0 && (
                      <MultiSelectPills
                        items={selectedCabTypes.map((value) => ({
                          value,
                          label: cabTypes.find((c) => c.value === value)?.label || value,
                        }))}
                        onRemove={(value) => setSelectedCabTypes(selectedCabTypes.filter((c) => c !== value))}
                      />
                    )}
                  </div>

                  {/* Horsepower range */}
                  <div className="space-y-2">
                    <Label htmlFor="horsepower">Horsepower range</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative">
                        <Input
                          type="number"
                          value={minHorsepower}
                          onChange={(e) => {
                            const value = Number.parseInt(e.target.value) || 0;
                            setMinHorsepower(value);
                          }}
                          className="pr-8 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          placeholder="400"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                          <div className="flex flex-col">
                            <button
                              onClick={() => incrementValue(setMinHorsepower, minHorsepower, 50)}
                              className="h-4 w-4 flex items-center justify-center hover:bg-gray-100 rounded-t-sm"
                            >
                              <ChevronUp className="h-3 w-3 opacity-50" />
                            </button>
                            <button
                              onClick={() => decrementValue(setMinHorsepower, minHorsepower, 50)}
                              className="h-4 w-4 flex items-center justify-center hover:bg-gray-100 rounded-b-sm"
                            >
                              <ChevronDown className="h-3 w-3 opacity-50" />
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="relative">
                        <Input
                          type="number"
                          value={maxHorsepower}
                          onChange={(e) => {
                            const value = Number.parseInt(e.target.value) || 0;
                            setMaxHorsepower(value);
                          }}
                          className="pr-8 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          placeholder="500"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                          <div className="flex flex-col">
                            <button
                              onClick={() => incrementValue(setMaxHorsepower, maxHorsepower, 50)}
                              className="h-4 w-4 flex items-center justify-center hover:bg-gray-100 rounded-t-sm"
                            >
                              <ChevronUp className="h-3 w-3 opacity-50" />
                            </button>
                            <button
                              onClick={() => decrementValue(setMaxHorsepower, maxHorsepower, 50)}
                              className="h-4 w-4 flex items-center justify-center hover:bg-gray-100 rounded-b-sm"
                            >
                              <ChevronDown className="h-3 w-3 opacity-50" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* State */}
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Popover open={statesOpen} onOpenChange={setStatesOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={statesOpen}
                          className="w-full justify-between bg-white"
                        >
                          {selectedStates.length > 0 ? `${selectedStates.length} selected` : "..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder="Search states..." />
                          <CommandList>
                            <CommandEmpty>No state found.</CommandEmpty>
                            <CommandGroup>
                              {states.map((state) => (
                                <CommandItem
                                  key={state.value}
                                  value={state.value}
                                  onSelect={() => {
                                    setSelectedStates(
                                      selectedStates.includes(state.value)
                                        ? selectedStates.filter((s) => s !== state.value)
                                        : [...selectedStates, state.value],
                                    )
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedStates.includes(state.value) ? "opacity-100" : "opacity-0",
                                    )}
                                  />
                                  {state.label}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {selectedStates.length > 0 && (
                      <MultiSelectPills
                        items={selectedStates.map((value) => ({
                          value,
                          label: states.find((s) => s.value === value)?.label || value,
                        }))}
                        onRemove={(value) => setSelectedStates(selectedStates.filter((s) => s !== value))}
                      />
                    )}
                  </div>
                </div>
                
                {/* Search and Clear Buttons */}
                <div className="flex justify-end items-center gap-2 mt-8">
                  <Button 
                    variant="outline" 
                    onClick={handleReset} 
                    className="flex items-center gap-2 border-gray-300 font-semibold"
                  >
                    Clear search
                    <img src="/XCircle.svg" alt="Clear" className="h-5 w-5 ml-1" />
                  </Button>
                  <Button 
                    onClick={handleSearch} 
                    className="flex items-center gap-2 bg-black text-white hover:bg-gray-800 font-semibold"
                  >
                    {searchLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        Find Similar Trucks
                        <img src="/MagnifyingGlass.svg" alt="Search" className="h-5 w-5 ml-1" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="vin">
              <div className="border border-gray-200 rounded-lg p-8 bg-white shadow-sm">
                <TabsList className="grid w-full max-w-[450px] grid-cols-2 p-1 bg-muted rounded-md mb-6 mx-auto mb-2">
                  <TabsTrigger value="criteria" className="rounded-sm py-2">Search by Criteria</TabsTrigger>
                  <TabsTrigger value="vin" className="rounded-sm py-2">Search by VIN</TabsTrigger>
                </TabsList>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Input 
                      value={vin} 
                      onChange={(e) => setVin(e.target.value.toUpperCase())}
                      placeholder="Enter VIN"
                      maxLength={17}
                      className="flex-1"
                    />
                    <Button onClick={handleVinSearch} disabled={vinSearchLoading}>
                      {vinSearchLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Searching...
                        </>
                      ) : (
                        <>
                          <Search className="h-4 w-4 mr-2" />
                          Search
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {vinSearchPerformed && (
                    <div className="p-4 rounded-lg border">
                      {vinMatchFound ? (
                        <div className="space-y-4">
                          <div className="flex items-center">
                            <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center mr-2">
                              <Check className="h-4 w-4 text-green-600" />
                            </div>
                            <h3 className="font-medium">Match Found on TruckPaper</h3>
                          </div>
                          
                          {vinSpecs && (
                            <>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <p className="text-sm font-medium">Make</p>
                                  <p className="text-sm">{truckMakes.find(m => m.value === vinSpecs.make)?.label || vinSpecs.make || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium">Model</p>
                                  <p className="text-sm">
                                    {truckModels[vinSpecs.make]?.find(m => m.value === vinSpecs.model)?.label || vinSpecs.model || 'N/A'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium">Year</p>
                                  <p className="text-sm">{vinSpecs.year || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium">Miles</p>
                                  <p className="text-sm">
                                    {vinSpecs.miles ? vinSpecs.miles.toLocaleString() : 'N/A'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium">Engine</p>
                                  <p className="text-sm">{vinSpecs.engine || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium">Transmission</p>
                                  <p className="text-sm">{vinSpecs.transmission || 'N/A'}</p>
                                </div>
                              </div>
                              
                              <Button 
                                disabled={applyVinSpecsLoading} 
                                className="w-full mt-4" 
                                onClick={applyVinSpecsToSearch}
                              >
                                {applyVinSpecsLoading ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Searching...
                                  </>
                                ) : (
                                  "Use These Specs to Find Similar Trucks"
                                )}
                              </Button>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <div className="h-6 w-6 rounded-full bg-yellow-100 flex items-center justify-center mr-2">
                            <span className="text-yellow-600 text-xs">!</span>
                          </div>
                          <div>
                            <h3 className="font-medium">No Exact Match Found</h3>
                            <p className="text-sm text-muted-foreground">Try a different VIN or use the criteria search tab instead.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Only show results when searchPerformed is true AND we're on the criteria tab */}
      {searchPerformed && activeTab === "criteria" && (
        <>
          <div className="bg-muted p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-semibold">Search Results</h2>
              {searchCount > 1 && (
                <Badge variant="outline" className="animate-pulse bg-green-50">
                  Updated
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              <span className="font-bold text-foreground">{truckCount}</span> similar trucks found
            </p>
            <div className="text-sm text-muted-foreground mt-1">
              {filters.makes.length > 0 && (
                <div className="flex flex-wrap gap-1 items-center">
                  <span>Makes:</span>
                  {selectedMakeLabels.map((make) => (
                    <Badge key={make} variant="secondary" className="text-xs">
                      {make}
                    </Badge>
                  ))}
                </div>
              )}
              {filters.models.length > 0 && (
                <div className="flex flex-wrap gap-1 items-center mt-1">
                  <span>Models:</span>
                  {selectedModelLabels.map((model) => (
                    <Badge key={model} variant="secondary" className="text-xs">
                      {model}
                    </Badge>
                  ))}
                </div>
              )}
              <div className="mt-1">
                <span>
                  Year: {filters.yearRange.min} - {filters.yearRange.max}
                </span>
                {" • "}
                <span>
                  Miles: {filters.milesRange.min.toLocaleString()} - {filters.milesRange.max.toLocaleString()}
                </span>
              </div>
              
              {/* Display additional filters when they are used */}
              {filters.horsepowerRange && (
                <div className="mt-1">
                  <span>
                    Horsepower: {filters.horsepowerRange.min} - {filters.horsepowerRange.max} HP
                  </span>
                </div>
              )}
              
              {filters.states && filters.states.length > 0 && (
                <div className="flex flex-wrap gap-1 items-center mt-1">
                  <span>States:</span>
                  {filters.states.map((stateCode: string) => {
                    const stateInfo = states.find((s) => s.value === stateCode);
                    return (
                      <Badge key={stateCode} variant="secondary" className="text-xs">
                        {stateInfo?.value || stateCode}
                      </Badge>
                    );
                  })}
                </div>
              )}

              {/* Add truck type filter badges */}
              {filters.truckType && filters.truckType.length > 0 && (
                <div className="flex flex-wrap gap-1 items-center mt-1">
                  <span>Truck Type:</span>
                  {filters.truckType.map((type: string) => (
                    <Badge key={type} variant="secondary" className="text-xs">
                      {type}
                    </Badge>
                  ))}
                </div>
              )}
              
              {/* Add sleeper type filter badges */}
              {filters.sleeperType && filters.sleeperType.length > 0 && (
                <div className="flex flex-wrap gap-1 items-center mt-1">
                  <span>Sleeper Type:</span>
                  {filters.sleeperType.map((type: string) => (
                    <Badge key={type} variant="secondary" className="text-xs">
                      {type}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Pass trucks to the TruckSummaryStats component */}
          <TruckSummaryStats 
            trucks={trucks} 
            stats={displayedTruckStats}
            refreshTrigger={refreshTrigger} 
          />

          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-4">Similar Trucks</h2>
            <TruckList 
              trucks={trucks} 
              filters={filters} 
              key={`trucks-${refreshTrigger}`}
              disableExternalFetching={true}
              currentPage={currentPage}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              totalItems={totalItems}
              totalPages={totalPages}
              loading={searchLoading}
            />
          </div>
        </>
      )}
    </div>
  )
})

export default TruckFinder;

