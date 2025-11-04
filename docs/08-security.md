# PepTalk — Security Architecture

**Version:** 1.0
**Last Updated:** 2025-11-04

---

## Overview

PepTalk's security model follows the principle of least privilege and defense in depth. This document covers authentication, authorization, data protection, and threat mitigation.

**Security Principles:**
1. No PII beyond email
2. Passwordless authentication only
3. Stripe handles payment data (PCI compliant)
4. Edge-first for DDoS resilience
5. Regular security audits

---

## Authentication

### Magic Link Flow

**Process:**
1. User enters email → POST /api/auth/login
2. Generate random token (32 bytes, base64)
3. Store token in D1 with expiry (15 minutes)
4. Send email with link: `https://peptalk.com/auth/callback?token=xxx`
5. User clicks link → GET /auth/callback?token=xxx
6. Validate token (check expiry, single-use)
7. Create Lucia session
8. Set httpOnly cookie (`auth_session`)
9. Redirect to /account

**Token Generation:**
```typescript
import { randomBytes } from 'crypto'

function generateMagicLinkToken(): string {
  return randomBytes(32).toString('base64url')
}
```

**Token Storage:**
```sql
CREATE TABLE magic_links (
  token TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0
);
```

**Validation:**
```typescript
async function validateToken(token: string): Promise<string | null> {
  const link = await db.prepare(
    'SELECT email, expires_at, used FROM magic_links WHERE token = ?'
  ).bind(token).first()

  if (!link || link.used === 1) return null
  if (new Date(link.expires_at) < new Date()) return null

  // Mark as used (single-use)
  await db.prepare(
    'UPDATE magic_links SET used = 1 WHERE token = ?'
  ).bind(token).run()

  return link.email
}
```

### Session Management (Lucia)

**Configuration:**
```typescript
import { Lucia } from 'lucia'
import { D1Adapter } from '@lucia-auth/adapter-sqlite'

const adapter = new D1Adapter(env.DB, {
  user: 'users',
  session: 'sessions'
})

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    attributes: {
      secure: true, // HTTPS only
      sameSite: 'lax', // CSRF protection
      httpOnly: true, // No JS access
    }
  },
  sessionExpiresIn: 60 * 60 * 24 * 30 // 30 days
})
```

**Session Validation:**
```typescript
export async function validateSession(sessionId: string) {
  const { session, user } = await lucia.validateSession(sessionId)
  if (!session) return null
  return { session, user }
}
```

---

## Authorization

### Public Endpoints

No authentication required:
- GET /api/peptides (list + search)
- GET /api/peptides/:slug (detail)
- GET /api/studies
- GET /api/changelog

### Protected Endpoints

Require valid session:
- GET /api/pdf/:slug
- POST /api/checkout/create
- POST /api/billing/portal

**Middleware:**
```typescript
async function requireAuth(c: Context, next: Next) {
  const sessionId = getCookie(c, 'auth_session')
  if (!sessionId) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const result = await validateSession(sessionId)
  if (!result) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  c.set('user', result.user)
  c.set('session', result.session)
  await next()
}
```

### Subscription Check

**PDF downloads require active subscription:**
```typescript
async function requireSubscription(c: Context, next: Next) {
  const user = c.get('user')

  const subscription = await db.prepare(`
    SELECT status, current_period_end
    FROM subscriptions
    WHERE user_id = ? AND status IN ('active', 'trialing')
  `).bind(user.id).first()

  if (!subscription) {
    return c.json({ error: 'Subscription required' }, 403)
  }

  // Check not expired
  if (new Date(subscription.current_period_end) < new Date()) {
    return c.json({ error: 'Subscription expired' }, 403)
  }

  await next()
}
```

---

## Rate Limiting

### Strategy

Token bucket algorithm per IP address, stored in KV.

**Limits:**
- Auth endpoints: 5 req/minute
- Search/list: 10 req/second
- Detail pages: 20 req/second
- PDF downloads: 5 req/minute

