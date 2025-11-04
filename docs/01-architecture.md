# PepTalk — System Architecture

**Version:** 1.0
**Last Updated:** 2025-11-04

---

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                          User Layer                               │
│  (Web Browser, Mobile, API Clients)                              │
└───────────────────┬──────────────────────────────────────────────┘
                    │
                    │ HTTPS (Cloudflare CDN)
                    ▼
┌──────────────────────────────────────────────────────────────────┐
│                      Presentation Layer                           │
│  ┌────────────────────────────────────────────────────────┐     │
│  │  Next.js 14 (Cloudflare Pages)                         │     │
│  │  - Server Components (RSC)                             │     │
│  │  - Client Components (React)                           │     │
│  │  - Edge Rendering                                      │     │
│  └────────────────────────────────────────────────────────┘     │
└───────────────────┬──────────────────────────────────────────────┘
                    │
                    │ Internal API (Workers)
                    ▼
┌──────────────────────────────────────────────────────────────────┐
│                      Application Layer                            │
│  ┌────────────────────────────────────────────────────────┐     │
│  │  Cloudflare Workers (Edge Functions)                   │     │
│  │  ┌──────────┬──────────┬──────────┬───────────┐       │     │
│  │  │  Hono    │  Auth    │  Rate    │  Stripe   │       │     │
│  │  │  Router  │  Middleware Limiter │  Webhooks │       │     │
│  │  └──────────┴──────────┴──────────┴───────────┘       │     │
│  └────────────────────────────────────────────────────────┘     │
└───────────────────┬──────────────────────────────────────────────┘
                    │
                    │ Queries/Commands
                    ▼
┌──────────────────────────────────────────────────────────────────┐
│                         Data Layer                                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐    │
│  │  D1 (SQLite)    │  │  R2 (Object     │  │  KV (Cache)  │    │
│  │  - Peptides     │  │  Storage)       │  │  - Sessions  │    │
│  │  - Studies      │  │  - PDFs         │  │  - Ratelimit │    │
│  │  - Users        │  │  - Assets       │  │              │    │
│  │  - Subscriptions│  │                 │  │              │    │
│  └─────────────────┘  └─────────────────┘  └──────────────┘    │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                      Processing Layer                             │
│  ┌────────────────────────────────────────────────────────┐     │
│  │  Research Pipeline (Scheduled / On-Demand)             │     │
│  │  ┌─────────┬──────────┬───────────┬──────────┐        │     │
│  │  │ Ingest  │ Synthesize Compliance │ Publish  │        │     │
│  │  │ (APIs)  │ (Claude) │ (GPT-5)   │ (PDF+DB) │        │     │
│  │  └─────────┴──────────┴───────────┴──────────┘        │     │
│  └────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                      External Services                            │
│  ┌──────────┬──────────┬──────────┬────────────┬────────┐       │
│  │ PubMed   │ Clinical │ Anthropic│ OpenAI     │ Stripe │       │
│  │ API      │ Trials   │ Claude   │ GPT-5      │ Billing│       │
│  └──────────┴──────────┴──────────┴────────────┴────────┘       │
└──────────────────────────────────────────────────────────────────┘
```

---

## Component Details

### 1. Presentation Layer (Next.js)

#### Responsibilities
- Server-side rendering (SSR)
- Static page generation (SSG for marketing)
- Client-side routing
- Form handling
- PDF download coordination

#### Key Routes

**Public Routes**
- `/` - Homepage
- `/peptides` - List + search
- `/peptides/[slug]` - Detail page
- `/changelog` - Weekly digest
- `/auth/login` - Magic link request
- `/auth/callback?token=` - Email verification

**Protected Routes** (require auth)
- `/account` - User dashboard
- `/account/billing` - Subscription management

#### Components Structure
```
components/
├── layout/
│   ├── header.tsx
│   ├── footer.tsx
│   └── nav.tsx
├── peptides/
│   ├── peptide-card.tsx
│   ├── peptide-list.tsx
│   ├── search-bar.tsx
│   ├── filter-panel.tsx
│   └── evidence-badge.tsx
├── detail/
│   ├── disclaimer-banner.tsx
│   ├── evidence-snapshot.tsx
│   ├── protocols-table.tsx
│   ├── safety-section.tsx
│   ├── legal-notes.tsx
│   └── citation-list.tsx
└── account/
    ├── subscription-status.tsx
    ├── billing-button.tsx
    └── settings-form.tsx
