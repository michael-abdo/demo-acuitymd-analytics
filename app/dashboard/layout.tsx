"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { pagePath } from "@/lib/utils/path-utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // Client-side authentication check for dashboard layout
    if (status === "unauthenticated") {
      router.push(pagePath("/sign-in"));
    }
  }, [status, router]);

  // Show loading state while checking authentication
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Only render children if authenticated
  if (status === "authenticated") {
    return (
      <div className="dashboard-layout">
        <div className="p-4">
          {children}
        </div>
      </div>
    );
  }

  // Return null during redirect to prevent flash of content
  return null;
} 