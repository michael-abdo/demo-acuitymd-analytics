"use client";

import { SessionProvider } from "next-auth/react";

// Get basePath from environment variable
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider
      basePath={`${basePath}/api/auth`}
      refetchInterval={0}
      refetchOnWindowFocus={false}
    >
      {children}
    </SessionProvider>
  );
}