```

#### Data Fetching Pattern
```typescript
// Server Component (app/peptides/[slug]/page.tsx)
export default async function PeptidePage({ params }) {
  const data = await fetch(`${API_URL}/peptides/${params.slug}`)
  return <PeptideDetail data={data} />
}
```

---

### 2. Application Layer (Cloudflare Workers)

#### Responsibilities
- API routing
- Authentication middleware
- Rate limiting
- Webhook handling
- PDF URL signing
- CORS management

#### API Structure

**API Routes** (`apps/workers/api/`)
```
api/
├── peptides-list.ts      # GET /api/peptides
├── peptides-detail.ts    # GET /api/peptides/:slug
├── studies-query.ts      # GET /api/studies
├── pdf-download.ts       # GET /api/pdf/:slug
├── checkout-create.ts    # POST /api/checkout/create
├── billing-portal.ts     # POST /api/billing/portal
└── ingest-trigger.ts     # POST /api/ingest/run
```

**Middleware Chain**
```
Request
  ↓
1. CORS (origin validation)
  ↓
2. Rate Limiter (KV-based)
  ↓
3. Auth (session validation)
  ↓
4. Route Handler
  ↓
5. Error Handler (structured responses)
  ↓
Response
```

#### Workers Entry Point
```typescript
// apps/workers/index.ts
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { rateLimiter } from './handlers/rate-limiter'
import { authMiddleware } from './handlers/auth'
import { peptidesListHandler } from './api/peptides-list'

const app = new Hono()

app.use('*', cors({ origin: process.env.NEXT_PUBLIC_URL }))
app.use('/api/*', rateLimiter())

app.get('/api/peptides', peptidesListHandler)
app.get('/api/peptides/:slug', peptidesDetailHandler)
app.get('/api/pdf/:slug', authMiddleware, pdfDownloadHandler)

export default app
```

---

### 3. Data Layer

#### D1 (SQLite)

**Purpose:** Primary relational database

**Tables:**
- `peptides` - Peptide metadata
- `studies` - Research publications/trials
- `studies_fts` - Full-text search (FTS5)
- `legal_notes` - Regulatory status
- `page_versions` - Version history
- `users` - Auth users
- `sessions` - Active sessions
- `subscriptions` - Stripe subscription records
- `changelog` - Weekly digest entries

**Indexes:**
- Primary keys: All tables
- Foreign keys: `peptide_id`, `user_id`
- Search: FTS5 on titles/abstracts
- Lookups: `slug`, `email`, `stripe_subscription_id`

**Query Pattern:**
```typescript
// packages/database/queries/peptides.ts
export async function getPeptideBySlug(db: D1Database, slug: string) {
  return await db
    .prepare('SELECT * FROM peptides WHERE slug = ?')
    .bind(slug)
    .first()
}
```

#### R2 (Object Storage)

**Purpose:** PDF storage

**Structure:**
```
peptalk-pdfs/
├── pages/
│   ├── bpc-157/
│   │   ├── v1.pdf
│   │   ├── v2.pdf
│   │   └── latest.pdf (symlink)
│   └── tb-500/
│       └── latest.pdf
└── assets/
    └── logo.png
```

**Access Pattern:**
```typescript
// Signed URL generation (1 hour TTL)
const signedUrl = await r2.signUrl('pages/bpc-157/latest.pdf', {
  expiresIn: 3600
})
```

#### KV (Key-Value Store)

**Purpose:** Ephemeral data (sessions, rate limits)

**Keys:**
- `session:{id}` - Session data (TTL: 30 days)
- `ratelimit:{ip}:{endpoint}` - Request count (TTL: 1 minute)

---

### 4. Processing Layer (Research Pipeline)

#### Architecture

```
┌─────────────┐
│   CLI       │  run-single.ts / run-batch.ts
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│                   Pipeline Orchestrator                  │
└──┬────┬─────┬────────┬───────────┬────────┬────────────┘
   │    │     │        │           │        │
   ▼    ▼     ▼        ▼           ▼        ▼
┌─────┬──────┬────────┬───────────┬────────┬──────────┐
│Ingest Normalize Grade  Synthesize Compliance Publish │
└─────┴──────┴────────┴───────────┴────────┴──────────┘
```

#### Pipeline Steps

**1. Ingest** (`packages/research/ingest/`)
- PubMed E-utilities API (search → fetch details)
- ClinicalTrials.gov API (search NCT → fetch JSON)
- Output: `SourcePack` (studies[], meta)

**2. Normalize** (`packages/research/ingest/normalizer/`)
- Deduplicate by ID/title similarity
- Infer study type (RCT vs observational vs animal)
- Output: Cleaned `SourcePack`

**3. Grade** (`packages/research/rubric/`)
- Apply deterministic rubric
- Output: `{grade, rationale}`

**4. Synthesize** (`packages/research/synthesis/`)
- Call Claude 4.5 with SourcePack
- Parse JSON (PageRecord) + Markdown
- Output: `PageRecord` + `markdown`

**5. Compliance** (`packages/research/compliance/`)
- Regex checks (no "should", "recommend")
- Citation verification (all PMID/NCT present)
- GPT-5 final pass
- Output: `{ready: boolean, issues: []}`

**6. Publish** (`packages/research/publisher/`)
- Write `{slug}.json` + `{slug}.md` to `content/`
- Render PDF via Puppeteer
- Upload PDF to R2
- Insert/update D1 records
- Update FTS index

#### Error Handling
- Each step can fail independently
- Retry logic for network errors (3x with backoff)
- Structured error logs with context
- Email alert on pipeline failure

---

## Data Flow Diagrams

### User Read Flow (GET /peptides/:slug)

```
User Browser
    │
    │ 1. GET /peptides/bpc-157
    ▼
