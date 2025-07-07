"use client";

import { useEffect, useState } from "react";
import { signIn, getProviders } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { Suspense } from "react";

// Client component that uses useSearchParams
function SignInRedirect() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const [isRedirecting, setIsRedirecting] = useState(false);
  
  useEffect(() => {
    // Add a small delay and error handling to prevent infinite loops
    const handleSignIn = async () => {
      try {
        setIsRedirecting(true);
        const providers = await getProviders();
        
        if (providers && providers["azure-ad"]) {
          await signIn("azure-ad", { callbackUrl });
        } else {
          console.error("Azure AD provider not configured");
          // Fallback to dashboard if provider is not available
          window.location.href = callbackUrl;
        }
      } catch (error) {
        console.error("Sign-in error:", error);
        // Fallback to dashboard on error
        window.location.href = callbackUrl;
      }
    };

    // Add a small delay to prevent immediate execution during compilation
    const timer = setTimeout(handleSignIn, 100);
    return () => clearTimeout(timer);
  }, [callbackUrl]);
  
  return (
    <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-md text-center">
      <div className="flex flex-col items-center mb-8">
        <h1 className="text-2xl font-bold">
          {isRedirecting ? "Redirecting to Sign In" : "Preparing Sign In"}
        </h1>
        <p className="text-gray-500 mt-2">
          {isRedirecting 
            ? "You are being redirected to Microsoft for authentication..."
            : "Please wait while we prepare your authentication..."
          }
        </p>
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
      <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-md text-center">
        <h1 className="text-2xl font-bold mb-4">Sign In</h1>
        <p className="text-gray-500">Redirecting to authentication...</p>
        <div className="mt-6">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    </div>
  );
} 