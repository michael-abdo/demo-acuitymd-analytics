import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import DashboardClient from "./dashboard-client";

export default async function Dashboard() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect("/${PROJECT_NAME}/sign-in");
  }

  return <DashboardClient />;
}