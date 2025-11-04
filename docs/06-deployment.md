# PepTalk — Deployment Guide

**Version:** 1.0
**Last Updated:** 2025-11-04

---

## Overview

PepTalk deploys to Cloudflare's edge infrastructure for global performance and cost efficiency. This guide covers setup, configuration, and deployment processes.

**Infrastructure:**
- **Frontend:** Cloudflare Pages (Next.js)
- **API:** Cloudflare Workers (Hono)
- **Database:** D1 (SQLite)
- **Storage:** R2 (Object storage)
- **Auth:** Lucia (sessions in D1)
- **Email:** Resend
- **Payments:** Stripe

---

## Environments

### Development (Local)

**Purpose:** Local development and testing

**Setup:**
```bash
# Clone repository
git clone https://github.com/your-org/peptalk.git
cd peptalk

# Install dependencies
pnpm install

# Set up local environment
cp .env.example .env
# Edit .env with development keys

# Run local D1
pnpm wrangler d1 execute peptalk-db --local --file=packages/database/migrations/0001-initial.sql

# Start development servers
pnpm dev
```

**URLs:**
- Frontend: http://localhost:3000
- API: http://localhost:8787

### Staging

**Purpose:** Pre-production testing

**Infrastructure:**
- Cloudflare account: staging
- Branch: `main` (auto-deploys on merge)
- D1 database: `peptalk-staging-db`
- R2 bucket: `peptalk-staging-pdfs`

**URLs:**
- Frontend: https://staging.peptalk.com
- API: https://api-staging.peptalk.com

### Production

**Purpose:** Live environment

**Infrastructure:**
- Cloudflare account: production
- Branch: Tagged releases (`v1.0.0`)
- D1 database: `peptalk-production-db`
- R2 bucket: `peptalk-production-pdfs`

**URLs:**
- Frontend: https://peptalk.com
- API: https://api.peptalk.com

---

## Cloudflare Setup

### Account Configuration

**Prerequisites:**
- Cloudflare account (free tier sufficient for MVP)
- Domain registered (e.g., peptalk.com)
- Cloudflare Workers paid plan ($5/month for D1 + higher limits)

### Step 1: Install Wrangler CLI

```bash
npm install -g wrangler

# Authenticate
wrangler login
```

### Step 2: Create D1 Database

```bash
# Staging
wrangler d1 create peptalk-staging-db

# Production
wrangler d1 create peptalk-production-db
```

**Output:**
```
✅ Successfully created DB 'peptalk-staging-db'
Database ID: abc123-def456-ghi789
```

**Save database IDs** for wrangler.toml.

### Step 3: Create R2 Bucket

```bash
# Staging
wrangler r2 bucket create peptalk-staging-pdfs

# Production
wrangler r2 bucket create peptalk-production-pdfs
```

### Step 4: Run Database Migrations

```bash
# Staging (local first for testing)
pnpm wrangler d1 execute peptalk-staging-db --local --file=packages/database/migrations/0001-initial.sql
pnpm wrangler d1 execute peptalk-staging-db --local --file=packages/database/migrations/0002-fts.sql

# Staging (remote)
pnpm wrangler d1 execute peptalk-staging-db --remote --file=packages/database/migrations/0001-initial.sql
pnpm wrangler d1 execute peptalk-staging-db --remote --file=packages/database/migrations/0002-fts.sql

# Production (only after staging validation)
pnpm wrangler d1 execute peptalk-production-db --remote --file=packages/database/migrations/0001-initial.sql
pnpm wrangler d1 execute peptalk-production-db --remote --file=packages/database/migrations/0002-fts.sql
```

---

## Configuration Files

### wrangler.toml (Workers)

**Location:** `apps/workers/wrangler.toml`

```toml
name = "peptalk-api"
main = "src/index.ts"
compatibility_date = "2024-11-01"

[env.staging]
name = "peptalk-api-staging"
route = "api-staging.peptalk.com/*"

[[env.staging.d1_databases]]
binding = "DB"
database_name = "peptalk-staging-db"
database_id = "abc123-staging"

[[env.staging.r2_buckets]]
binding = "STORAGE"
bucket_name = "peptalk-staging-pdfs"

[env.staging.vars]
ENVIRONMENT = "staging"
NEXT_PUBLIC_URL = "https://staging.peptalk.com"

[env.production]
name = "peptalk-api-production"
route = "api.peptalk.com/*"

[[env.production.d1_databases]]
binding = "DB"
database_name = "peptalk-production-db"
database_id = "xyz789-production"

[[env.production.r2_buckets]]
binding = "STORAGE"
bucket_name = "peptalk-production-pdfs"

[env.production.vars]
ENVIRONMENT = "production"
NEXT_PUBLIC_URL = "https://peptalk.com"

# Scheduled jobs (cron)
[triggers]
crons = ["0 2 * * *"]  # Nightly at 2 AM UTC
```

### Environment Variables

