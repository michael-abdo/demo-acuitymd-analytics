"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { PageContainer } from "@/components/page-container";
import { PageTitle } from "@/components/page-title";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Activity, TrendingUp, ShieldCheck, Globe } from "lucide-react";

// ---- Hardcoded realistic MedTech data ----

interface Product {
  id: number;
  product_name: string;
  approval_date: string;
  market_region: string;
  units_sold: number;
  fda_status: string;
}

const PRODUCTS: Product[] = [
  { id: 1, product_name: "CardioFlow Stent Pro", approval_date: "2024-03-15", market_region: "North America", units_sold: 12500, fda_status: "Approved" },
  { id: 2, product_name: "NeuroGuide Catheter", approval_date: "2024-06-22", market_region: "North America", units_sold: 8300, fda_status: "Approved" },
  { id: 3, product_name: "OrthoFlex Implant X1", approval_date: "2024-01-10", market_region: "Europe", units_sold: 9400, fda_status: "Approved" },
  { id: 4, product_name: "VascuPatch Elite", approval_date: "2024-09-05", market_region: "Europe", units_sold: 6200, fda_status: "Approved" },
  { id: 5, product_name: "OptiScan Retinal", approval_date: "2025-01-18", market_region: "North America", units_sold: 4100, fda_status: "Approved" },
  { id: 6, product_name: "BioMesh Hernia System", approval_date: "2024-11-30", market_region: "Asia Pacific", units_sold: 3800, fda_status: "Approved" },
  { id: 7, product_name: "PulseTrack Monitor V3", approval_date: "2025-02-14", market_region: "North America", units_sold: 5600, fda_status: "Under Review" },
  { id: 8, product_name: "SpineAlign Rod System", approval_date: "2024-07-20", market_region: "Europe", units_sold: 7100, fda_status: "Approved" },
  { id: 9, product_name: "DermaSeal Wound Care", approval_date: "2024-04-12", market_region: "Asia Pacific", units_sold: 2900, fda_status: "Approved" },
  { id: 10, product_name: "AirWay Pro Ventilator", approval_date: "2025-03-01", market_region: "Latin America", units_sold: 1800, fda_status: "Submitted" },
  { id: 11, product_name: "GlucoSense Implant", approval_date: "2024-08-09", market_region: "North America", units_sold: 6800, fda_status: "Approved" },
  { id: 12, product_name: "RoboAssist Surgical", approval_date: "2024-05-28", market_region: "Europe", units_sold: 3200, fda_status: "Approved" },
  { id: 13, product_name: "ThermoGuard Ablation", approval_date: "2025-01-05", market_region: "Asia Pacific", units_sold: 2100, fda_status: "Under Review" },
  { id: 14, product_name: "ArthroView Scope HD", approval_date: "2024-10-17", market_region: "North America", units_sold: 4900, fda_status: "Approved" },
  { id: 15, product_name: "CeraCoat Hip System", approval_date: "2024-12-03", market_region: "Latin America", units_sold: 1500, fda_status: "Approved" },
  { id: 16, product_name: "NanoStent Coronary", approval_date: "2025-02-28", market_region: "North America", units_sold: 3400, fda_status: "Under Review" },
  { id: 17, product_name: "UltraSound Probe X", approval_date: "2024-02-20", market_region: "Europe", units_sold: 5800, fda_status: "Approved" },
  { id: 18, product_name: "BioValve Heart", approval_date: "2024-06-15", market_region: "Asia Pacific", units_sold: 2600, fda_status: "Approved" },
  { id: 19, product_name: "LaserCut Lithotripsy", approval_date: "2025-03-10", market_region: "Latin America", units_sold: 900, fda_status: "Submitted" },
  { id: 20, product_name: "SmartDrain CSF", approval_date: "2024-09-22", market_region: "North America", units_sold: 3700, fda_status: "Approved" },
];

const REGION_COLORS: Record<string, string> = {
  "North America": "#0A3161",
  "Europe": "#2dd4bf",
  "Asia Pacific": "#0ea5e9",
  "Latin America": "#eab308",
};

const STATUS_COLORS: Record<string, string> = {
  "Approved": "#10b981",
  "Under Review": "#f59e0b",
  "Submitted": "#6366f1",
};

