"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";
import Image from "next/image";
import { useBasePath } from "@/lib/hooks";

export default function SignOut() {
  const { assetPath, pagePath } = useBasePath();

  useEffect(() => {
    signOut({ callbackUrl: pagePath("/") });
  }, [pagePath]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="flex flex-col items-center">
          <Image
            src={assetPath("/vvg-logo.jpg")}
            alt="Company Logo"
            width={120}
            height={120}
            className="mb-4"
          />
          <h1 className="text-2xl font-semibold text-gray-900">Signing Out</h1>
          <p className="text-gray-500 mt-2">You are being signed out...</p>
        </div>

        <div className="mt-6">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    </div>
  );
}
