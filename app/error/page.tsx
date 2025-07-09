"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const errorMessages: Record<string, { title: string; description: string }> = {
    OAuthCallback: {
      title: "Authentication Callback Error",
      description: "There was a problem with the authentication callback. This usually happens when the redirect URI in your identity provider doesn't match the application configuration. Please contact your administrator."
    },
    Configuration: {
      title: "Configuration Error",
      description: "There is a configuration issue with the authentication system. Please contact your administrator."
    },
    AccessDenied: {
      title: "Access Denied",
      description: "You do not have permission to access this application. Please contact your administrator if you believe this is an error."
    },
    Default: {
      title: "Authentication Error",
      description: "An unexpected error occurred during authentication. Please try again or contact your administrator if the problem persists."
    }
  };

  const errorInfo = errorMessages[error || "Default"] || errorMessages.Default;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-md">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">{errorInfo.title}</h1>
          <p className="text-gray-600 mb-6">{errorInfo.description}</p>
          {error === "OAuthCallback" && (
            <div className="mt-4 p-4 bg-gray-100 rounded text-sm text-gray-700">
              <p className="font-semibold">For administrators:</p>
              <p className="mt-2">Ensure your Azure AD redirect URI is set to:</p>
              <code className="block mt-2 p-2 bg-gray-200 rounded text-xs break-all">
                https://legal.vtc.systems/nda-analyzer/api/auth/callback/azure-ad
              </code>
            </div>
          )}
          <Link
            href="/sign-in"
            className="mt-6 inline-block px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Try Again
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ErrorPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ErrorContent />
    </Suspense>
  );
}
