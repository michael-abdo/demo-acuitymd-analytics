# AcuityMD Demo — Infrastructure platform for MedTech data and software applications

## Demo: MedTech Insights Platform for AcuityMD

### Context
AcuityMD is a software and data platform that accelerates access to medical technologies. The Platform Team focuses on building infrastructure for MedTech data and software applications. This demo highlights how their platform can effectively visualize and manage MedTech product data, approval timelines, and market penetration, aligning with the company's mission to streamline access to medical technologies.

### What to Build
1. **MedTech Approval Visualization** - A timeline view of product approvals.
2. **Market Penetration Dashboard** - Dashboard showing sales data across regions.
3. **FDA Process Tracker** - Track and alert on the status of FDA approvals.

### Entities
For each entity, list the data model:

#### MedTechProduct (`medtech_product`)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| product_name | string | yes | Name of the MedTech product |
| approval_date | date | yes | Date of FDA approval |

#### ApprovalProcess (`approval_process`)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| stage_name | string | yes | Stage of the FDA approval process |
| start_date | date | yes | Start date of the process stage |

### Seed Data
Represents MedTech products and their approval processes across different regions, ensuring the demo feels realistic and alive.

Patterns:
- Approval timelines: 6-18 months with checkpoints
- Regional sales variations: higher in North America and Europe
- FDA status progression: 'Submitted' -> 'Under Review' -> 'Approved'

### Visualizations

#### /dashboard — Market Penetration Overview
- **Chart type**: KPI cards + bar chart
- **Library**: recharts
- **Data**: Sales and approval data across regions
- **Interactions**: Hover tooltips, click-to-filter by region

#### /approval-process — Approval Timeline
- **Chart type**: Timeline view
- **Library**: recharts
- **Data**: Approval process stages with dates
- **Interactions**: Drill-down into specific product timelines, alert on delays

### Stack
- Next.js 16 + TypeScript — full-stack framework with App Router
- Recharts — interactive chart library (already in template)
- Tailwind CSS — styling with company-branded color theme

### Deployment
- Platform: Vercel (one-click deploy)
- Database: PlanetScale (free tier)
- Seed: Auto-seeds on first run via /api/seed endpoint
- Env vars: DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL

### Branding
- Header: "AcuityMD MedTech Platform" with company's brand colors
- Color theme: Blue and green shades matching AcuityMD's branding
- Favicon: company logo

### Acceptance Criteria
- [ ] Dashboard loads with realistic seed data (not empty)
- [ ] All charts are interactive (hover tooltips, click-to-filter)
- [ ] Approval timeline reflects real FDA processes
- [ ] Market penetration data is regionally accurate
- [ ] Deploys to Vercel in one click from README
- [ ] Branded with company name and colors
