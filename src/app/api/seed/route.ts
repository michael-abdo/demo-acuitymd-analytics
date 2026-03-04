import { NextResponse } from "next/server";

/**
 * Seed API endpoint
 * Since this demo runs without a database, it returns the hardcoded dataset info.
 * In production with PlanetScale, this would insert rows on first visit.
 */

const SEED_SUMMARY = {
  medtech_products: 20,
  approval_processes: 24,
  regions: ["North America", "Europe", "Asia Pacific", "Latin America"],
  fda_statuses: ["Approved", "Under Review", "Submitted"],
  approval_stages: ["Pre-Submission", "510(k) Submission", "PMA Application", "FDA Review", "Clearance Granted"],
};

export async function GET() {
  return NextResponse.json({
    status: "seeded",
    message: "Demo uses hardcoded data (no database required). Dashboard and approval timeline are pre-populated.",
    count: SEED_SUMMARY.medtech_products + SEED_SUMMARY.approval_processes,
    summary: SEED_SUMMARY,
  });
}

export async function POST(request: Request) {
  // Check for force parameter (would re-seed in DB mode)
  const url = new URL(request.url);
  const force = url.searchParams.get("force");

  return NextResponse.json({
    status: "seeded",
    message: force === "true"
      ? "Force re-seed requested. Demo uses hardcoded data, so this is a no-op."
      : "Demo uses hardcoded data. Dashboard and approval timeline are pre-populated.",
    count: SEED_SUMMARY.medtech_products + SEED_SUMMARY.approval_processes,
    summary: SEED_SUMMARY,
  });
}