Next.js SSR
    │
    │ 2. Fetch from API
    │    GET ${API_URL}/api/peptides/bpc-157
    ▼
Cloudflare Worker
    │
    │ 3. Query D1
    │    SELECT * FROM peptides WHERE slug = 'bpc-157'
    │    SELECT * FROM studies WHERE peptide_id = ?
    ▼
D1 Database
    │
    │ 4. Return rows
    ▼
Worker
    │
    │ 5. Format response (PageRecord + markdown)
    ▼
Next.js SSR
    │
    │ 6. Render page HTML
    ▼
User Browser
    │
    └── Display peptide page
```

### PDF Download Flow

```
User clicks "Download PDF"
    │
    │ 1. POST /api/pdf/bpc-157
    │    Cookie: auth_session=xxx
    ▼
Worker (Auth Middleware)
    │
    │ 2. Validate session
    │    Query D1: SELECT * FROM sessions WHERE id = ?
    │
    │ 3. Check subscription
    │    Query D1: SELECT * FROM subscriptions WHERE user_id = ?
    ▼
Worker (PDF Handler)
    │
    │ 4. Generate signed R2 URL
    │    r2.signUrl('pages/bpc-157/latest.pdf', {expiresIn: 3600})
    ▼
User Browser
    │
    │ 5. Redirect to signed URL
    │    https://storage.peptalk.com/...?signature=...
    ▼
R2 (Cloudflare Storage)
    │
    │ 6. Serve PDF
    └── Download starts
```

### Research Pipeline Flow (Scheduled)

```
Cron Trigger (2 AM UTC)
    │
    │ 1. POST /api/ingest/run
    │    Header: X-Cron-Secret
    ▼
Worker
    │
    │ 2. Enqueue job (D1 queue table)
    │    INSERT INTO jobs (type, peptide_id, status)
    ▼
CLI Runner (long-running Worker)
    │
    │ 3. Fetch peptide list
    │    SELECT * FROM peptides
    │
    │ 4. For each peptide:
    ├───► Ingest (PubMed + CT.gov)
    │       │
    │       ▼
    ├───► Normalize (dedupe + type inference)
    │       │
    │       ▼
    ├───► Grade (rubric)
    │       │
    │       ▼
    ├───► Synthesize (Claude 4.5)
    │       │
    │       ▼
    ├───► Compliance (GPT-5 + regex)
    │       │
    │       ▼
    └───► Publish (JSON + PDF + D1 + R2)
    │
    │ 5. Update job status
    │    UPDATE jobs SET status = 'completed'
    │
    │ 6. Generate changelog
    │    Compare page_versions (last 7 days)
    │    Write to changelog table
    │
    └── Email notification (success/failure)
```

---

## Security Architecture

### Authentication Flow

```
1. User enters email → POST /api/auth/login
   │
   ▼
2. Generate magic link token (random 32 bytes)
   Store in D1: magic_links(token, email, expires_at)
   │
   ▼
3. Send email via Resend
   Link: https://peptalk.com/auth/callback?token=xxx
   │
   ▼
4. User clicks link → GET /auth/callback?token=xxx
   │
   ▼
5. Validate token (D1 lookup + expiry check)
   │
   ▼
6. Create session (Lucia)
   INSERT INTO sessions (id, user_id, expires_at)
   │
   ▼
7. Set cookie (httpOnly, SameSite=Lax, Secure)
   │
   └─► Redirect to /account
