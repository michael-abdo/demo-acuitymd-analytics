# BUILD INSTRUCTIONS — AcuityMD Demo

**Repo:** `https://github.com/vvgtruck/demo-acuitymd-analytics`
**Category:** analytics
**Product:** Infrastructure platform for MedTech data and software applications
**Stack:** next.js, typescript, recharts, tailwind

## Already Scaffolded (DO NOT rebuild)

The repo is cloned from VVG template with these additions:

| Layer | Files | Status |
|-------|-------|--------|
| Auth | `src/lib/auth/`, `src/lib/api/with-auth.ts` | ✅ Working |
| Security | CSRF, rate limiting, CSP headers | ✅ Working |
| UI Kit | Radix + Tailwind (`src/components/ui/`) | ✅ Working |
| Entity: `medtech_product` | `database/entity-medtech_product.sql`, `src/lib/repositories/medtech_product.*`, `src/lib/services/medtech_product.*`, `src/app/api/medtech_products/`, `src/app/medtech_products/page.tsx` | ✅ CRUD working |
| Entity: `approval_process` | `database/entity-approval_process.sql`, `src/lib/repositories/approval_process.*`, `src/lib/services/approval_process.*`, `src/app/api/approval_processes/`, `src/app/approval_processes/page.tsx` | ✅ CRUD working |

## Step 0: Environment Setup

```bash
# Install dependencies
npm install

# Install visualization libraries
npm install recharts
```

**`.env` config** — copy `.env.example` to `.env`, then set:
```
NODE_ENV=development
ALLOW_TEST_AUTH=true
TEST_AUTH_SECRET=demo-test-secret-at-least-32-characters-long
NEXTAUTH_SECRET=demo-nextauth-secret-32-chars-minimum
NEXTAUTH_URL=http://localhost:3000
DATABASE_URL=mysql://root:rootpassword@localhost:3306/demo_acuitymd
```

**Create database and tables:**
```bash
mysql -e 'CREATE DATABASE IF NOT EXISTS demo_acuitymd;'
npm run db:setup
```

**Verify:** `npm run dev` → visit `http://localhost:3000/api/health` → `{"status":"ok"}`

## Step 1: Seed Script

**Create:** `scripts/seed.ts`

This is the most important step. Realistic data makes the demo impressive.

**Data description:** Represents MedTech products and their approval processes across different regions
**Volume:** 5,000 products with detailed approval timelines

**Patterns to implement:**
- Approval timelines: 6-18 months with checkpoints
- Regional sales variations: higher in North America and Europe
- FDA status progression: 'Submitted' -> 'Under Review' -> 'Approved'

**Tables to seed (in order, respect FK constraints):**

- `medtech_products` — fields: `product_name`, `approval_date`, `market_region`, `units_sold`, `fda_status`
- `approval_processes` — fields: `stage_name`, `start_date`, `end_date`, `status`, `responsible_person`

**Seed script pattern:**
```typescript
import mysql from 'mysql2/promise';
import { config } from 'dotenv';
config();

async function seed() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  // Clear existing data (reverse FK order)
  await conn.query('DELETE FROM approval_processes');
  await conn.query('DELETE FROM medtech_products');
  // Insert seed data (FK order)
  // TODO: Generate realistic medtech_products records
  // TODO: Generate realistic approval_processes records
  await conn.end();
  console.log('✅ Seeded!');
}
seed();
```

**Add to `package.json` scripts:**
```json
"seed": "npx tsx scripts/seed.ts"
```

**Verify:** `npm run seed` → outputs record counts. Query: `SELECT COUNT(*) FROM medtech_products` → should return > 0.

## Step 2: Seed API Endpoint

**Create:** `src/app/api/seed/route.ts`

Auto-seeds on first visit if DB is empty. This enables one-click deploy.

```typescript
// GET /api/seed → checks if data exists, seeds if empty
// POST /api/seed?force=true → re-seeds
```

**Verify:** `curl http://localhost:3000/api/seed` → `{"status":"seeded","count":N}`

## Step 3: Dashboard with Visualizations

**Replace:** `src/app/dashboard/dashboard-client.tsx`

This is the centerpiece. Replace the generic stats cards with domain-specific KPIs and charts.

**Visualizations to build:**

| # | Page | Chart Type | Library | Description |
|---|------|-----------|---------|-------------|
| 1 | `/dashboard` | KPI cards + bar chart | recharts | Overall sales and approval statuses with regional breakdown |
| 2 | `/approval-process` | timeline view | recharts | Visual representation of the product approval stages with alerts for delays |

