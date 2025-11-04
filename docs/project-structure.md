# PepTalk — Project Structure

**Version:** 1.0
**Last Updated:** 2025-11-04

---

## Overview

This document details the complete directory structure, file organization, and responsibilities for each part of the codebase. Every file follows the **400-line maximum** rule for maintainability and composability.

---

## Root Structure

```
peptalk/
├── apps/                    # Application entry points
├── packages/                # Shared packages (monorepo)
├── content/                 # Generated peptide content
├── storage/                 # PDF outputs (local before R2)
├── catalog/                 # Configuration files
├── docs/                    # Documentation
├── .github/                 # CI/CD workflows
├── package.json             # Root package (workspaces)
├── pnpm-workspace.yaml      # pnpm configuration
├── tsconfig.json            # Shared TypeScript config
├── .eslintrc.js             # Linting rules (400-line check)
└── README.md                # Project readme
```

---

## apps/web/ (Next.js Frontend)

**Owner:** Agent 2
**Lines per file:** Max 400

```
apps/web/
├── app/                     # Next.js App Router
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Homepage
│   ├── globals.css          # Tailwind imports
│   │
│   ├── peptides/
│   │   ├── page.tsx         # List + search page
│   │   ├── layout.tsx       # Peptides layout
│   │   └── [slug]/
│   │       └── page.tsx     # Peptide detail (dynamic)
│   │
│   ├── changelog/
│   │   └── page.tsx         # Weekly digest feed
│   │
│   ├── auth/
│   │   ├── login/
│   │   │   └── page.tsx     # Magic link request
│   │   └── callback/
│   │       └── page.tsx     # Token verification
│   │
│   └── account/
│       ├── page.tsx         # User dashboard
│       └── billing/
│           └── page.tsx     # Subscription management
│
├── components/              # React components (atomic)
│   ├── layout/
│   │   ├── header.tsx       # Site header
│   │   ├── footer.tsx       # Site footer
│   │   └── nav.tsx          # Navigation menu
│   │
│   ├── peptides/
│   │   ├── peptide-card.tsx         # List item component
│   │   ├── peptide-list.tsx         # Grid container
│   │   ├── search-bar.tsx           # Search input
│   │   ├── filter-panel.tsx         # Filter controls
│   │   └── evidence-badge.tsx       # Grade indicator
│   │
│   ├── detail/
│   │   ├── disclaimer-banner.tsx    # Top warning
│   │   ├── evidence-snapshot.tsx    # Grade + counts
│   │   ├── protocols-table.tsx      # Studied protocols
│   │   ├── safety-section.tsx       # Adverse events
│   │   ├── legal-notes.tsx          # Regulatory status
│   │   └── citation-list.tsx        # References
│   │
│   └── account/
│       ├── subscription-status.tsx  # Active/expired badge
│       ├── billing-button.tsx       # Portal link
│       └── settings-form.tsx        # User preferences
│
├── lib/
│   ├── api-client.ts        # Fetch wrapper for Workers API
│   ├── auth-client.ts       # Session helpers
│   ├── utils.ts             # Shared utilities (date, format)
│   └── constants.ts         # App constants
│
├── public/
│   ├── favicon.ico
│   └── assets/
│       └── logo.svg
│
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── README.md
```

### File Responsibilities

#### app/page.tsx (Homepage)
- Value proposition
- Sample peptide link
- CTA for signup
- Footer with disclaimer

#### app/peptides/page.tsx (List)
- Search bar (FTS query)
- Filter panel (grade, human only)
- Peptide grid (cards)
- Pagination
- Server component (SSR)

#### app/peptides/[slug]/page.tsx (Detail)
- Fetch peptide data (SSR)
- Disclaimer banner
- Evidence snapshot
- Markdown content sections
- PDF download button (auth check)

#### components/peptides/peptide-card.tsx
- Name + aliases
- Evidence badge
- Study counts
- Last reviewed date
- Click → detail page

---

## apps/workers/ (Cloudflare Workers)

**Owner:** Agent 3
**Lines per file:** Max 400

```
apps/workers/
├── src/
│   ├── index.ts             # Hono app entry point
│   │
│   ├── api/                 # API route handlers (1 per file)
│   │   ├── peptides-list.ts         # GET /api/peptides
│   │   ├── peptides-detail.ts       # GET /api/peptides/:slug
│   │   ├── studies-query.ts         # GET /api/studies
│   │   ├── pdf-download.ts          # GET /api/pdf/:slug
│   │   ├── checkout-create.ts       # POST /api/checkout/create
│   │   ├── billing-portal.ts        # POST /api/billing/portal
│   │   └── ingest-trigger.ts        # POST /api/ingest/run
│   │
│   ├── handlers/            # Middleware
│   │   ├── rate-limiter.ts  # KV-based rate limiting
│   │   ├── error-handler.ts # Structured error responses
│   │   ├── cors.ts          # CORS headers
│   │   └── auth.ts          # Session validation
│   │
│   ├── cron/                # Scheduled jobs
│   │   ├── nightly-ingest.ts        # Research updates
│   │   └── weekly-digest.ts         # Changelog build
│   │
│   └── webhooks/
│       └── stripe.ts        # Subscription events
│
├── wrangler.toml            # Cloudflare config
├── package.json
├── tsconfig.json
└── README.md
```

