# peptalk-workers

Cloudflare Workers API backend for PepTalk.

## Purpose

This is the edge API that provides:
- RESTful API endpoints for peptide data
- Authentication (magic link + session management)
- PDF download with signed R2 URLs
- Stripe webhook handling
- Cron jobs for weekly research updates
- Rate limiting and CORS

## Tech Stack

- **Cloudflare Workers** - Edge compute
- **Hono** - Fast web framework
- **D1** - SQLite database
- **R2** - Object storage (PDFs)
- **Lucia** - Session management

## Development

### Start Dev Server

```bash
pnpm dev
```

Access at http://localhost:8787

### Deploy

```bash
# Staging
pnpm deploy:staging

# Production
pnpm deploy:production
```

### Type Check

```bash
pnpm typecheck
```

### Run Tests

```bash
pnpm test
```

## Project Structure

```
apps/workers/
├── src/
│   ├── index.ts              # Main entry point
│   ├── api/
│   │   ├── peptides.ts       # GET /api/peptides
│   │   ├── peptide-detail.ts # GET /api/peptides/:slug
│   │   ├── studies.ts        # GET /api/studies
│   │   ├── pdf.ts            # GET /api/pdf/:slug
│   │   ├── checkout.ts       # POST /api/checkout/create
│   │   └── portal.ts         # POST /api/billing/portal
│   ├── handlers/
│   │   ├── auth.ts           # Auth middleware
│   │   ├── rate-limit.ts     # Rate limiting
│   │   └── cors.ts           # CORS headers
│   ├── cron/
│   │   └── update-research.ts # Weekly peptide updates
│   └── webhooks/
│       └── stripe.ts         # POST /api/webhooks/stripe
├── wrangler.toml             # Cloudflare config
├── package.json
├── tsconfig.json
└── README.md
```

## API Endpoints

### Public Endpoints

#### GET /api/peptides

List peptides with pagination and search.

**Query Parameters:**
- `q` (string, optional) - Search query
- `grade` (string, optional) - Filter by evidence grade
- `page` (number, default: 1) - Page number
- `limit` (number, default: 20) - Results per page

**Response:**

```json
{
  "peptides": [
    {
      "slug": "bpc-157",
      "name": "BPC-157",
      "aliases": ["Body Protection Compound"],
      "evidenceGrade": "moderate",
      "humanRctCount": 5,
      "animalCount": 23,
      "excerpt": "BPC-157 is a synthetic peptide...",
      "lastUpdated": "2025-01-01T00:00:00Z"
    }
  ],
  "total": 100,
  "page": 1,
  "pages": 5
}
```

**Rate Limit:** 100 requests/minute

#### GET /api/peptides/:slug

Get detailed peptide information.

**Response:**

```json
{
  "slug": "bpc-157",
  "name": "BPC-157",
  "aliases": ["Body Protection Compound"],
  "evidenceGrade": "moderate",
  "summaryHtml": "<p>...</p>",
  "sections": [
    {
      "title": "Human Research",
      "contentHtml": "<p>...</p>"
    }
  ],
  "studies": [...],
  "humanRctCount": 5,
  "animalCount": 23,
  "legalNotes": [...],
  "lastUpdated": "2025-01-01T00:00:00Z",
  "version": 1
}
```

**Rate Limit:** 100 requests/minute

#### GET /api/studies

Search studies with full-text search.

**Query Parameters:**
- `q` (string, required) - Search query
- `peptideId` (string, optional) - Filter by peptide
- `limit` (number, default: 10) - Max results

**Response:**

```json
{
  "studies": [
    {
      "id": "PMID:12345678",
      "type": "pubmed",
      "title": "Study Title",
      "studyType": "human_rct",
      "year": 2023
    }
  ]
}
```

**Rate Limit:** 100 requests/minute

### Protected Endpoints

#### GET /api/pdf/:slug

Download PDF for peptide (subscribers only).

**Response:** Redirect to signed R2 URL (302)

**Rate Limit:** 20 requests/minute

**Auth:** Required (valid session)

**Subscription:** Required (active subscription)

#### POST /api/checkout/create

Create Stripe Checkout session for subscription.

**Request Body:**

```json
{
  "priceId": "price_..."
}
```

**Response:**

```json
{
  "url": "https://checkout.stripe.com/..."
}
```

**Rate Limit:** 10 requests/minute

**Auth:** Required (valid session)

#### POST /api/billing/portal

Create Stripe Customer Portal session.

**Response:**

```json
{
  "url": "https://billing.stripe.com/..."
}
```

**Rate Limit:** 10 requests/minute

**Auth:** Required (valid session + subscription)

### Webhook Endpoints

#### POST /api/webhooks/stripe

Handle Stripe webhook events.

**Headers:**
- `stripe-signature` (required) - Webhook signature

**Events Handled:**
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

**Response:**

```json
{
  "received": true
}
```

**Rate Limit:** None (verified via signature)

## Middleware

### Auth Middleware

**File:** `src/handlers/auth.ts`

Validates session cookie and attaches user to context.

```typescript
import { auth } from './handlers/auth'

app.get('/api/protected', auth, async (c) => {
  const user = c.get('user')
  return c.json({ userId: user.id })
})
```

