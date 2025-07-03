"use client";

import TruckFinder from "@/components/truck-finder"
import Image from "next/image"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function Home() {
  const { status } = useSession();
  const router = useRouter();
  
  useEffect(() => {
    // Redirect authenticated users to dashboard
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);
  
  // Only show the public page content to unauthenticated users
  return (
    <main className="container mx-auto py-8 px-4">
      <div className="flex items-center mb-8">
        <Image 
          src="/vvg-logo.jpg" 
          alt="Truck Finder Logo" 
          width={100} 
          height={100}
          className="mr-3"
        />
        <h1 className="text-3xl font-bold">Truck Finder</h1>
      </div>

      {/* Only show truck finder to authenticated users */}
      {status === "authenticated" ? (
        <div className="animate-pulse rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
      ) : (
        <div>
          <p className="mb-4">Please sign in to access the Truck Finder tool.</p>
        </div>
      )}
    </main>
  )
}