### File Responsibilities

#### src/index.ts
- Initialize Hono app
- Apply middleware (CORS, rate limit)
- Register routes
- Export default handler

#### src/api/peptides-list.ts
- Parse query params (query, grade, human_only, page)
- Query D1 (with FTS if query present)
- Apply filters
- Paginate results
- Return JSON

#### src/api/peptides-detail.ts
- Extract slug from params
- Query D1 for peptide + studies
- Read PageRecord JSON from content/
- Return combined data
- 404 if not found

#### src/handlers/rate-limiter.ts
- Extract IP from request
- Check KV for request count
- Increment counter
- Return 429 if over limit
- Set TTL (60 seconds)

---

## packages/research/ (Research Pipeline)

**Owner:** Agent 1
**Lines per file:** Max 400

```
packages/research/
├── ingest/
│   ├── pubmed/
│   │   ├── client.ts        # E-utilities API wrapper
│   │   ├── parser.ts        # XML → JSON
│   │   ├── mapper.ts        # JSON → Study schema
│   │   └── README.md
│   │
│   ├── clinicaltrials/
│   │   ├── client.ts        # CT.gov API wrapper
│   │   ├── parser.ts        # JSON parsing
│   │   ├── mapper.ts        # JSON → Study schema
│   │   └── README.md
│   │
│   ├── normalizer/
│   │   ├── deduplicator.ts  # Remove duplicate studies
│   │   ├── type-inferer.ts  # Infer study type (RCT/obs/animal)
│   │   └── README.md
│   │
│   ├── index.ts             # Orchestrator (calls all above)
│   └── README.md
│
├── synthesis/
│   ├── claude-client.ts     # Anthropic SDK wrapper
│   ├── prompts.ts           # System + user prompts
│   ├── parser.ts            # Extract JSON + Markdown
│   ├── validator.ts         # Validate PageRecord schema
│   └── README.md
│
├── compliance/
│   ├── gpt-client.ts        # OpenAI SDK wrapper
│   ├── regex-rules.ts       # Static checks (prescriptive language)
│   ├── citation-checker.ts  # Verify all PMID/NCT in text
│   ├── validator.ts         # Final pass (LLM + regex)
│   └── README.md
│
├── rubric/
│   ├── grader.ts            # Apply evidence rubric
│   ├── rules.ts             # Rubric logic (very_low → high)
│   ├── rationale.ts         # Explanation generation
│   └── README.md
│
├── publisher/
│   ├── writer.ts            # Write JSON + MD to content/
│   ├── pdf-renderer.ts      # Puppeteer PDF generation
│   ├── r2-uploader.ts       # Upload to R2
│   ├── db-writer.ts         # Insert/update D1 records
│   └── README.md
│
├── cli/
│   ├── run-single.ts        # Process one peptide
│   ├── run-batch.ts         # Process from YAML list
│   ├── logger.ts            # Structured logging
│   └── README.md
│
├── package.json
├── tsconfig.json
└── README.md
```

### File Responsibilities

#### ingest/pubmed/client.ts
- Search PubMed by peptide name
- Fetch article details by PMID
- Handle rate limiting (3 req/sec)
- Return raw XML

#### ingest/pubmed/parser.ts
- Parse XML to JSON
- Extract: title, abstract, MeSH terms, year
- Handle missing fields gracefully

#### ingest/pubmed/mapper.ts
- Map JSON to Study schema
- Generate ID (PMID:12345)
- Set registry = 'pubmed'
- Return Study object

#### synthesis/claude-client.ts
- Call Anthropic API
- Pass system prompt + SourcePack
- Handle retries (3x with backoff)
- Return raw completion

#### compliance/citation-checker.ts
- Extract all PMID/NCT from citations array
- Search for each in markdown text
- Return missing citations
- Fail if any missing

---

## packages/database/ (Schema & Queries)

**All Agents**
**Lines per file:** Max 400

