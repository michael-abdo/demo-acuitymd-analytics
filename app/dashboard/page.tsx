"use client";

import TruckFinder from "@/components/truck-finder";
import { useSession } from "next-auth/react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { data: session } = useSession();
  const truckFinderRef = useRef<any>(null);

  // Handler to trigger reset in TruckFinder
  const handleClearSearch = () => {
    if (truckFinderRef.current && typeof truckFinderRef.current.handleReset === 'function') {
      truckFinderRef.current.handleReset();
    }
  };

  return (
    <main className="container mx-auto py-8 px-4 mt-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Find Similar Trucks</h1>
          <p className="text-gray-600">
            Welcome, {session?.user?.name || "User"}!
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleClearSearch} 
          className="flex items-center gap-2 border-gray-300 font-semibold"
        >
          Clear search
          <img src="/XCircle.svg" alt="Clear" className="h-5 w-5 ml-1" />
        </Button>
      </div>

      <div className="dashboard-content">
        <TruckFinder ref={truckFinderRef} />
      </div>
    </main>
  );
} 