export default function DashboardClient() {
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  const filteredProducts = useMemo(
    () => selectedRegion ? PRODUCTS.filter((p) => p.market_region === selectedRegion) : PRODUCTS,
    [selectedRegion]
  );

  // KPI computations
  const totalProducts = filteredProducts.length;
  const totalUnitsSold = filteredProducts.reduce((sum, p) => sum + p.units_sold, 0);
  const approvedCount = filteredProducts.filter((p) => p.fda_status === "Approved").length;
  const uniqueRegions = [...new Set(filteredProducts.map((p) => p.market_region))].length;

  // Bar chart data: units sold by region
  const regionData = useMemo(() => {
    const map = new Map<string, number>();
    filteredProducts.forEach((p) => {
      map.set(p.market_region, (map.get(p.market_region) || 0) + p.units_sold);
    });
    return Array.from(map.entries())
      .map(([region, units]) => ({ region, units }))
      .sort((a, b) => b.units - a.units);
  }, [filteredProducts]);

  // Pie chart data: FDA status breakdown
  const statusData = useMemo(() => {
    const map = new Map<string, number>();
    filteredProducts.forEach((p) => {
      map.set(p.fda_status, (map.get(p.fda_status) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [filteredProducts]);

  const handleBarClick = (data: { region?: string } | null | undefined) => {
    if (data?.region) {
      setSelectedRegion((prev) => (prev === data.region ? null : (data.region ?? null)));
    }
  };

  return (
    <PageContainer>
      <div className="flex items-center justify-between mb-6">
        <PageTitle description="Infrastructure platform for MedTech data and software applications">
          AcuityMD Dashboard
        </PageTitle>
        {selectedRegion && (
          <button
            onClick={() => setSelectedRegion(null)}
            className="text-sm text-blue-600 hover:underline"
          >
            Clear filter: {selectedRegion}
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalProducts}</div>
            <p className="text-xs text-muted-foreground">MedTech devices tracked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Units Sold</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalUnitsSold.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Across all regions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">FDA Approved</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{approvedCount}</div>
            <p className="text-xs text-muted-foreground">
              {totalProducts > 0
                ? `${Math.round((approvedCount / totalProducts) * 100)}% approval rate`
                : "No products"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Regions</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{uniqueRegions}</div>
            <p className="text-xs text-muted-foreground">Market coverage</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3 mb-8">
        {/* Bar Chart - Units by Region */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Units Sold by Region</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={regionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="region" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={((value: number) => [value.toLocaleString(), "Units Sold"]) as never}
                    contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                  />
                  <Bar
                    dataKey="units"
                    radius={[6, 6, 0, 0]}
                    cursor="pointer"
                    onClick={(_data: unknown, index: number) => handleBarClick(regionData[index])}
                  >
                    {regionData.map((entry) => (
                      <Cell
                        key={entry.region}
                        fill={REGION_COLORS[entry.region] || "#6b7280"}
                        opacity={selectedRegion && selectedRegion !== entry.region ? 0.3 : 1}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart - FDA Status */}
        <Card>
          <CardHeader>
            <CardTitle>FDA Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                    label={(({ name, percent }: { name: string; percent: number }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    ) as never}
                  >
                    {statusData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={STATUS_COLORS[entry.name] || "#6b7280"}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top Products by Unit Sales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Product</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Region</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">FDA Status</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Units Sold</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Approval Date</th>
                </tr>
              </thead>
              <tbody>
                {[...filteredProducts]
                  .sort((a, b) => b.units_sold - a.units_sold)
                  .slice(0, 10)
                  .map((p) => (
                    <tr key={p.id} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-4 font-medium">{p.product_name}</td>
                      <td className="py-3 px-4">
                        <span
                          className="inline-flex items-center gap-1.5"
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: REGION_COLORS[p.market_region] || "#6b7280" }}
                          />
                          {p.market_region}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className="px-2.5 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: `${STATUS_COLORS[p.fda_status] || "#6b7280"}20`,
                            color: STATUS_COLORS[p.fda_status] || "#6b7280",
                          }}
                        >
                          {p.fda_status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {p.units_sold.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {new Date(p.approval_date).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
