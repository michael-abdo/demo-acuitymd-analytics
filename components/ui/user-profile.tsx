"use client";

import { useSession, signOut } from "next-auth/react";

export function UserProfile() {
  const { data: session } = useSession();

  return (
    <div className="flex items-center gap-2">
      <div className="text-sm">
        {session?.user?.name || "User"}
      </div>
      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        className="text-sm text-red-500 hover:text-red-700"
      >
        Logout
      </button>
    </div>
  );
} 