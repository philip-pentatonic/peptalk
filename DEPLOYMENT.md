# PepTalk Production Deployment Guide

**Last Updated:** November 6, 2025
**Status:** Complete deployment instructions for all services

---

## Overview

PepTalk runs on a multi-service architecture:

- **Cloudflare Workers** - API backend (`peptalk-api`)
- **Cloudflare Pages** - Next.js frontend (`peptalk`)
- **Fly.io** - Research pipeline Docker service (`peptalk-research`)

All services are in production and actively serving users.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Cloudflare Workers API](#cloudflare-workers-api)
3. [Cloudflare Pages Frontend](#cloudflare-pages-frontend)
4. [Fly.io Research Pipeline](#flyio-research-pipeline)
5. [Environment Variables](#environment-variables)
6. [Database Migrations](#database-migrations)
7. [Verification](#verification)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Accounts

1. **Cloudflare Account**
   - Sign up: https://dash.cloudflare.com/sign-up
   - Services used: Workers, Pages, D1, R2, KV

2. **Fly.io Account**
   - Sign up: https://fly.io/app/sign-up
   - Used for: Research pipeline Docker service

3. **API Keys**
   - Anthropic (Claude): https://console.anthropic.com/settings/keys
   - PubMed API: https://www.ncbi.nlm.nih.gov/account/settings/
   - Stripe: https://dashboard.stripe.com/apikeys
   - Resend: https://resend.com/api-keys

### Required CLI Tools

```bash
# Install Wrangler (Cloudflare CLI)
npm install -g wrangler

# Install Flyctl (Fly.io CLI)
brew install flyctl
# OR
curl -L https://fly.io/install.sh | sh

# Authenticate
wrangler login
flyctl auth login
```

---

## Cloudflare Workers API

The Workers API serves all backend endpoints and connects to D1 database and R2 storage.

### Current Production Details

- **URL:** https://peptalk-api.polished-glitter-23bb.workers.dev
- **Latest Version:** d1db8d12-3805-4bf8-ad42-cb45170eab0e
- **Account ID:** ec358c7d7cf76532fe1a4160b10a8247

### Step 1: Configure wrangler.toml

The configuration is already set up in `apps/workers/wrangler.toml`:

```toml
name = "peptalk-api"
main = "src/index.ts"
compatibility_date = "2024-11-06"

[[d1_databases]]
binding = "DB"
database_name = "peptalk-db"
database_id = "YOUR_DATABASE_ID"

[[r2_buckets]]
binding = "STORAGE"
bucket_name = "peptalk-pdfs"

[[kv_namespaces]]
binding = "RATE_LIMIT"
id = "YOUR_KV_ID"
```

### Step 2: Set Required Secrets

```bash
cd apps/workers

# Generate and set JWT secret
openssl rand -base64 32 | wrangler secret put JWT_SECRET

# Set internal API secret for research pipeline
openssl rand -base64 32 | wrangler secret put INTERNAL_API_SECRET

# Set Stripe keys
wrangler secret put STRIPE_API_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET

# Set Resend for emails
wrangler secret put RESEND_API_KEY
```

**Note:** Save the `INTERNAL_API_SECRET` value - you'll need it for the Fly.io deployment.

### Step 3: Deploy

```bash
cd apps/workers

# Build
pnpm install
pnpm build

# Deploy to production
CLOUDFLARE_API_TOKEN=wu3jlNwotf9SMbJmHvxdZ2GSjx4TIS48GJ5Vtv_m wrangler deploy --env=""
```

**Important:** Use the API token with "Edit Cloudflare Workers" template permissions.

### Step 4: Verify Deployment

```bash
# Check health endpoint
curl https://peptalk-api.polished-glitter-23bb.workers.dev/

# Should return: {"status":"ok","version":"...","timestamp":"..."}

# Check peptides endpoint
curl https://peptalk-api.polished-glitter-23bb.workers.dev/api/peptides

# Check specific peptide with plain language summaries
curl https://peptalk-api.polished-glitter-23bb.workers.dev/api/peptides/bpc-157 | jq '.sections[0].plainLanguageSummary'
```

---

## Cloudflare Pages Frontend

The Next.js frontend is deployed to Cloudflare Pages and serves the user-facing site.

### Current Production Details

- **Project Name:** `peptalk`
- **Framework:** Next.js 14
- **Build Command:** `pnpm build`

### Method 1: Deploy via Cloudflare Dashboard (Recommended)

This is the easiest method if you have the project connected to GitHub.

1. Go to https://dash.cloudflare.com → Pages
2. Select your `peptalk` project (or create it if first time)
3. Click "Create deployment"
4. Select the branch to deploy (usually `main`)
5. Cloudflare will automatically build and deploy

**Build Configuration (if setting up for first time):**
- Framework preset: Next.js
- Build command: `cd apps/web && pnpm install && pnpm build`
- Build output directory: `apps/web/.next`
- Root directory: `/`

### Method 2: Deploy via Wrangler CLI

For manual deployments or CI/CD:

```bash
cd apps/web

# Install dependencies
pnpm install

# Build the Next.js app
pnpm build

# Deploy to Cloudflare Pages
wrangler pages deploy .next --project-name=peptalk
```

**Note:** This method requires `@cloudflare/next-on-pages` for proper Next.js support on Cloudflare Pages.

### Set Environment Variables

In Cloudflare Dashboard → Pages → peptalk → Settings → Environment variables:

**Production:**
```
NEXT_PUBLIC_API_URL=https://peptalk-api.polished-glitter-23bb.workers.dev
```

**Preview/Development:**
```
NEXT_PUBLIC_API_URL=http://localhost:8787
```

### Troubleshooting: File Size Limits

If you encounter "file too large" errors (webpack cache > 25 MiB):

```bash
cd apps/web

# Clean build artifacts
rm -rf .next

# Rebuild
pnpm build

# Deploy only the necessary files
wrangler pages deploy .next/standalone --project-name=peptalk
```

Or use the `@cloudflare/next-on-pages` adapter:

```bash
# Install adapter
pnpm add -D @cloudflare/next-on-pages

# Build with adapter
npx @cloudflare/next-on-pages

# Deploy
wrangler pages deploy .vercel/output/static --project-name=peptalk
```

---

## Fly.io Research Pipeline

The research pipeline runs as a long-lived Docker service on Fly.io, processing peptide research requests.

### Current Production Details

- **App Name:** `peptalk-research`
- **Region:** San Jose (sjc)
- **Memory:** 1GB
- **URL:** Internal service (not publicly accessible)

### Step 1: Configure fly.toml

The configuration is already set up in `fly.toml`:

```toml
app = "peptalk-research"
primary_region = "sjc"

[build]
  dockerfile = "Dockerfile.research"

[env]
  PORT = "3000"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = "off"
  auto_start_machines = true
  min_machines_running = 1

[[vm]]
  memory = '1gb'
  cpu_kind = 'shared'
  cpus = 1
```

### Step 2: Set Secrets

```bash
# Set all required environment variables as secrets
flyctl secrets set \
  ANTHROPIC_API_KEY="sk-ant-api03-xxx" \
  PUBMED_EMAIL="support@machinegenie.ai" \
  PUBMED_API_KEY="d0ea595e7682ffd69033c5ce732e17be1508" \
  INTERNAL_API_SECRET="objnZMN36dBrepFryEdSyCmcD8PYV2PS7X11UBAKsDc=" \
  API_URL="https://peptalk-api.polished-glitter-23bb.workers.dev"
```

**Critical:** The `INTERNAL_API_SECRET` must match the secret set in Cloudflare Workers.

### Step 3: Deploy

```bash
# Build and deploy to Fly.io
flyctl deploy

# This will:
# 1. Build the Docker image (Dockerfile.research)
# 2. Push to Fly.io registry
# 3. Deploy to production
# 4. Start the service
```

### Step 4: Monitor Deployment

```bash
# Check deployment status
flyctl status

# View logs
flyctl logs

# Check machine status
flyctl machine list

# SSH into machine (if needed)
flyctl ssh console
```

### Step 5: Trigger Research Processing

The research pipeline exposes an HTTP endpoint for processing peptides:

```bash
# Process a peptide
curl -X POST https://peptalk-research.fly.dev/process \
  -H "Content-Type: application/json" \
  -d '{
    "peptideId": "bpc-157",
    "name": "BPC-157",
    "aliases": ["Body Protection Compound"],
    "force": true
  }'
```

**Note:** The service includes the plain language summary generation feature (2-pass synthesis with Claude Sonnet 4.5).

---

## Environment Variables

Complete list of environment variables for all services.

### Cloudflare Workers (API)

**Secrets (set via `wrangler secret put`):**
```
JWT_SECRET=<generated-with-openssl-rand-base64-32>
INTERNAL_API_SECRET=<generated-with-openssl-rand-base64-32>
STRIPE_API_KEY=sk_live_xxx (or sk_test_xxx for testing)
STRIPE_WEBHOOK_SECRET=whsec_xxx
RESEND_API_KEY=re_xxx
```

**Public Variables (wrangler.toml):**
```toml
[vars]
ENVIRONMENT = "production"
```

### Cloudflare Pages (Frontend)

**Environment Variables (Cloudflare Dashboard):**
```
NEXT_PUBLIC_API_URL=https://peptalk-api.polished-glitter-23bb.workers.dev
```

### Fly.io (Research Pipeline)

**Secrets (set via `flyctl secrets set`):**
```
ANTHROPIC_API_KEY=sk-ant-api03-xxx
OPENAI_API_KEY=sk-xxx (optional, for GPT-5 compliance validation)
PUBMED_EMAIL=your@email.com
PUBMED_API_KEY=xxx (optional but recommended)
INTERNAL_API_SECRET=<same-as-workers>
API_URL=https://peptalk-api.polished-glitter-23bb.workers.dev
```

**Public Variables (fly.toml):**
```toml
[env]
PORT = "3000"
```

---

## Database Migrations

### Current Database

- **Name:** `peptalk-db`
- **Type:** Cloudflare D1 (SQLite)
- **Migrations Applied:**
  - 0001-initial.sql
  - 0002-sample-data.sql
  - 0003-auth-subscriptions.sql
  - 0004-add-plain-language-summaries.sql

### Applying New Migrations

```bash
cd apps/workers

# List all databases
wrangler d1 list

# Apply migration to remote database
wrangler d1 execute peptalk-db \
  --remote \
  --file=../../packages/database/migrations/0005-your-migration.sql

# Verify migration
wrangler d1 execute peptalk-db \
  --remote \
  --command="SELECT name FROM sqlite_master WHERE type='table'"
```

### Creating New Migrations

1. Create SQL file in `packages/database/migrations/`
2. Name with sequential number: `000X-description.sql`
3. Test locally first:
   ```bash
   wrangler d1 execute peptalk-db --local --file=migration.sql
   ```
4. Apply to production after testing
5. Update this documentation

---

## Verification

### Complete Deployment Checklist

After deploying all services, verify:

**Cloudflare Workers API:**
- [ ] Health endpoint returns 200: `curl https://peptalk-api.polished-glitter-23bb.workers.dev/`
- [ ] Peptides endpoint works: `curl https://peptalk-api.polished-glitter-23bb.workers.dev/api/peptides`
- [ ] Plain language summaries present: Check `plainLanguageSummary` field in peptide response
- [ ] Database connection works
- [ ] R2 bucket accessible

**Cloudflare Pages Frontend:**
- [ ] Site loads: Visit https://your-project.pages.dev
- [ ] API calls work (check browser console)
- [ ] Peptide detail pages render
- [ ] Plain language summaries display in green callout boxes
- [ ] Authentication flow works

**Fly.io Research Pipeline:**
- [ ] Service is running: `flyctl status`
- [ ] Logs show no errors: `flyctl logs`
- [ ] Can process peptide requests
- [ ] Plain language summaries generate correctly
- [ ] Data writes to Workers API successfully

### Test Complete Flow

```bash
# 1. Process a peptide through research pipeline
curl -X POST https://peptalk-research.fly.dev/process \
  -H "Content-Type: application/json" \
  -d '{
    "peptideId": "test-peptide",
    "name": "Test Peptide",
    "aliases": [],
    "force": true
  }'

# 2. Check if data appears in API
curl https://peptalk-api.polished-glitter-23bb.workers.dev/api/peptides/test-peptide

# 3. Visit frontend to see rendered page
# https://your-site.pages.dev/peptides/test-peptide
```

---

## Troubleshooting

### Workers Deployment Issues

**Error: "Authentication error [code: 10000]"**

Your API token lacks permissions. Create a new token with "Edit Cloudflare Workers" template:

1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Click "Create Token"
3. Use "Edit Cloudflare Workers" template
4. This includes: Workers Scripts Edit, D1 Edit, R2 Edit, KV Edit, Workers Tail Read

**Error: "Database not found"**

Check `database_id` in `wrangler.toml` matches actual database:
```bash
wrangler d1 list
```

### Pages Deployment Issues

**Error: "Pages only supports files up to 25 MiB"**

The webpack cache is too large. Solutions:

1. Clean build: `rm -rf .next && pnpm build`
2. Use `@cloudflare/next-on-pages` adapter
3. Deploy via GitHub integration (automatic optimization)

**Error: "Build failed"**

Check build command includes workspace root:
```bash
cd apps/web && pnpm install && pnpm build
```

### Fly.io Deployment Issues

**Error: "Failed to connect to Docker daemon"**

Ensure Docker is running locally, or let Fly.io build remotely:
```bash
flyctl deploy --remote-only
```

**Error: "Machine failed health checks"**

Check logs for startup errors:
```bash
flyctl logs
```

Common issues:
- Missing environment variables
- Port mismatch (should be 3000)
- Puppeteer Chrome dependencies missing

### Research Pipeline Issues

**Error: "401 Unauthorized" when writing to database**

The `INTERNAL_API_SECRET` doesn't match between Fly.io and Workers:

1. Check current Worker secret: `wrangler secret list`
2. Update Fly.io secret: `flyctl secrets set INTERNAL_API_SECRET="xxx"`
3. Redeploy Fly.io app: `flyctl deploy`

**Error: "Plain language summaries not generating"**

Check Fly.io logs:
```bash
flyctl logs
```

Look for:
```
🔄 Generating plain language summaries for X sections...
✓ Generated summary for "Section Title"
```

If missing, verify:
- Docker image includes latest code
- `packages/research/synthesis/plain-language.ts` exists
- Anthropic API key is set and valid

### Database Issues

**Error: "Too many SQL variables"**

D1 has limit of 999 parameters per query. Batch your inserts:

```typescript
// Instead of one giant INSERT
const BATCH_SIZE = 100
for (let i = 0; i < items.length; i += BATCH_SIZE) {
  const batch = items.slice(i, i + BATCH_SIZE)
  await db.insert(batch)
}
```

### General Debugging

**View real-time logs:**
```bash
# Workers
wrangler tail

# Fly.io
flyctl logs

# Both with filtering
wrangler tail | grep ERROR
flyctl logs | grep ERROR
```

**Check service status:**
```bash
# Workers
wrangler deployments list

# Fly.io
flyctl status
```

---

## Cost Monitoring

### Cloudflare

Dashboard → Analytics → Overview

Monitor:
- Workers requests (100k free, then $0.50/million)
- D1 reads/writes (5M free, then $0.001/1k)
- R2 storage (10GB free, then $0.015/GB)
- Pages builds (500 free, then $0.25/build)

### Fly.io

Dashboard → peptalk-research → Metrics

Monitor:
- Machine runtime hours (1GB = ~$7/month)
- Outbound bandwidth (100GB free, then $0.02/GB)

### AI API Usage

- **Anthropic Console:** https://console.anthropic.com/settings/usage
- **OpenAI Dashboard:** https://platform.openai.com/usage

Typical costs:
- ~$0.20 per peptide (synthesis + plain language summaries)
- ~$0.05 per peptide (compliance validation, if enabled)

---

## Deployment Script

For streamlined deployments, use the included script:

```bash
# Deploy Workers API only
./deploy-production.sh
```

**Note:** This script:
1. Prompts for INTERNAL_API_SECRET update in Cloudflare Dashboard
2. Applies database migrations
3. Deploys Workers API
4. Runs cleanup scripts

For full deployment (all services):

```bash
# 1. Deploy Workers
cd apps/workers && wrangler deploy

# 2. Deploy Pages
cd apps/web && wrangler pages deploy .next --project-name=peptalk

# 3. Deploy Research Pipeline
flyctl deploy
```

---

## Related Documentation

- [PLAIN_LANGUAGE_DEPLOYMENT.md](./PLAIN_LANGUAGE_DEPLOYMENT.md) - Plain language summaries feature
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Original deployment guide with API setup
- [docs/06-deployment.md](./docs/06-deployment.md) - Detailed CI/CD and architecture info
- [fly.toml](./fly.toml) - Fly.io configuration
- [apps/workers/wrangler.toml](./apps/workers/wrangler.toml) - Workers configuration
- [apps/web/wrangler.toml](./apps/web/wrangler.toml) - Pages configuration

---

**Questions or Issues?**

Check the troubleshooting section above or review:
- Cloudflare Docs: https://developers.cloudflare.com/
- Fly.io Docs: https://fly.io/docs/
- Project GitHub Issues: [Your repo URL]

**Last Production Deployment:** November 6, 2025
**Plain Language Summaries:** ✅ Deployed and working
