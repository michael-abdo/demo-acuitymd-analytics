"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";
import Image from "next/image";

export default function SignOut() {
  useEffect(() => {
    signOut({ callbackUrl: "/" });
  }, []);
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-md text-center">
        <div className="flex flex-col items-center mb-8">
          <Image 
            src="/nda-analyzer/vvg-logo.jpg" 
            alt="Company Logo" 
            width={120} 
            height={120}
            className="mb-4"
          />
          <h1 className="text-2xl font-bold">Signing Out</h1>
          <p className="text-gray-500 mt-2">You are being signed out...</p>
        </div>
        
        <div className="mt-6">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    </div>
  );
} 