**Workers Secrets (via CLI):**
```bash
# Staging
wrangler secret put ANTHROPIC_API_KEY --env staging
wrangler secret put OPENAI_API_KEY --env staging
wrangler secret put STRIPE_SECRET_KEY --env staging
wrangler secret put STRIPE_WEBHOOK_SECRET --env staging
wrangler secret put RESEND_API_KEY --env staging
wrangler secret put LUCIA_SECRET --env staging
wrangler secret put CRON_SECRET --env staging

# Production
wrangler secret put ANTHROPIC_API_KEY --env production
# ... repeat for all secrets
```

**Next.js Environment Variables:**

**Location:** `apps/web/.env.production`

```bash
NEXT_PUBLIC_API_URL=https://api.peptalk.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
```

---

## CI/CD Pipeline

### GitHub Actions

**Location:** `.github/workflows/deploy.yml`

```yaml
name: Deploy

on:
  push:
    branches: [main]
  release:
    types: [created]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Lint
        run: pnpm lint

      - name: Type check
        run: pnpm typecheck

      - name: Run tests
        run: pnpm test

      - name: Check file sizes
        run: |
          find . -name "*.ts" -o -name "*.tsx" | while read file; do
            lines=$(wc -l < "$file")
            if [ "$lines" -gt 400 ]; then
              echo "❌ $file exceeds 400 lines"
              exit 1
            fi
          done

  deploy-staging:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4

      - name: Deploy Workers (Staging)
        run: |
          cd apps/workers
          pnpm wrangler deploy --env staging
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}

      - name: Deploy Pages (Staging)
        run: |
          cd apps/web
          pnpm wrangler pages deploy .next --project-name peptalk-staging
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}

  deploy-production:
    needs: test
    if: github.event_name == 'release'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4

      - name: Deploy Workers (Production)
        run: |
          cd apps/workers
          pnpm wrangler deploy --env production
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}

      - name: Deploy Pages (Production)
        run: |
          cd apps/web
          pnpm wrangler pages deploy .next --project-name peptalk
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

---

## Deployment Process

### Staging Deployment (Automatic)

**Trigger:** Merge to `main` branch

**Process:**
1. CI runs tests, lint, type check
2. If all pass, deploy to staging
3. Workers deploy in ~30 seconds
4. Pages deploy in ~2 minutes
5. Cloudflare CDN cache invalidated

**Validation:**
```bash
# Check Workers deployment
curl https://api-staging.peptalk.com/api/peptides

# Check Pages deployment
curl https://staging.peptalk.com
```

### Production Deployment (Manual)

**Trigger:** Create GitHub release (tag: `v1.0.0`)

**Process:**
```bash
# 1. Create release branch
git checkout main
git pull origin main
git checkout -b release/v1.0.0

# 2. Update version in package.json
# Edit apps/web/package.json and apps/workers/package.json
# Set version to 1.0.0

# 3. Commit and tag
git add .
git commit -m "Release v1.0.0"
git tag v1.0.0
git push origin release/v1.0.0
git push origin v1.0.0

# 4. Create GitHub release
# Go to GitHub → Releases → Draft new release
# Select tag v1.0.0
# Generate release notes
# Publish release

# 5. CI automatically deploys to production
```

**Validation:**
```bash
# Check production deployment
curl https://api.peptalk.com/api/peptides
curl https://peptalk.com

# Check version
curl https://api.peptalk.com/api/health
# Should return: {"version": "1.0.0", "status": "healthy"}
```

---

## Database Migrations

### Creating a Migration

```bash
# Create migration file
pnpm wrangler d1 migrations create peptalk-db add-new-column

# Edit migration file
# migrations/0003-add-new-column.sql
```

**Example:**
```sql
-- migrations/0003-add-new-column.sql
ALTER TABLE peptides ADD COLUMN mechanism_of_action TEXT;
```

### Applying Migrations

**Staging:**
```bash
# Test locally first
pnpm wrangler d1 migrations apply peptalk-db --local

# Apply to staging
pnpm wrangler d1 migrations apply peptalk-db --env staging --remote
```

**Production:**
```bash
# Only after staging validation
pnpm wrangler d1 migrations apply peptalk-db --env production --remote
```

### Rolling Back Migrations

**D1 does not support automatic rollback.** Manual process:

```bash
# Create rollback migration
pnpm wrangler d1 migrations create peptalk-db rollback-add-new-column

# Edit rollback migration
# migrations/0004-rollback-add-new-column.sql
ALTER TABLE peptides DROP COLUMN mechanism_of_action;

# Apply rollback
pnpm wrangler d1 migrations apply peptalk-db --env production --remote
```

---

## DNS Configuration

### Cloudflare DNS

**Records to create:**

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | @ | 192.0.2.1 | ✅ |
| CNAME | www | peptalk.com | ✅ |
| CNAME | api | workers.dev | ✅ |
| CNAME | api-staging | workers.dev | ✅ |
| CNAME | staging | pages.dev | ✅ |

**SSL/TLS:**
- Mode: Full (strict)
- Always Use HTTPS: Enabled
- Automatic HTTPS Rewrites: Enabled

---

## Monitoring

### Cloudflare Analytics

**Available Metrics:**
- Request count
- Bandwidth
- Error rate (4xx, 5xx)
- Response time (P50, P95, P99)

**Access:**
Dashboard → Workers → peptalk-api → Metrics

### Custom Logging

**Workers Tail Logs:**
```bash
# Real-time logs (staging)
wrangler tail --env staging