**Interactions:**

**Dashboard layout pattern:**
```
┌─────────────────────────────────────────────┐
│  AcuityMD — Infrastructure platform for MedTech data │
├────────┬────────┬────────┬────────┬────────┤
│ KPI 1  │ KPI 2  │ KPI 3  │ KPI 4  │ [Ref] │
├────────┴────────┴────────┴────────┴────────┤
│  [KPI cards + bar chart]                    │
│  [timeline view]                            │
└─────────────────────────────────────────────┘
```

**Data sources:** Fetch from scaffolded API routes:
- `GET /api/medtech_products?pageSize=1000` → raw data for charts
- `GET /api/approval_processes?pageSize=1000` → raw data for charts

**Verify:** Dashboard loads with charts populated from seed data. All charts are interactive (hover tooltips, click filters).

## Step 4: Additional Visualization Pages

### `/approval-process`

**Create:** `src/app/approval-process/page.tsx`
**Chart type:** timeline view
**Description:** Visual representation of the product approval stages with alerts for delays
**Data:** `GET /api/medtech_products`

## Step 5: Guest Mode + Branding

### Guest Mode (CRITICAL — recruiters must access without signing in)

The landing page must have a **"Try Demo"** button that lets anyone explore the dashboard without authentication.

**Create:** `src/app/api/auth/guest/route.ts`

```typescript
// POST /api/auth/guest
// Sets a session cookie with a guest user identity
// Guest gets read-only access — can view dashboard and charts
// but cannot create/update/delete records
```

**Alternatively**, the simplest approach: make the dashboard and viz pages **public** (no auth required for GET).
Only protect write operations (POST/PUT/DELETE). This way the "Try Demo" button just links to `/dashboard`.

**Update `src/app/page.tsx`** landing page:
```tsx
// Add a prominent "Try Demo" button alongside "Get Started"
<Link href="/dashboard">
  <Button size="lg" variant="outline" className="gap-2">
    Try Demo <ArrowRight className="w-4 h-4" />
  </Button>
</Link>
```

**Verify:** Open an incognito window → visit landing page → click "Try Demo" → dashboard loads with charts. No login required.

### Branding

**Files to edit:**

1. **`src/app/layout.tsx`** — Update metadata:
   - `title.default` → `'AcuityMD Infrastructure Platform For Medtech Data And Software Applications'`
   - `title.template` → `'%s | AcuityMD'`
   - `description` → brief description of the demo
   - `authors` → `[{ name: 'Michael Abdo' }]`

2. **`src/styles/globals.css`** — Update CSS custom properties in `:root`:
   - `--primary` → company brand color (HSL)
   - `--chart-1` through `--chart-5` → complementary chart palette

3. **`src/app/page.tsx`** — Replace landing page:
   - Hero title → `'AcuityMD Infrastructure Platform For Medtech Data And Software Applications'`
   - Subtitle → brief product description
   - Feature cards → top 3 demo features
   - Tech badges → `["next.js", "typescript", "recharts", "tailwind"]`
   - Two CTAs: **'Open Dashboard'** (link to `/dashboard`) + **'Try Demo'** (same link, outlined)
   - Footer: `'AcuityMD Demo — Built by Michael Abdo'`

4. **`src/components/navbar.tsx`** — Update app name in navbar

## Step 6: Deploy to Vercel

**Create:** `vercel.json` in repo root:
```json
{
  "buildCommand": "npm run build",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": [
    "iad1"
  ]
}
```

**Database:** planetscale
**Auto-seed:** Yes — `/api/seed` runs on first visit

