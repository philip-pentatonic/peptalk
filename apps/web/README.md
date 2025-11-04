# peptalk-web

Next.js 14 frontend application for PepTalk.

## Purpose

This is the user-facing web application that provides:
- Public peptide browsing and search
- Individual peptide detail pages
- Authentication (magic link login)
- User account dashboard
- Subscription management
- PDF downloads (for subscribers)

## Tech Stack

- **Next.js 14** - App Router with React Server Components
- **Cloudflare Pages** - Edge deployment
- **TailwindCSS** - Styling
- **Radix UI** - Accessible components
- **@peptalk/ui** - Shared component library

## Development

### Start Dev Server

```bash
pnpm dev
```

Access at http://localhost:3000

### Build for Production

```bash
pnpm build
pnpm start
```

### Type Check

```bash
pnpm typecheck
```

### Run Tests

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e
```

## Project Structure

```
apps/web/
├── app/                      # Next.js App Router
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # Home page
│   ├── peptides/
│   │   ├── page.tsx          # Peptide list
│   │   └── [slug]/
│   │       └── page.tsx      # Peptide detail
│   ├── auth/
│   │   ├── login/
│   │   │   └── page.tsx      # Login page
│   │   └── callback/
│   │       └── page.tsx      # Magic link callback
│   ├── account/
│   │   └── page.tsx          # User dashboard
│   ├── pricing/
│   │   └── page.tsx          # Subscription pricing
│   └── api/                  # Route handlers (optional, prefer Workers)
├── components/               # React components
│   ├── PeptideList.tsx
│   ├── PeptideDetail.tsx
│   ├── SearchBar.tsx
│   └── Header.tsx
├── lib/                      # Client utilities
│   ├── api.ts                # API client
│   └── auth.ts               # Auth helpers
├── public/
│   └── assets/               # Static assets
└── README.md
```

## Routes

### Public Routes

- `/` - Home page with featured peptides
- `/peptides` - List all peptides with search/filters
- `/peptides/[slug]` - Individual peptide detail page
- `/pricing` - Subscription pricing
- `/about` - About PepTalk

### Auth Routes

- `/auth/login` - Login page (magic link form)
- `/auth/callback` - Magic link callback handler

### Protected Routes

- `/account` - User dashboard
- `/account/subscription` - Manage subscription

## Features

### Peptide List Page

**Route:** `/peptides`

**Features:**
- Search by name or alias
- Filter by evidence grade
- Sort by name or evidence quality
- Pagination (20 per page)

**Example:**

```typescript
import { PeptideList } from '@/components/PeptideList'

export default async function PeptidesPage({
  searchParams
}: {
  searchParams: { q?: string; grade?: string; page?: string }
}) {
  const { peptides, total } = await fetch('/api/peptides', {
    query: searchParams.q,
    evidenceGrade: searchParams.grade,
    page: parseInt(searchParams.page || '1')
  })

  return <PeptideList peptides={peptides} total={total} />
}
```

### Peptide Detail Page

**Route:** `/peptides/[slug]`

**Features:**
- Full synthesized content
- Evidence grade badge
- Study list with links
- PDF download (subscribers only)
- Last updated timestamp

**Example:**

```typescript
import { PeptideDetail } from '@/components/PeptideDetail'

export default async function PeptidePage({
  params
}: {
  params: { slug: string }
}) {
  const peptide = await fetch(`/api/peptides/${params.slug}`)

  return <PeptideDetail peptide={peptide} />
}
```

### Search

**Component:** `<SearchBar />`

**Features:**
- Real-time search as you type (debounced)
- Full-text search across peptide names, aliases, and study titles
- Keyboard shortcuts (CMD+K to focus)

**Example:**

```typescript
'use client'

import { SearchBar } from '@/components/SearchBar'

export function Header() {
  return (
    <header>
      <SearchBar
        onSearch={(query) => router.push(`/peptides?q=${query}`)}
        placeholder="Search peptides..."
      />
    </header>
  )
}
```

### Authentication

**Magic Link Flow:**

1. User enters email at `/auth/login`
2. System sends magic link via Resend
3. User clicks link → redirected to `/auth/callback?token=...`
4. System validates token and creates session
5. User redirected to `/account`

**Example:**

```typescript
// app/auth/login/page.tsx
'use client'

import { useState } from 'react'
import { Button, Input } from '@peptalk/ui'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetch('/api/auth/send-magic-link', {
      method: 'POST',
      body: JSON.stringify({ email })
    })
    setSent(true)
  }

  return sent ? (
    <p>Check your email for a login link!</p>
  ) : (
    <form onSubmit={handleSubmit}>
      <Input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
      />
      <Button type="submit">Send Magic Link</Button>
    </form>
  )
}
```

### Subscription Management

**Route:** `/account/subscription`

**Features:**
- Current subscription status
- Billing history
- Update payment method
- Cancel subscription
- Customer Portal link (Stripe)

**Example:**

```typescript
import { Button } from '@peptalk/ui'

