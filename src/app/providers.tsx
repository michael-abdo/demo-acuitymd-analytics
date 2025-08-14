"use client";

import { SessionProvider } from "next-auth/react";
import { getAuthBasePath } from "@/lib/auth-client-utils";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider
      basePath={getAuthBasePath()}
      refetchInterval={0}
      refetchOnWindowFocus={false}
    >
      {children}
    </SessionProvider>
  );
}
