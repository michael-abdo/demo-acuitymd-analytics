"use client";

import { SessionProvider } from "next-auth/react";
import { getAuthBasePath } from "@/lib/utils/path-utils";

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