```

### Authorization Model

| Endpoint | Public | Subscriber | Admin |
|----------|--------|------------|-------|
| GET /peptides | ✓ | ✓ | ✓ |
| GET /peptides/:slug | ✓ | ✓ | ✓ |
| GET /api/pdf/:slug | ✗ | ✓ | ✓ |
| POST /api/ingest/run | ✗ | ✗ | ✓ (cron secret) |
| POST /api/webhooks/stripe | ✓ (signature) | ✓ | ✓ |

### Rate Limiting

**Strategy:** Token bucket per IP
**Limits:**
- Auth endpoints: 5 req/min
- Search/list: 10 req/sec
- Detail pages: 20 req/sec
- PDF downloads: 5 req/min

**Implementation:**
```typescript
// KV-based rate limiter
const key = `ratelimit:${ip}:${endpoint}`
const count = await env.KV.get(key)
if (count && parseInt(count) > limit) {
  return new Response('Rate limit exceeded', { status: 429 })
}
await env.KV.put(key, String(count + 1), { expirationTtl: 60 })
```

---

## Scalability Considerations

### Current Limits (MVP)
- D1: 5 GB storage, 5M row reads/day
- R2: Unlimited storage, 10M read requests/month (then $0.36/M)
- Workers: 100k requests/day (free), 10ms CPU time/request

### Scale Thresholds

**100 peptides:**
- D1: ~10k studies = 0.1% capacity
- R2: ~50 MB PDFs = negligible
- Workers: ~10k req/day = 10% capacity
- **Status:** ✅ Well within limits

**1,000 peptides:**
- D1: ~100k studies = 100% row capacity (consider Postgres)
- R2: ~500 MB PDFs = $0.01/month
- Workers: ~100k req/day = 100% free tier (upgrade to paid)
- **Status:** ⚠️ May need DB migration

**10,000 peptides:**
- D1: Not feasible (row limit)
- R2: ~5 GB PDFs = $0.08/month
- Workers: ~1M req/day = $5/month
- **Status:** ❌ Requires Postgres + read replicas

### Optimization Strategies

**Caching:**
- Cloudflare CDN for static pages (30-day cache)
- KV for frequently accessed peptides (5-min cache)
- Browser caching for assets (1-year cache)

**Database:**
- Read replicas (Neon serverless Postgres)
- Materialized views for aggregates
- Partitioning by date for studies table

**API:**
- GraphQL for flexible queries (reduce over-fetching)
- Pagination (cursor-based, not offset)
- ETag support for conditional requests

---

## Monitoring & Observability

### Metrics

**Application:**
- Request rate (req/sec)
- Error rate (%)
- Response time (p50, p95, p99)
- Auth success rate

**Research Pipeline:**
- Pipeline duration (minutes)
- LLM token usage (per peptide)
- Compliance pass rate (%)
- PDF render time (seconds)

**Business:**
- Signup rate (daily)
- Conversion rate (%)
- Churn rate (monthly)
- MRR growth

### Logging

**Structured Format:**
```json
{
  "timestamp": "2025-11-04T12:00:00Z",
  "level": "info",
  "component": "synthesis",
  "peptide_id": "peptide_123",
  "duration_ms": 12500,
  "tokens_used": 8432,
  "model": "claude-4.5-sonnet",
  "success": true
}
```

**Log Levels:**
- `debug`: Development only
- `info`: Normal operations
- `warn`: Recoverable issues
- `error`: Failed operations (requires attention)

### Alerts

**Critical (Page immediately):**
- Pipeline failure (>2 consecutive)
- Auth system down
- Payment webhook failure

**Warning (Email within 1 hour):**
- High error rate (>5% for 5 min)
- Slow response time (p95 >2s for 10 min)
- Low subscription rate (<1 per week)

**Info (Daily digest):**
- Cost report (LLM + infra)
- Usage stats (top peptides, peak times)
- User feedback

---

## Disaster Recovery

### Backup Strategy

**D1 Database:**
- Automatic snapshots (Cloudflare managed)
- Manual export before migrations
- Retention: 30 days

**R2 PDFs:**
- Versioned objects (keep last 3 versions)
- Regenerate from content/ if lost
- Retention: Indefinite

**Content Files (JSON/MD):**
- Git-tracked in separate repo
- Daily backup to GitHub
- Retention: Indefinite

### Recovery Procedures

**Scenario: D1 corruption**
1. Restore from latest snapshot
2. Replay recent transactions from logs
3. Run integrity checks
4. Resume operations

**Scenario: R2 data loss**
1. Fetch content JSON from Git
2. Re-render PDFs via pipeline
3. Upload to R2
4. Verify checksums

**Scenario: Total infrastructure failure**
1. Deploy to new Cloudflare account
2. Restore D1 from snapshot
3. Restore R2 from backups
4. Update DNS (10-min TTL)
5. Resume operations

**RTO (Recovery Time Objective):** 1 hour
**RPO (Recovery Point Objective):** 24 hours

---

## References

- [00-overview.md](./00-overview.md) - System overview
- [02-database-schema.md](./02-database-schema.md) - DB schema
- [03-api-reference.md](./03-api-reference.md) - API docs
- [04-research-pipeline.md](./04-research-pipeline.md) - Pipeline details

---

**Document Owner:** Engineering Team
**Review Cadence:** Quarterly
