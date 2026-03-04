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
  Legend,
} from "recharts";
import { AlertTriangle, CheckCircle, Clock, FileSearch } from "lucide-react";

// ---- Hardcoded realistic FDA approval process data ----

interface ApprovalStage {
  id: number;
  product_name: string;
  stage_name: string;
  start_date: string;
  end_date: string | null;
  status: "Completed" | "In Progress" | "Delayed" | "Pending";
  responsible_person: string;
  duration_days: number;
}

const APPROVAL_DATA: ApprovalStage[] = [
  // CardioFlow Stent Pro - fully approved
  { id: 1, product_name: "CardioFlow Stent Pro", stage_name: "Pre-Submission", start_date: "2023-06-01", end_date: "2023-08-15", status: "Completed", responsible_person: "Dr. Sarah Chen", duration_days: 75 },
  { id: 2, product_name: "CardioFlow Stent Pro", stage_name: "510(k) Submission", start_date: "2023-08-16", end_date: "2023-09-01", status: "Completed", responsible_person: "Regulatory Team A", duration_days: 16 },
  { id: 3, product_name: "CardioFlow Stent Pro", stage_name: "FDA Review", start_date: "2023-09-02", end_date: "2024-01-20", status: "Completed", responsible_person: "FDA CDRH", duration_days: 140 },
  { id: 4, product_name: "CardioFlow Stent Pro", stage_name: "Clearance Granted", start_date: "2024-01-21", end_date: "2024-03-15", status: "Completed", responsible_person: "Compliance", duration_days: 54 },

  // NeuroGuide Catheter - fully approved
  { id: 5, product_name: "NeuroGuide Catheter", stage_name: "Pre-Submission", start_date: "2023-09-10", end_date: "2023-12-01", status: "Completed", responsible_person: "Dr. James Patel", duration_days: 82 },
  { id: 6, product_name: "NeuroGuide Catheter", stage_name: "PMA Application", start_date: "2023-12-02", end_date: "2024-01-15", status: "Completed", responsible_person: "Regulatory Team B", duration_days: 44 },
  { id: 7, product_name: "NeuroGuide Catheter", stage_name: "FDA Review", start_date: "2024-01-16", end_date: "2024-05-10", status: "Completed", responsible_person: "FDA CDRH", duration_days: 115 },
  { id: 8, product_name: "NeuroGuide Catheter", stage_name: "Clearance Granted", start_date: "2024-05-11", end_date: "2024-06-22", status: "Completed", responsible_person: "Compliance", duration_days: 42 },

  // PulseTrack Monitor - under review (delayed)
  { id: 9, product_name: "PulseTrack Monitor V3", stage_name: "Pre-Submission", start_date: "2024-03-01", end_date: "2024-06-15", status: "Completed", responsible_person: "Dr. Lisa Wong", duration_days: 106 },
  { id: 10, product_name: "PulseTrack Monitor V3", stage_name: "510(k) Submission", start_date: "2024-06-16", end_date: "2024-07-01", status: "Completed", responsible_person: "Regulatory Team A", duration_days: 15 },
  { id: 11, product_name: "PulseTrack Monitor V3", stage_name: "FDA Review", start_date: "2024-07-02", end_date: null, status: "Delayed", responsible_person: "FDA CDRH", duration_days: 245 },
  { id: 12, product_name: "PulseTrack Monitor V3", stage_name: "Clearance Granted", start_date: "", end_date: null, status: "Pending", responsible_person: "TBD", duration_days: 0 },

  // NanoStent Coronary - under review
  { id: 13, product_name: "NanoStent Coronary", stage_name: "Pre-Submission", start_date: "2024-05-01", end_date: "2024-08-20", status: "Completed", responsible_person: "Dr. Raj Kumar", duration_days: 111 },
  { id: 14, product_name: "NanoStent Coronary", stage_name: "PMA Application", start_date: "2024-08-21", end_date: "2024-09-15", status: "Completed", responsible_person: "Regulatory Team C", duration_days: 25 },
  { id: 15, product_name: "NanoStent Coronary", stage_name: "FDA Review", start_date: "2024-09-16", end_date: null, status: "In Progress", responsible_person: "FDA CDRH", duration_days: 170 },
  { id: 16, product_name: "NanoStent Coronary", stage_name: "Clearance Granted", start_date: "", end_date: null, status: "Pending", responsible_person: "TBD", duration_days: 0 },

  // AirWay Pro - submitted recently
  { id: 17, product_name: "AirWay Pro Ventilator", stage_name: "Pre-Submission", start_date: "2024-08-01", end_date: "2024-11-15", status: "Completed", responsible_person: "Dr. Emily Brooks", duration_days: 106 },
  { id: 18, product_name: "AirWay Pro Ventilator", stage_name: "510(k) Submission", start_date: "2024-11-16", end_date: "2024-12-01", status: "Completed", responsible_person: "Regulatory Team B", duration_days: 15 },
  { id: 19, product_name: "AirWay Pro Ventilator", stage_name: "FDA Review", start_date: "2024-12-02", end_date: null, status: "In Progress", responsible_person: "FDA CDRH", duration_days: 93 },
  { id: 20, product_name: "AirWay Pro Ventilator", stage_name: "Clearance Granted", start_date: "", end_date: null, status: "Pending", responsible_person: "TBD", duration_days: 0 },

  // ThermoGuard Ablation - delayed
  { id: 21, product_name: "ThermoGuard Ablation", stage_name: "Pre-Submission", start_date: "2024-01-15", end_date: "2024-05-01", status: "Completed", responsible_person: "Dr. Mark Stevens", duration_days: 107 },
  { id: 22, product_name: "ThermoGuard Ablation", stage_name: "PMA Application", start_date: "2024-05-02", end_date: "2024-06-10", status: "Completed", responsible_person: "Regulatory Team A", duration_days: 39 },
  { id: 23, product_name: "ThermoGuard Ablation", stage_name: "FDA Review", start_date: "2024-06-11", end_date: null, status: "Delayed", responsible_person: "FDA CDRH", duration_days: 267 },
  { id: 24, product_name: "ThermoGuard Ablation", stage_name: "Clearance Granted", start_date: "", end_date: null, status: "Pending", responsible_person: "TBD", duration_days: 0 },
];