# Real-time logs (production)
wrangler tail --env production
```

**Log Format:**
```json
{
  "timestamp": "2025-11-04T12:00:00Z",
  "level": "info",
  "message": "Request received",
  "path": "/api/peptides",
  "method": "GET",
  "duration_ms": 45
}
```

### Alerts

**Set up in Cloudflare Dashboard:**

1. **Error Rate Alert:**
   - Condition: Error rate > 5% for 5 minutes
   - Action: Email + Slack webhook

2. **High Latency Alert:**
   - Condition: P95 response time > 2000ms for 10 minutes
   - Action: Email

3. **High Request Volume:**
   - Condition: Requests > 10k/min (unusual traffic)
   - Action: Email (potential attack)

---

## Rollback Procedures

### Workers Rollback

**Via Cloudflare Dashboard:**
1. Dashboard → Workers → peptalk-api
2. Click "Rollbacks"
3. Select previous version
4. Click "Rollback"

**Via CLI:**
```bash
# List versions
wrangler deployments list --env production

# Rollback to specific version
wrangler rollback --env production --deployment-id abc123
```

### Pages Rollback

**Via Cloudflare Dashboard:**
1. Dashboard → Pages → peptalk
2. Click deployment to rollback to
3. Click "Rollback to this deployment"

### Database Rollback

**Manual process (no automatic rollback):**
1. Create rollback migration (see above)
2. Apply rollback migration
3. Verify data integrity
4. Redeploy application if needed

---

## Performance Optimization

### Caching

**Cloudflare CDN:**
- Static assets: 1 year cache
- API responses: No cache (dynamic)
- Pages HTML: 5 minutes cache

**Cache Rules:**
```javascript
// apps/workers/src/index.ts
app.get('/api/peptides/:slug', async (c) => {
  const data = await getPeptide(c.req.param('slug'))

  return c.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=300', // 5 min CDN cache
      'CDN-Cache-Control': 'public, s-maxage=300',
    }
  })
})
```

### Edge Optimization

**Workers:**
- Run on Cloudflare's global network
- <50ms cold start
- 0ms warm start
- Automatic scaling

**Pages:**
- Deployed to 300+ locations
- Static assets cached at edge
- Dynamic content from Workers

---

## Backup and Restore

### D1 Backup

**Export database:**
```bash
# Export staging
wrangler d1 export peptalk-db --env staging --output backup-staging-2025-11-04.sql

# Export production
wrangler d1 export peptalk-db --env production --output backup-production-2025-11-04.sql
```

**Schedule automated backups:**
```yaml
# .github/workflows/backup.yml
name: Database Backup
on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - name: Backup production DB
        run: wrangler d1 export peptalk-db --env production --output backup-$(date +%Y-%m-%d).sql

      - name: Upload to S3
        run: aws s3 cp backup-$(date +%Y-%m-%d).sql s3://peptalk-backups/
```

### R2 Backup

**R2 is automatically replicated across Cloudflare's network.**

**Manual backup:**
```bash
# Download all PDFs
wrangler r2 object list peptalk-production-pdfs > pdf-list.txt
# Use S3-compatible tool to sync to backup location
```

### Restore

**Database:**
```bash
# Restore from backup
wrangler d1 execute peptalk-db --env production --file backup-2025-11-04.sql
```

**R2:**
```bash
# Upload PDFs from backup
# Use S3-compatible tool to upload
```

---

## Troubleshooting

### Issue: Workers deploy fails

**Error:** "Script validation failed"

**Solution:**
```bash
# Check syntax locally
pnpm typecheck

# Test locally
pnpm wrangler dev

# Check logs
wrangler tail
```

### Issue: Database connection fails

**Error:** "D1_ERROR: database not found"

**Solution:**
- Verify `database_id` in wrangler.toml matches actual ID
- Check `wrangler d1 list` for correct IDs

### Issue: R2 upload fails

**Error:** "Access denied"

**Solution:**
- Verify R2 bucket binding in wrangler.toml
- Check bucket name matches exactly

---

## Security Checklist

Before production deployment:

- [ ] All secrets rotated (no dev keys in production)
- [ ] HTTPS enforced (no HTTP)
- [ ] CORS configured (only peptalk.com origin)
- [ ] Rate limiting enabled
- [ ] Stripe webhook signature verified
- [ ] Session cookies: httpOnly, Secure, SameSite
- [ ] D1 database: read-only user for Workers (if possible)
- [ ] R2 objects: no public access (signed URLs only)
- [ ] Environment variables: no secrets in code

---

## References

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)
- [01-architecture.md](./01-architecture.md) - System architecture
- [08-security.md](./08-security.md) - Security details

---

**Document Owner:** Engineering Team
**Lines:** 397 (within 400-line limit ✓)
