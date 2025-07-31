import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import { pagePath } from "@/lib/utils/path-utils";
import DashboardClient from "./dashboard-client";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'View your document processing statistics and recent activity',
};

export default async function Dashboard() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect(pagePath("/sign-in"));
  }

  return <DashboardClient />;
}