**Deploy commands:**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Set environment variables in Vercel dashboard:
# - DATABASE_URL
# - NEXTAUTH_SECRET
# - ALLOW_TEST_AUTH=true
# - TEST_AUTH_SECRET=<generated>
```

**Verify:** Visit deployed URL → landing page loads → click 'Try Demo' → dashboard renders with seed data.

## Step 7: CI/CD — GitHub Actions Auto-Deploy

**Create:** `.github/workflows/deploy.yml`

This auto-deploys to Vercel on every push to `main`. Hiring managers notice CI/CD setup — it signals production readiness.

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run type-check

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

**Required GitHub Secrets** (set in repo Settings → Secrets):
- `VERCEL_TOKEN` — from Vercel dashboard → Settings → Tokens
- `VERCEL_ORG_ID` — from `.vercel/project.json` after first deploy
- `VERCEL_PROJECT_ID` — same file

**Verify:** Push a commit → Actions tab shows green deploy → site updates automatically.

## Step 8: Screenshot + Case-Study README

Recruiters spend 5-10 seconds scanning a repo. The README must sell the project at a glance.

### Dashboard Screenshot

**After deploying**, capture the dashboard:

1. Open the deployed URL in Chrome
2. Navigate to `/dashboard`
3. Take a full-page screenshot (Cmd+Shift+P → 'Capture full size screenshot' in DevTools)
4. Save as `docs/dashboard-screenshot.png`
5. Optionally record a 15-second GIF showing chart interactions (hover, filter, drill-down)
   - Use a screen recording tool → convert to GIF
   - Save as `docs/demo.gif`

### Case-Study README

**Replace** `README.md` with this structure:

````markdown
# AcuityMD — Infrastructure Platform For Medtech Data And Software Applications

![Dashboard Screenshot](docs/dashboard-screenshot.png)

> A working demo showcasing Infrastructure platform for MedTech data and software applications,
> built with next.js, typescript, recharts, tailwind.

**[Live Demo](https://demo-acuitymd-analytics.vercel.app)** · 
**[Source Code](https://github.com/vvgtruck/demo-acuitymd-analytics)**

## Why I Built This

AcuityMD is building Infrastructure platform for MedTech data and software applications. I wanted to demonstrate
that I understand the domain by building a working prototype
that showcases medtech product approval timeline visualization.

## What It Does

- **Feature 1: MedTech product approval timeline visualization**
- **Feature 2: Market penetration dashboard for MedTech devices**
- **Feature 3: FDA approval process tracking with alerts**

## Technical Decisions

| Choice | Why |
|--------|-----|
| next.js | Matches the team's stack from the job description |
| typescript | Matches the team's stack from the job description |
| recharts | Matches the team's stack from the job description |
| tailwind | Matches the team's stack from the job description |
| Vercel | One-click deploy, free tier, instant preview URLs |

## Quick Start

```bash
git clone https://github.com/vvgtruck/demo-acuitymd-analytics
cd demo-acuitymd-analytics
npm install
cp .env.example .env  # fill in DATABASE_URL
npm run db:setup
npm run seed
npm run dev
```

## Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/vvgtruck/demo-acuitymd-analytics)

## Author

**Michael Abdo** — [GitHub](https://github.com/michael-abdo) · [LinkedIn](https://linkedin.com/in/michael-abdo)
````

**Key elements:**
- Hero screenshot at the top (first thing recruiters see)
- Live demo link (clickable, no setup required)
- "Why I Built This" section (shows initiative and domain understanding)
- Technical decisions table (shows engineering judgment)
- One-click deploy button (shows production thinking)
- Author section with links

## Acceptance Criteria

The demo is DONE when ALL of these pass:

**Core:**
- [ ] `npm run seed` inserts realistic data (not lorem ipsum)
- [ ] Dashboard at `/dashboard` shows KPI cards with computed metrics
- [ ] `/dashboard` has interactive KPI cards + bar chart (hover, click, filter)
- [ ] `/approval-process` has interactive timeline view (hover, click, filter)
- [ ] All entity CRUD endpoints return valid JSON

**Guest Mode + Branding:**
- [ ] Landing page branded as 'AcuityMD' with company colors
- [ ] 'Try Demo' button on landing page → dashboard loads without login
- [ ] Incognito window can access dashboard (no auth wall)

**Deployment:**
- [ ] Deployed URL returns 200 and renders dashboard with data
- [ ] `/api/seed` auto-seeds if DB is empty on first deploy
- [ ] `.github/workflows/deploy.yml` exists and runs on push

**README:**
- [ ] `docs/dashboard-screenshot.png` exists and is embedded in README
- [ ] README has 'Why I Built This' section
- [ ] README has live demo link + deploy button
- [ ] README has author section with GitHub + LinkedIn links

**Domain-Specific:**
- [ ] Feature 1: MedTech product approval timeline visualization
- [ ] Feature 2: Market penetration dashboard for MedTech devices
- [ ] Feature 3: FDA approval process tracking with alerts

---

## Reference: Original Brief

<details>
<summary>Click to expand full brief</summary>

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

</details>