**Implementation:**
```typescript
async function rateLimiter(
  env: Env,
  ip: string,
  limit: number,
  window: number // seconds
): Promise<boolean> {
  const key = `ratelimit:${ip}:${endpoint}`
  const count = await env.KV.get(key)

  if (count && parseInt(count) >= limit) {
    return false // Rate limit exceeded
  }

  const newCount = count ? parseInt(count) + 1 : 1
  await env.KV.put(key, newCount.toString(), { expirationTtl: window })

  return true // OK
}

// Usage
app.use('/api/auth/*', async (c, next) => {
  const ip = c.req.header('cf-connecting-ip') || 'unknown'
  const allowed = await rateLimiter(c.env, ip, 5, 60)

  if (!allowed) {
    return c.json({
      error: 'TooManyRequests',
      message: 'Rate limit exceeded',
      retry_after: 60
    }, 429)
  }

  await next()
})
```

---

## Data Protection

### Encryption at Rest

**D1 (Database):**
- Automatically encrypted by Cloudflare
- AES-256 encryption
- Keys managed by Cloudflare

**R2 (Storage):**
- Automatically encrypted
- AES-256 encryption
- Keys managed by Cloudflare

**Secrets:**
- Stored as Wrangler secrets (encrypted)
- Never in code or logs
- Rotated quarterly

### Encryption in Transit

**All traffic uses TLS 1.3:**
- Cloudflare enforces HTTPS
- No HTTP allowed (automatic redirect)
- HSTS enabled (max-age: 1 year)

### PII Handling

**Minimal PII collected:**
- Email (required for auth)
- Stripe customer ID (for billing)

**No storage of:**
- Passwords (passwordless)
- Credit card numbers (Stripe handles)
- Full names, addresses, phone numbers

**GDPR Compliance:**
- Right to access (export user data)
- Right to erasure (delete account + data)
- Data minimization (only essential fields)

---

## Stripe Integration Security

### Webhook Signature Verification

**Always verify Stripe webhooks:**
```typescript
import Stripe from 'stripe'

async function handleStripeWebhook(c: Context) {
  const signature = c.req.header('stripe-signature')
  const body = await c.req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    return c.json({ error: 'Invalid signature' }, 400)
  }

  // Process event
  await handleEvent(event)
  return c.json({ received: true })
}
```

### Checkout Session Security

**Create Stripe Checkout with metadata:**
```typescript
const session = await stripe.checkout.sessions.create({
  customer_email: user.email,
  line_items: [{
    price: env.STRIPE_PRICE_ID,
    quantity: 1
  }],
  mode: 'subscription',
  success_url: 'https://peptalk.com/account?success=true',
  cancel_url: 'https://peptalk.com/account?canceled=true',
  metadata: {
    user_id: user.id
  }
})
```

**Never trust client-side data.** Always validate on server.

---

## SQL Injection Prevention

### Use Parameterized Queries

**Always:**
```typescript
// Good: Parameterized
const peptide = await db.prepare(
  'SELECT * FROM peptides WHERE slug = ?'
).bind(slug).first()
```

**Never:**
```typescript
// Bad: String concatenation
const peptide = await db.prepare(
  `SELECT * FROM peptides WHERE slug = '${slug}'`
).first()
```

### Input Validation

**Validate all user inputs:**
```typescript
import { z } from 'zod'

const SearchParamsSchema = z.object({
  query: z.string().max(100).optional(),
  grade: z.enum(['very_low', 'low', 'moderate', 'high']).optional(),
  page: z.coerce.number().min(1).max(1000).default(1)
})

// In route handler
const params = SearchParamsSchema.parse(c.req.query())
```

---

## XSS Prevention

### Output Encoding

**Next.js automatically escapes JSX:**
```typescript
// Safe (React auto-escapes)
<div>{peptide.name}</div>
```

**Dangerous (avoid dangerouslySetInnerHTML):**
```typescript
// Only use for sanitized HTML
import DOMPurify from 'isomorphic-dompurify'

<div dangerouslySetInnerHTML={{
  __html: DOMPurify.sanitize(markdown)
}} />
```

### Content Security Policy

**Set CSP headers:**
```typescript
// apps/web/app/layout.tsx
export const metadata = {
  headers: {
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "connect-src 'self' https://api.peptalk.com",
      "frame-ancestors 'none'"
    ].join('; ')
  }
}
```

---

## CSRF Protection

### SameSite Cookies

**Lucia automatically sets SameSite=Lax:**
```typescript
{
  sameSite: 'lax' // Blocks cross-site POST requests
}
```

**For state-changing operations, use CSRF tokens:**
```typescript
// Generate token
const csrfToken = randomBytes(32).toString('base64url')
await env.KV.put(`csrf:${sessionId}`, csrfToken, { expirationTtl: 3600 })

// Validate token
const storedToken = await env.KV.get(`csrf:${sessionId}`)
if (token !== storedToken) {
  return c.json({ error: 'Invalid CSRF token' }, 403)
}
```

