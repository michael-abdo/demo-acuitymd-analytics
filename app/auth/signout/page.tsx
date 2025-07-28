"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";
import Image from "next/image";
import { CenteredFormLayout, CenteredTitle } from "@/components/ui";

export default function SignOut() {
  useEffect(() => {
    signOut({ callbackUrl: "/" });
  }, []);
  
  return (
    <CenteredFormLayout>
      <div className="flex flex-col items-center mb-8">
        <Image 
          src="/${PROJECT_NAME}/vvg-logo.jpg" 
          alt="Company Logo" 
          width={120} 
          height={120}
          className="mb-4"
        />
        <CenteredTitle>Signing Out</CenteredTitle>
        <p className="text-gray-500 mt-2">You are being signed out...</p>
      </div>
      
      <div className="mt-6">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    </CenteredFormLayout>
  );
} 