### Rate Limiting

**File:** `src/handlers/rate-limit.ts`

Token bucket algorithm with per-IP limits.

```typescript
import { rateLimit } from './handlers/rate-limit'

app.get(
  '/api/peptides',
  rateLimit({ limit: 100, window: 60 }),
  async (c) => {
    // Handler
  }
)
```

### CORS

**File:** `src/handlers/cors.ts`

Adds CORS headers for frontend access.

```typescript
import { cors } from './handlers/cors'

app.use('*', cors({
  origin: process.env.NEXT_PUBLIC_URL,
  credentials: true
}))
```

## Environment Variables

Set in `wrangler.toml` and Cloudflare dashboard:

```toml
[env.production.vars]
NEXT_PUBLIC_URL = "https://peptalk.com"
STRIPE_SECRET_KEY = "sk_live_..."
STRIPE_WEBHOOK_SECRET = "whsec_..."
STRIPE_PRICE_ID = "price_..."
LUCIA_SECRET = "..."
RESEND_API_KEY = "re_..."
CRON_SECRET = "..."

[[env.production.d1_databases]]
binding = "DB"
database_name = "peptalk-db"
database_id = "..."

[[env.production.r2_buckets]]
binding = "R2"
bucket_name = "peptalk-pdfs"
```

## Cron Jobs

### Weekly Research Updates

**Schedule:** Every Sunday at 2 AM UTC

**Trigger:** `0 2 * * 0`

**Handler:** `src/cron/update-research.ts`

**Process:**
1. Fetch list of peptides from database
2. For each peptide, re-run research pipeline
3. Compare with existing version
4. If changes detected, increment version and publish
5. Send notification to admin

**Example:**

```typescript
export async function updateResearch(env: Env) {
  const peptides = await db.peptides.list(env.DB, { limit: 1000 })

  for (const peptide of peptides) {
    try {
      const updated = await runPipeline(peptide.slug)

      if (hasChanges(peptide, updated)) {
        await publish(updated, env.DB, env.R2)
        console.log(`Updated ${peptide.slug}`)
      }
    } catch (error) {
      console.error(`Failed to update ${peptide.slug}:`, error)
    }
  }
}
```

## Error Handling

### API Errors

```typescript
app.onError((err, c) => {
  console.error('API Error:', err)

  if (err instanceof ZodError) {
    return c.json({ error: 'Validation error', details: err.errors }, 400)
  }

  if (err.message === 'Unauthorized') {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  return c.json({ error: 'Internal server error' }, 500)
})
```

### Database Errors

```typescript
try {
  const peptide = await db.peptides.getBySlug(env.DB, slug)
  if (!peptide) {
    return c.json({ error: 'Not found' }, 404)
  }
  return c.json(peptide)
} catch (error) {
  console.error('Database error:', error)
  return c.json({ error: 'Database error' }, 500)
}
```

## Testing

### Unit Tests

```typescript
import { app } from './index'

describe('GET /api/peptides', () => {
  it('returns peptide list', async () => {
    const res = await app.request('/api/peptides')
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.peptides).toBeInstanceOf(Array)
  })
})
```

### Integration Tests

Located in `../../tests/integration/`:

```typescript
import { describe, it, expect } from 'vitest'

describe('API Integration', () => {
  it('complete peptide flow', async () => {
    // Create user
    // Subscribe
    // Fetch peptide
    // Download PDF
  })
})
```

## Deployment

See [docs/06-deployment.md](../../docs/06-deployment.md) for complete guide.

### Staging

```bash
pnpm deploy:staging
```

### Production

```bash
pnpm deploy:production
```

## Monitoring

### Logs

View logs in Cloudflare dashboard or via CLI:

```bash
wrangler tail
```

### Analytics

Cloudflare automatically tracks:
- Request count
- Response time (p50, p95, p99)
- Error rate
- Bandwidth usage

## Security

### Authentication

Sessions managed by Lucia:

```typescript
import { lucia } from './lib/auth'

// Create session
const session = await lucia.createSession(userId, {})
c.header('Set-Cookie', lucia.createSessionCookie(session.id).serialize())

// Validate session
const sessionId = c.req.cookie('session')
const { session, user } = await lucia.validateSession(sessionId)
```

### Rate Limiting

Token bucket per IP address:

```typescript
const key = `ratelimit:${ip}`
const tokens = await env.CACHE.get(key) || limit

if (tokens <= 0) {
  return c.json({ error: 'Rate limit exceeded' }, 429)
}

await env.CACHE.put(key, tokens - 1, { expirationTtl: window })
```

### Webhook Verification

Always verify Stripe signatures:

```typescript
const signature = c.req.header('stripe-signature')
const body = await c.req.text()

const event = stripe.webhooks.constructEvent(
  body,
  signature,
  env.STRIPE_WEBHOOK_SECRET
)

await handleWebhook(event, env.DB)
```

## Related Documentation

- [docs/03-api-reference.md](../../docs/03-api-reference.md) - Complete API docs
- [docs/06-deployment.md](../../docs/06-deployment.md) - Deployment guide
- [docs/08-security.md](../../docs/08-security.md) - Security practices
- [Hono Docs](https://hono.dev/)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
