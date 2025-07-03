"use client";

import { useEffect } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { Suspense } from "react";

// Client component that uses useSearchParams
function SignInRedirect() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  
  useEffect(() => {
    // Automatically redirect to Azure AD sign-in
    signIn("azure-ad", { callbackUrl });
  }, [callbackUrl]);
  
  return (
    <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-md text-center">
      <div className="flex flex-col items-center mb-8">
        <h1 className="text-2xl font-bold">Redirecting to Sign In</h1>
        <p className="text-gray-500 mt-2">You are being redirected to Microsoft for authentication...</p>
      </div>
      
      <div className="mt-6">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    </div>
  );
}

// Loading fallback for Suspense
function SignInLoading() {
  return (
    <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-md text-center">
      <div className="flex flex-col items-center mb-8">
        <div className="w-[120px] h-[120px] bg-gray-200 rounded-md animate-pulse mb-4" />
        <div className="h-8 bg-gray-200 rounded w-3/4 animate-pulse mx-auto" />
        <div className="h-4 bg-gray-200 rounded w-1/2 mt-2 animate-pulse mx-auto" />
      </div>
      <div className="mt-6">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-200 mx-auto"></div>
      </div>
    </div>
  );
}

// Main page component with Suspense
export default function SignIn() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <Suspense fallback={<SignInLoading />}>
        <SignInRedirect />
      </Suspense>
    </div>
  );
} 