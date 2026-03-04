# AcuityMD — Infrastructure Platform For Medtech Data And Software Applications

![Dashboard Screenshot](docs/dashboard-screenshot.png)

> A working demo showcasing infrastructure platform for MedTech data and software applications,
> built with Next.js, TypeScript, Recharts, and Tailwind CSS.

**[Live Demo](https://demo-acuitymd-analytics.vercel.app)** ·
**[Source Code](https://github.com/vvgtruck/demo-acuitymd-analytics)**

## Why I Built This

AcuityMD is building the infrastructure platform for MedTech data and software applications. I wanted to demonstrate
that I understand the domain by building a working prototype
that showcases medtech product approval timeline visualization, market penetration analytics, and FDA process tracking with delay alerts.

## What It Does

- **MedTech Product Approval Timeline Visualization** — Interactive stacked bar charts showing FDA approval stages (Pre-Submission through Clearance) with duration tracking and delay alerts for overdue reviews
- **Market Penetration Dashboard for MedTech Devices** — KPI cards and region-filtered bar charts showing unit sales across North America, Europe, Asia Pacific, and Latin America with click-to-filter interactivity
- **FDA Approval Process Tracking with Alerts** — Real-time status cards per product with color-coded stage indicators (Completed, In Progress, Delayed, Pending) and automatic flagging when stages exceed 6-month targets

## Technical Decisions

| Choice | Why |
|--------|-----|
| Next.js 15 | Matches the team's stack — App Router with server components |
| TypeScript | Type safety for MedTech data models and FDA status enums |
| Recharts | Composable React chart library for interactive visualizations |
| Tailwind CSS | Rapid styling with AcuityMD brand color theming via CSS variables |
| Vercel | One-click deploy, free tier, instant preview URLs |

## Quick Start

```bash
git clone https://github.com/vvgtruck/demo-acuitymd-analytics
cd demo-acuitymd-analytics
npm install
cp .env.example .env  # fill in DATABASE_URL
npm run dev
```

Visit `http://localhost:3000` — click **Try Demo** to explore the dashboard.

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page with AcuityMD branding and Try Demo CTA |
| `/dashboard` | KPI cards + bar chart (units by region) + FDA status pie chart + top products table |
| `/approval-process` | Stacked timeline chart + per-product approval stage cards with delay alerts |
| `/api/seed` | Auto-seed endpoint (returns data summary) |
| `/api/health` | Health check |

## Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/vvgtruck/demo-acuitymd-analytics)

## Author

**Michael Abdo** — [GitHub](https://github.com/michael-abdo) · [LinkedIn](https://linkedin.com/in/michael-abdo)
