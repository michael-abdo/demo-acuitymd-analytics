"use client";

import { SessionProvider } from "next-auth/react";
import { config } from "@/lib/config";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider
      basePath={config.template.paths.api.auth}
      refetchInterval={0}
      refetchOnWindowFocus={false}
    >
      {children}
    </SessionProvider>
  );
}