export default async function SubscriptionPage() {
  const subscription = await getSubscription()

  return (
    <div>
      <h1>Subscription</h1>
      <p>Status: {subscription.status}</p>
      <p>Renews: {subscription.currentPeriodEnd}</p>

      <form action="/api/billing/portal" method="POST">
        <Button type="submit">Manage Billing</Button>
      </form>
    </div>
  )
}
```

## API Client

**File:** `lib/api.ts`

Wrapper for API calls to Cloudflare Workers backend.

```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL

export async function getPeptides(options: {
  query?: string
  evidenceGrade?: string
  page?: number
}) {
  const params = new URLSearchParams()
  if (options.query) params.set('q', options.query)
  if (options.evidenceGrade) params.set('grade', options.evidenceGrade)
  if (options.page) params.set('page', options.page.toString())

  const res = await fetch(`${API_BASE_URL}/api/peptides?${params}`)
  return res.json()
}

export async function getPeptide(slug: string) {
  const res = await fetch(`${API_BASE_URL}/api/peptides/${slug}`)
  return res.json()
}

export async function downloadPdf(slug: string) {
  const res = await fetch(`${API_BASE_URL}/api/pdf/${slug}`)
  return res.blob()
}
```

## Environment Variables

```bash
# API endpoint (Cloudflare Workers)
NEXT_PUBLIC_API_URL=http://localhost:8787

# Public URL
NEXT_PUBLIC_URL=http://localhost:3000

# Stripe (for checkout)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

## Styling

### TailwindCSS

Tailwind config in `tailwind.config.js`:

```javascript
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          500: '#0066cc'
        }
      }
    }
  }
}
```

### Using @peptalk/ui

Import components from shared library:

```typescript
import { Button, Card, Heading, EvidenceGradeBadge } from '@peptalk/ui'

export function PeptideCard({ peptide }) {
  return (
    <Card>
      <Heading level={3}>{peptide.name}</Heading>
      <EvidenceGradeBadge grade={peptide.evidenceGrade} />
      <Button>View Details</Button>
    </Card>
  )
}
```

## Deployment

### Cloudflare Pages

**Build Command:**

```bash
pnpm build
```

**Output Directory:**

```
.next
```

**Environment Variables:**

Set in Cloudflare Pages dashboard:
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_URL`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

See [docs/06-deployment.md](../../docs/06-deployment.md) for complete guide.

## Testing

### Unit Tests

Located in `__tests__/` or `*.test.tsx` files:

```typescript
import { render, screen } from '@testing-library/react'
import { PeptideCard } from '@/components/PeptideCard'

describe('PeptideCard', () => {
  it('renders peptide name', () => {
    render(<PeptideCard peptide={{ name: 'BPC-157' }} />)
    expect(screen.getByText('BPC-157')).toBeInTheDocument()
  })
})
```

### E2E Tests

Located in `tests/e2e/`:

```typescript
import { test, expect } from '@playwright/test'

test('search peptides', async ({ page }) => {
  await page.goto('/peptides')
  await page.fill('input[placeholder="Search peptides..."]', 'BPC')
  await expect(page.locator('text=BPC-157')).toBeVisible()
})
```

## Performance

### Server Components

Use React Server Components by default:

```typescript
// This is a Server Component (default)
export default async function Page() {
  const data = await fetch('/api/peptides')
  return <PeptideList peptides={data.peptides} />
}
```

### Client Components

Mark with `'use client'` only when needed:

```typescript
'use client'

import { useState } from 'react'

export function SearchBar() {
  const [query, setQuery] = useState('')
  // Interactive component needs client-side JS
}
```

### Static Generation

Pre-render pages at build time when possible:

```typescript
export async function generateStaticParams() {
  const peptides = await fetch('/api/peptides')
  return peptides.map((p) => ({ slug: p.slug }))
}

export default async function PeptidePage({ params }) {
  // Page is pre-rendered at build time
  const peptide = await fetch(`/api/peptides/${params.slug}`)
  return <PeptideDetail peptide={peptide} />
}
```

## Related Documentation

- [docs/01-architecture.md](../../docs/01-architecture.md) - System architecture
- [docs/03-api-reference.md](../../docs/03-api-reference.md) - API endpoints
- [docs/06-deployment.md](../../docs/06-deployment.md) - Deployment guide
- [Next.js Docs](https://nextjs.org/docs)
