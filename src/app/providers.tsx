"use client";

import { SessionProvider } from "next-auth/react";
import { NEXTAUTH_BASE_PATH } from "@/lib/client-config";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider
      basePath={NEXTAUTH_BASE_PATH}
      refetchInterval={0}
      refetchOnWindowFocus={false}
    >
      {children}
    </SessionProvider>
  );
}
