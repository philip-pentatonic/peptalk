# PepTalk — Build Plan for Claude

**Version:** 1.0
**Date:** 2025-11-04
**Target:** 4-week MVP delivery

---

## Quick Reference

This is the master build plan optimized for Claude Code agents working in parallel. All detailed documentation is broken into focused files (<400 lines each).

### Core Documents
- [00-overview.md](./00-overview.md) - System overview & tech stack
- [01-architecture.md](./01-architecture.md) - Component architecture & data flows
- [02-database-schema.md](./02-database-schema.md) - Complete database design
- [03-api-reference.md](./03-api-reference.md) - All API endpoints
- [04-research-pipeline.md](./04-research-pipeline.md) - Pipeline implementation details
- [05-llm-prompts.md](./05-llm-prompts.md) - Claude 4.5 & GPT-5 prompts
- [06-deployment.md](./06-deployment.md) - Cloudflare deployment guide
- [07-testing.md](./07-testing.md) - Testing strategy
- [08-security.md](./08-security.md) - Security architecture
- [09-cost-model.md](./09-cost-model.md) - Cost projections
- [10-runbook.md](./10-runbook.md) - Operations & troubleshooting
- [11-stripe-integration.md](./11-stripe-integration.md) - Payment flows

### Development Guides
- [git-worktrees.md](./git-worktrees.md) - Parallel development workflow
- [code-standards.md](./code-standards.md) - 400-line rule & composability
- [contributing.md](./contributing.md) - PR process
- [project-structure.md](./project-structure.md) - Directory layout

---

## Technology Stack

### Frontend
- Next.js 14 (App Router) + Cloudflare Pages
- React 18 + TailwindCSS + Radix UI

### Backend
- Cloudflare Workers (Hono)
- D1 (SQLite + FTS5)
- R2 (Object storage)

### Research Pipeline
- Claude Sonnet 4.5 (synthesis)
- GPT-5 (compliance)
- PubMed + ClinicalTrials.gov APIs
- Puppeteer (PDF rendering)

### Auth & Payments
- Lucia (sessions) + Resend (email)
- Stripe (subscriptions)

---

## Development Approach

### Code Standards
- **Max 400 lines/file** (enforced via linter)
- Single responsibility per module
- Strict TypeScript, no `any` types
- Atomic components

### Git Worktrees Strategy
Four parallel branches using worktrees:

1. **research-pipeline** - Agent 1: Ingest → Synthesis → Publish
2. **frontend** - Agent 2: Next.js app + UI components
3. **api-workers** - Agent 3: Cloudflare Workers API
4. **auth-payments** - Agent 4: Lucia + Stripe integration

See [git-worktrees.md](./git-worktrees.md) for setup instructions.

---

## 4-Week Build Plan

### Week 1-2: Research Pipeline (Agent 1)
**Branch:** `research-pipeline`

#### Deliverables
- [ ] Monorepo setup (pnpm + TypeScript)
- [ ] Database schema + D1 migrations
- [ ] Zod schemas (SourcePack, PageRecord, Study)
- [ ] PubMed ingest (client + parser + mapper)
- [ ] ClinicalTrials.gov ingest (client + parser + mapper)
- [ ] Study normalizer (deduplication + type inference)
- [ ] Evidence rubric engine
- [ ] Claude 4.5 synthesis service
- [ ] GPT-5 compliance service
- [ ] Publisher (JSON + MD + PDF + D1 + R2)
- [ ] CLI (run-single + run-batch)

**Key Files:** See [04-research-pipeline.md](./04-research-pipeline.md)

---

### Week 3: Frontend & API (Agents 2 & 3)

#### Agent 2: Frontend
**Branch:** `frontend`

##### Deliverables
- [ ] Next.js app structure
- [ ] Homepage
- [ ] Peptide list page (search + filters)
- [ ] Peptide detail page
- [ ] Changelog page
- [ ] Auth pages (login + callback)
- [ ] Account dashboard
- [ ] Atomic UI components (<400 lines each)