const STATUS_COLORS: Record<string, string> = {
  Completed: "#10b981",
  "In Progress": "#0ea5e9",
  Delayed: "#ef4444",
  Pending: "#9ca3af",
};

const STAGE_ORDER = ["Pre-Submission", "510(k) Submission", "PMA Application", "FDA Review", "Clearance Granted"];

export default function ApprovalProcessPage() {
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

  const products = useMemo(() => {
    return [...new Set(APPROVAL_DATA.map((s) => s.product_name))];
  }, []);

  // KPIs
  const totalProcesses = products.length;
  const completedProducts = products.filter((name) => {
    const stages = APPROVAL_DATA.filter((s) => s.product_name === name);
    return stages.every((s) => s.status === "Completed");
  }).length;
  const delayedCount = APPROVAL_DATA.filter((s) => s.status === "Delayed").length;
  const inProgressCount = APPROVAL_DATA.filter((s) => s.status === "In Progress").length;

  // Timeline chart data: duration by stage for each product (horizontal bar chart)
  const timelineData = useMemo(() => {
    const targetProducts = selectedProduct ? [selectedProduct] : products;
    return targetProducts.map((name) => {
      const stages = APPROVAL_DATA.filter((s) => s.product_name === name);
      const result: Record<string, string | number> = { product: name.length > 20 ? name.slice(0, 18) + "..." : name };
      stages.forEach((s) => {
        const key = s.stage_name;
        result[key] = s.duration_days;
      });
      return result;
    });
  }, [products, selectedProduct]);

  // All unique stage names in order
  const stageNames = useMemo(() => {
    const names = [...new Set(APPROVAL_DATA.map((s) => s.stage_name))];
    return STAGE_ORDER.filter((s) => names.includes(s));
  }, []);

  const stageColors = ["#0A3161", "#2dd4bf", "#0ea5e9", "#f59e0b", "#10b981"];

  return (
    <PageContainer>
      <div className="flex items-center justify-between mb-6">
        <PageTitle description="Visual timeline of FDA product approval stages with delay alerts">
          Approval Timeline
        </PageTitle>
        {selectedProduct && (
          <button
            onClick={() => setSelectedProduct(null)}
            className="text-sm text-blue-600 hover:underline"
          >
            Show all products
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Processes</CardTitle>
            <FileSearch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalProcesses}</div>
            <p className="text-xs text-muted-foreground">Products in pipeline</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Fully Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{completedProducts}</div>
            <p className="text-xs text-muted-foreground">Clearance granted</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{inProgressCount}</div>
            <p className="text-xs text-muted-foreground">Active review stages</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Delayed</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{delayedCount}</div>
            <p className="text-xs text-muted-foreground">Stages exceeding timeline</p>
          </CardContent>
        </Card>
      </div>

      {/* Stacked Bar Chart - Timeline by Product */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Approval Duration by Stage (Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timelineData} layout="vertical" barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" tick={{ fontSize: 12 }} label={{ value: "Days", position: "insideBottom", offset: -5 }} />
                <YAxis type="category" dataKey="product" width={150} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                  formatter={((value: number) => [`${value} days`, ""]) as never}
                />
                <Legend />
                {stageNames.map((stage, i) => (
                  <Bar
                    key={stage}
                    dataKey={stage}
                    stackId="timeline"
                    fill={stageColors[i % stageColors.length]}
                    radius={i === stageNames.length - 1 ? [0, 4, 4, 0] : [0, 0, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Product Timeline Detail Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {products.map((productName) => {
          const stages = APPROVAL_DATA.filter((s) => s.product_name === productName);
          const hasDelay = stages.some((s) => s.status === "Delayed");
          const isComplete = stages.every((s) => s.status === "Completed");

          return (
            <Card
              key={productName}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                selectedProduct === productName ? "ring-2 ring-blue-500" : ""
              } ${hasDelay ? "border-red-200" : ""}`}
              onClick={() =>
                setSelectedProduct((prev) => (prev === productName ? null : productName))
              }
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{productName}</CardTitle>
                  {hasDelay && (
                    <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full">
                      <AlertTriangle className="w-3 h-3" />
                      Delayed
                    </span>
                  )}
                  {isComplete && (
                    <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                      <CheckCircle className="w-3 h-3" />
                      Approved
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stages.map((stage) => (
                    <div key={stage.id} className="flex items-center gap-3">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: STATUS_COLORS[stage.status] }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium truncate">
                            {stage.stage_name}
                          </span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {stage.duration_days > 0 ? `${stage.duration_days}d` : "--"}
                          </span>
                        </div>
                        {stage.duration_days > 180 && stage.status !== "Completed" && (
                          <p className="text-xs text-red-500 mt-0.5">
                            Exceeds 6-month target
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-3 border-t">
                  <p className="text-xs text-muted-foreground">
                    Total: {stages.reduce((sum, s) => sum + s.duration_days, 0)} days
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </PageContainer>
  );
}
