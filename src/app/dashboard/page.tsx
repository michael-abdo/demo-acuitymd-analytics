import DashboardClient from "./dashboard-client";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'MedTech product analytics, market penetration, and FDA approval status overview',
};

export default function Dashboard() {
  return <DashboardClient />;
}
