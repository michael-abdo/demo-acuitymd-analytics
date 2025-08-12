import DashboardClient from "./dashboard-client";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'View your document processing statistics and recent activity',
};

export default function Dashboard() {
  return <DashboardClient />;
}