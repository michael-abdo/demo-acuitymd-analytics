# VVG Template

A secure Next.js 15 template with Azure AD authentication, MySQL database, and S3 storage.

## Quick Start (5 minutes)

### Prerequisites

- Node.js 18+ ([download](https://nodejs.org/))
- MySQL 8+ ([download](https://dev.mysql.com/downloads/mysql/))
- Azure AD app registration (see [Azure Setup](#azure-ad-setup) below)

### Option A: Automated Setup (Recommended)

```bash
# Clone the repo
git clone https://github.com/your-org/vvg-template.git
cd vvg-template

# Run setup (installs deps, creates .env, generates secrets)
npm run setup

# Edit .env with your Azure AD credentials and database password
nano .env  # or use your preferred editor

# Set up database
npm run db:setup

# Start development server
npm run dev
```

### Option B: Manual Setup

#### 1. Clone and Install

```bash
git clone https://github.com/your-org/vvg-template.git
cd vvg-template
npm install
```

#### 2. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Generate a secret
openssl rand -base64 32
```

Edit `.env` with your values:

```bash
# Required - paste your generated secret
NEXTAUTH_SECRET=your-generated-secret-here

# Required - from Azure AD app registration
AZURE_AD_CLIENT_ID=your-client-id
AZURE_AD_CLIENT_SECRET=your-client-secret
AZURE_AD_TENANT_ID=your-tenant-id

# Required - your database password
DATABASE_URL=mysql://root:YOUR_PASSWORD@localhost:3306/vvg_template
```

#### 3. Set Up Database

```bash
# Make sure MySQL is running, then:
npm run db:setup
```

#### 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Azure AD Setup

If you don't have an Azure AD app, follow these steps:

### Step 1: Go to Azure Portal

1. Go to [portal.azure.com](https://portal.azure.com)
2. Search for "App registrations"
3. Click "New registration"

### Step 2: Register Your App

| Field | Value |
|-------|-------|
| Name | `VVG Template (Dev)` |
| Supported account types | Single tenant (or your org) |
| Redirect URI | `http://localhost:3000/api/auth/callback/azure-ad` |

Click **Register**

### Step 3: Get Your Credentials

After registration, copy these values to your `.env`:

| Azure Portal | .env Variable |
|--------------|---------------|
| Application (client) ID | `AZURE_AD_CLIENT_ID` |
| Directory (tenant) ID | `AZURE_AD_TENANT_ID` |

### Step 4: Create Client Secret

1. Go to "Certificates & secrets"
2. Click "New client secret"
3. Add a description, select expiry
4. Click "Add"
5. **Copy the Value immediately** (you can't see it again!)
6. Paste into `.env` as `AZURE_AD_CLIENT_SECRET`

### Step 5: Add Redirect URI for Production

When deploying, add your production URL:
```
https://your-domain.com/api/auth/callback/azure-ad
```

---

## Environment Variables

### Required for All Environments

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXTAUTH_SECRET` | JWT signing secret (min 32 chars) | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Full URL of your app | `http://localhost:3000` |
| `AZURE_AD_CLIENT_ID` | Azure AD app client ID | `12345678-...` |
| `AZURE_AD_CLIENT_SECRET` | Azure AD app secret | `abc123~...` |
| `AZURE_AD_TENANT_ID` | Azure AD tenant ID | `87654321-...` |
| `DATABASE_URL` | MySQL connection string | `mysql://user:pass@host:3306/db` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `STORAGE_PROVIDER` | `local` or `s3` | `local` |
| `LOG_LEVEL` | `debug`, `info`, `warn`, `error` | `info` |

### S3 Storage (if using)

| Variable | Description |
|----------|-------------|
| `AWS_REGION` | AWS region |
| `AWS_ACCESS_KEY_ID` | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key |
| `S3_BUCKET_NAME` | S3 bucket name |

---

## Common Issues

### "NEXTAUTH_SECRET must be set in production"

Generate a secret:
```bash
openssl rand -base64 32
```
Add to `.env`:
```
NEXTAUTH_SECRET=your-generated-secret
```

### "Authentication required - no session found"

1. Check your Azure AD credentials in `.env`
2. Verify the redirect URI matches in Azure Portal
3. Clear browser cookies and try again

### "Database connection failed"

1. Ensure MySQL is running: `brew services start mysql` (Mac) or `sudo systemctl start mysql` (Linux)
2. Check your `DATABASE_URL` credentials
3. Verify the database exists: `mysql -u root -p -e "SHOW DATABASES;"`

### "CSRF validation failed"

For API calls, include the CSRF token:
```typescript
import { getCsrfToken } from 'next-auth/react';

const token = await getCsrfToken();
fetch('/api/documents', {
  method: 'POST',
  headers: { 'x-csrf-token': token || '' },
  body: JSON.stringify(data)
});
```

---

## Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Set strong `NEXTAUTH_SECRET` (32+ characters)
- [ ] Set `NEXTAUTH_URL` to your production domain
- [ ] Add production redirect URI in Azure AD
- [ ] Configure production database
- [ ] Set up S3 for file storage (recommended)

### Deploy to PM2 (Linux Server)

```bash
# Build
npm run build

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 process list
pm2 save
```

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

Add environment variables in Vercel dashboard.

---

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── dashboard/         # Dashboard page
│   └── documents/         # Documents page
├── components/            # React components
├── lib/
│   ├── api/              # API utilities (auth, CSRF)
│   ├── auth/             # Authentication
│   ├── database/         # Database connection
│   ├── repositories/     # Data access layer
│   ├── services/         # Business logic
│   └── validation/       # Input validation
└── types/                # TypeScript types
```

---

## Security Features

This template includes:

- CSRF protection on all API routes
- SQL injection prevention (parameterized queries)
- XSS protection (Content Security Policy)
- Secure session management (7-day JWT)
- Rate limiting (100 req/min)
- Input validation (email, file uploads)

See [docs/SECURITY.md](docs/SECURITY.md) for details.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run setup` | **First-time setup** (install deps, create .env) |
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run type-check` | Run TypeScript checks |
| `npm run lint` | Run ESLint |
| `npm run db:setup` | Create database tables |
| `npm run db:reset` | Drop and recreate database (⚠️ deletes data) |

---

## Support

- Issues: [GitHub Issues](https://github.com/your-org/vvg-template/issues)
- Security: See [SECURITY.md](docs/SECURITY.md)

---

## License

MIT