**Key Files:** See [project-structure.md](./project-structure.md#frontend)

#### Agent 3: API
**Branch:** `api-workers`

##### Deliverables
- [ ] Cloudflare Workers setup (Hono)
- [ ] GET /api/peptides (list + search)
- [ ] GET /api/peptides/:slug (detail)
- [ ] GET /api/studies (query)
- [ ] GET /api/pdf/:slug (signed URL)
- [ ] POST /api/ingest/run (cron trigger)
- [ ] Middleware (rate limiter + error handler + CORS)

**Key Files:** See [03-api-reference.md](./03-api-reference.md)

---

### Week 4: Auth & Subscriptions (Agent 4)

**Branch:** `auth-payments`

#### Deliverables
- [ ] Lucia auth + D1 adapter
- [ ] Magic link service (Resend)
- [ ] Session management
- [ ] Stripe integration
  - [ ] Checkout flow
  - [ ] Customer Portal
  - [ ] Webhook handler (subscription events)
- [ ] Account UI (subscription status + billing)
- [ ] Protected routes (PDF downloads)

**Key Files:** See [11-stripe-integration.md](./11-stripe-integration.md)

#### Agent 1 (Parallel)
- [ ] Scheduled cron jobs (nightly ingest + weekly digest)
- [ ] Changelog generator
- [ ] Error alerting

---

## Project Structure

```
peptalk/
├── apps/
│   ├── web/              # Next.js (Agent 2)
│   └── workers/          # Cloudflare Workers (Agent 3)
├── packages/
│   ├── research/         # Research pipeline (Agent 1)
│   ├── database/         # Schema + queries (All agents)
│   ├── schemas/          # Zod schemas (All agents)
│   ├── payments/         # Stripe (Agent 4)
│   └── ui/               # Shared components (Agent 2)
├── content/              # Generated peptide pages
├── storage/              # PDF outputs (for R2)
├── catalog/              # peptides.yaml (initial 20)
└── docs/                 # This directory
```

See [project-structure.md](./project-structure.md) for full details.

---

## Initial Tasks

### For All Agents

1. **Set up worktree**
   ```bash
   git worktree add worktree/<branch-name> -b <branch-name>
   cd worktree/<branch-name>
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Create package structure**
   - Follow 400-line rule
   - One responsibility per file
   - Export types alongside implementations

4. **Write tests**
   - Unit tests for all logic
   - Integration tests for flows
   - 80% coverage minimum

5. **Merge frequently**
   - Merge to main daily
   - Resolve conflicts early
   - Keep PRs small (<500 lines)

---

## Key Technical Decisions

### Why these choices?

**Claude 4.5 + GPT-5:** Latest models for quality synthesis and compliance
**Max 400 lines/file:** Forces modularity, easier reviews, better tests
**Git worktrees:** True parallel development without branch juggling
**Cloudflare:** Edge-first for latency + economics
**Monorepo:** Shared types, coordinated releases
**Strict TypeScript:** Catch errors at compile time

See [00-overview.md](./00-overview.md#key-technical-decisions) for rationale.

---

## Cost Model

### MVP Costs
- **One-time:** $80-120 (initial 20 peptides)
- **Monthly:** $85-125 (LLM updates + infra)
- **Per transaction:** 2.9% + $0.30 (Stripe)

See [09-cost-model.md](./09-cost-model.md) for detailed breakdown.

---

## Success Metrics

### MVP Goals
- 20 peptides published
- All pass compliance
- <5% pipeline error rate
- <2s page load time
- 100% uptime

### Business (3 months)
- 100 signups
- 20 paid subscribers
- $2000 MRR

---

## Getting Help

### Documentation Issues
If docs are unclear or missing details, check:
1. Relevant detailed doc (01-architecture.md, etc.)
2. Package README (packages/*/README.md)
3. Code comments (inline documentation)

### Technical Blockers
- PubMed API issues → [04-research-pipeline.md](./04-research-pipeline.md#pubmed-client)
- LLM output errors → [05-llm-prompts.md](./05-llm-prompts.md#troubleshooting)
- Deployment errors → [06-deployment.md](./06-deployment.md#common-issues)

---

## Next Steps

1. ✅ Read this document
2. [ ] Review your assigned agent docs
3. [ ] Set up git worktree
4. [ ] Create package structure
5. [ ] Begin implementation
6. [ ] Merge to main daily

---

**Document Owner:** Engineering Team
**Last Updated:** 2025-11-04
**Word Count:** ~350 lines (within 400-line limit ✓)