```
packages/database/
├── schema/                  # Table definitions (Drizzle or raw SQL)
│   ├── peptides.ts          # peptides table
│   ├── studies.ts           # studies + studies_fts
│   ├── legal-notes.ts       # legal_notes table
│   ├── page-versions.ts     # page_versions table
│   ├── users.ts             # users table
│   ├── sessions.ts          # sessions table
│   ├── subscriptions.ts     # subscriptions table
│   ├── changelog.ts         # changelog table
│   └── README.md
│
├── migrations/
│   ├── 0001-initial.sql     # Core tables
│   ├── 0002-fts.sql         # FTS5 indexes
│   ├── 0003-subscriptions.sql
│   └── README.md
│
├── queries/
│   ├── peptides.ts          # Peptide CRUD + search
│   ├── studies.ts           # Study queries
│   ├── users.ts             # User CRUD
│   ├── subscriptions.ts     # Subscription queries
│   └── README.md
│
├── client.ts                # D1 client singleton
├── package.json
├── tsconfig.json
└── README.md
```

### File Responsibilities

#### schema/peptides.ts
- Define peptides table structure
- Indexes (slug, evidence_grade)
- Type exports

#### queries/peptides.ts
- `getPeptideBySlug(db, slug)`
- `searchPeptides(db, query, filters)`
- `updatePeptide(db, id, data)`
- Max 400 lines total

---

## packages/schemas/ (Zod Schemas)

**All Agents**
**Lines per file:** Max 400

```
packages/schemas/
├── source-pack.ts           # Ingest output schema
├── page-record.ts           # Synthesis output schema
├── study.ts                 # Study schema
├── validation.ts            # Shared validators
├── package.json
├── tsconfig.json
└── README.md
```

### File Responsibilities

#### source-pack.ts
- Zod schema for SourcePack
- studies[] array
- meta object (search_notes, duplicates_removed)
- Export type + validator

#### page-record.ts
- Zod schema for PageRecord
- Peptide metadata
- Evidence snapshot
- Protocols, safety, regulatory
- Citations array
- Export type + validator

---

## packages/payments/ (Stripe)

**Owner:** Agent 4
**Lines per file:** Max 400

```
packages/payments/
├── stripe-client.ts         # Stripe SDK wrapper
├── subscription.ts          # Subscription CRUD logic
├── webhook-handler.ts       # Event routing
├── billing-portal.ts        # Customer Portal integration
├── package.json
├── tsconfig.json
└── README.md
```

### File Responsibilities

#### stripe-client.ts
- Initialize Stripe with secret key
- Singleton pattern
- Export client instance

#### subscription.ts
- `createSubscription(userId, priceId)`
- `updateSubscriptionStatus(stripeSubId, status)`
- `cancelSubscription(stripeSubId)`
- All < 400 lines

---

## content/ (Generated Content)

**Auto-generated by research pipeline**

```
content/
└── peptides/
    ├── bpc-157.json         # PageRecord JSON
    ├── bpc-157.md           # Rendered markdown
    ├── tb-500.json
    ├── tb-500.md
    └── ...
```

---

## storage/ (PDF Outputs)

**Local staging before R2 upload**

```
storage/
└── pages/
    ├── bpc-157/
    │   └── latest.pdf
    ├── tb-500/
    │   └── latest.pdf
    └── ...
```

---

## catalog/ (Configuration)

```
catalog/
└── peptides.yaml            # Initial 20 peptides list
```

**Format:**
```yaml
peptides:
  - name: "BPC-157"
    aliases: ["Body Protection Compound"]
    regions: ["UK", "EU", "US"]
  - name: "TB-500"
    aliases: ["Thymosin Beta-4"]
    regions: ["UK", "EU", "US"]
```

---

## docs/ (Documentation)

**This directory**

```
docs/
├── claude.md                # Master plan (this connects all docs)
├── 00-overview.md          # System overview
├── 01-architecture.md      # Component architecture
├── 02-database-schema.md   # DB schema
├── 03-api-reference.md     # API docs
├── 04-research-pipeline.md # Pipeline details
├── 05-llm-prompts.md       # Prompts
├── 06-deployment.md        # Deployment
├── 07-testing.md           # Testing
├── 08-security.md          # Security
├── 09-cost-model.md        # Costs
├── 10-runbook.md           # Operations
├── 11-stripe-integration.md # Payments
├── git-worktrees.md        # Worktree guide
├── code-standards.md       # Style guide
├── contributing.md         # PR process
└── project-structure.md    # This file
```

---

## File Size Enforcement

### ESLint Rule

Add to `.eslintrc.js`:

```javascript
rules: {
  'max-lines': ['error', {
    max: 400,
    skipBlankLines: true,
    skipComments: true
  }]
}
```

### Pre-commit Hook

`.git/hooks/pre-commit`:

```bash
#!/bin/bash
for file in $(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx|js|jsx)$'); do
  lines=$(wc -l < "$file")
  if [ "$lines" -gt 400 ]; then
    echo "Error: $file has $lines lines (max 400)"
    exit 1
  fi
done
```

---

## References

- [claude.md](./claude.md) - Master build plan
- [code-standards.md](./code-standards.md) - Detailed style guide
- [contributing.md](./contributing.md) - PR guidelines

---

**Document Owner:** Engineering Team
**Lines:** 373 (within 400-line limit ✓)
