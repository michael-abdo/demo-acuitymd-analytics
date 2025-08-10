"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";
import { CenteredFormLayout, CenteredTitle } from "@/components/ui";
import { pagePath, assetPath } from "@/lib/utils/path-utils";
import Image from "next/image";

export default function SignOut() {
  useEffect(() => {
    signOut({ callbackUrl: pagePath("/") });
  }, []);
  
  return (
    <CenteredFormLayout>
      <div className="flex flex-col items-center mb-8">
        <Image 
          src={assetPath("/vvg-logo.jpg")} 
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