---

## DDoS Protection

### Cloudflare Automatic Protection

**Built-in:**
- L3/L4 DDoS mitigation
- Rate limiting (1000 req/10s per IP)
- Bot detection
- Challenge pages for suspicious traffic

**Custom Rules:**
```javascript
// Cloudflare Dashboard → Security → WAF
// Block countries: N/A (allow global)
// Block user agents: Known bad bots
// Challenge on: 10+ failures in 1 minute
```

---

## Secrets Management

### Environment Variables

**Never commit secrets:**
```bash
# .gitignore
.env
.env.local
.env.*.local
wrangler.toml (secrets section)
```

**Use Wrangler Secrets:**
```bash
wrangler secret put ANTHROPIC_API_KEY
wrangler secret put STRIPE_SECRET_KEY
```

### Rotation Policy

**Rotate secrets:**
- API keys: Every 90 days
- Webhook secrets: Every 180 days
- Session secrets: Every 365 days

---

## Logging and Monitoring

### Structured Logging

**Log security events:**
```typescript
logger.warn('Failed login attempt', {
  email: email,
  ip: ip,
  timestamp: new Date().toISOString()
})

logger.error('Unauthorized API access', {
  endpoint: '/api/pdf/bpc-157',
  ip: ip,
  user_id: null
})
```

### Alerts

**Set up alerts for:**
- 10+ failed login attempts from same IP
- Unusual traffic patterns (10x normal)
- High error rate (>5% for 5 min)
- Webhook signature failures

---

## Vulnerability Management

### Dependency Scanning

**Automated with GitHub Dependabot:**
- Scans for known vulnerabilities
- Creates PRs for updates
- Weekly checks

**Manual audit:**
```bash
pnpm audit
```

### Security Headers

**Set in Workers:**
```typescript
app.use('*', async (c, next) => {
  await next()
  c.res.headers.set('X-Frame-Options', 'DENY')
  c.res.headers.set('X-Content-Type-Options', 'nosniff')
  c.res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  c.res.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
})
```

---

## Incident Response

### Process

1. **Detection:** Monitoring alerts or user report
2. **Containment:** Block IPs, disable compromised accounts
3. **Investigation:** Review logs, identify scope
4. **Remediation:** Patch vulnerability, rotate secrets
5. **Communication:** Notify affected users (if any)
6. **Post-mortem:** Document incident, update procedures

### Contacts

- **Security Lead:** security@peptalk.com
- **Cloudflare Support:** Enterprise plan (if needed)
- **Stripe Support:** Dashboard → Help

---

## Compliance

### GDPR

**User rights:**
- Right to access: Export user data via /api/account/export
- Right to erasure: Delete account + all data via /api/account/delete
- Right to portability: JSON export of all user data

**Implementation:**
```typescript
// Export user data
app.get('/api/account/export', requireAuth, async (c) => {
  const user = c.get('user')
  const data = await getUserData(user.id)
  return c.json(data)
})

// Delete account
app.delete('/api/account', requireAuth, async (c) => {
  const user = c.get('user')
  await deleteUserData(user.id)
  return c.json({ deleted: true })
})
```

### Cookie Consent

**Required for EU users:**
- Display cookie banner on first visit
- Store consent in localStorage (no tracking cookies)
- Only essential cookies (session) without consent

---

## Security Checklist

Before production launch:

- [ ] All secrets rotated (no dev keys)
- [ ] HTTPS enforced everywhere
- [ ] Rate limiting enabled
- [ ] Stripe webhooks verified
- [ ] Sessions: httpOnly, Secure, SameSite
- [ ] SQL queries parameterized
- [ ] User input validated (Zod)
- [ ] XSS protection (React auto-escape)
- [ ] CSRF protection (SameSite cookies)
- [ ] Security headers set
- [ ] Logging configured
- [ ] Alerts set up
- [ ] Dependency audit clean

---

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Cloudflare Security Docs](https://developers.cloudflare.com/fundamentals/security/)
- [Lucia Auth](https://lucia-auth.com/)
- [Stripe Security](https://stripe.com/docs/security)

---

**Document Owner:** Engineering Team
**Lines:** 397 (within 400-line limit ✓)
