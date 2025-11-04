# PepTalk — Project Status

**Last Updated:** 2025-11-04
**Current Phase:** Foundation Setup
**Progress:** 40% Complete

---

## Overview

PepTalk is a citation-first peptide evidence reference platform. We're building a system that ingests research from PubMed and ClinicalTrials.gov, synthesizes it using Claude 4.5, validates with GPT-5, and publishes structured pages with PDF downloads.

**Tech Stack:**
- Frontend: Next.js 14 + Cloudflare Pages
- Backend: Cloudflare Workers (Hono) + D1 + R2
- Research: Claude Sonnet 4.5 + GPT-5
- Auth: Lucia + Resend (magic links)
- Payments: Stripe (annual subscriptions)

---

## What's Been Completed

### ✅ Phase 1: Documentation (100% Complete)

**Location:** `/docs/`

**Files Created (16 docs, all <400 lines):**
1. `claude.md` - Master navigation hub (282 lines)
2. `00-overview.md` - System overview & tech decisions
3. `01-architecture.md` - Component architecture & data flows
4. `02-database-schema.md` - Complete D1 schema (398 lines)
5. `03-api-reference.md` - All API endpoints (398 lines)
6. `04-research-pipeline.md` - Pipeline implementation details (395 lines)
7. `05-llm-prompts.md` - Claude 4.5 & GPT-5 prompts (394 lines)
8. `06-deployment.md` - Cloudflare deployment guide (397 lines)
9. `07-testing.md` - Testing strategy (395 lines)
10. `08-security.md` - Security architecture (397 lines)
11. `09-cost-model.md` - Cost projections (392 lines)
12. `10-runbook.md` - Operations & troubleshooting (395 lines)
13. `11-stripe-integration.md` - Payment flows (394 lines)
14. `project-structure.md` - Directory layout (373 lines)
15. `git-worktrees.md` - Parallel development workflow (369 lines)
16. `code-standards.md` - 400-line rule & standards (394 lines)
17. `contributing.md` - PR process & guidelines (395 lines)

**Key Decisions Documented:**
- Max 400 lines per file (enforced via ESLint)
- Claude 4.5 for synthesis, GPT-5 for compliance
- Git worktrees for parallel development (4 agents)
- Cloudflare edge-first architecture
- Stripe for subscriptions ($99/year)
- No medical advice, only "reported, not recommended"

---

## What's In Progress

### 🔨 Phase 3: Directory Structure (In Progress)

**Current Task:** Creating package scaffolds and READMEs

**Completed:**
- ✅ All directories created (34 directories)
- ✅ Monorepo configuration files
- ✅ Root package.json with workspace scripts
- ✅ TypeScript config with path aliases
- ✅ ESLint config (400-line rule enforced)
- ✅ Prettier config
- ✅ .gitignore
- ✅ .env.example
- ✅ README.md
- ✅ STATUS.md

**Next Steps:**
1. Create package.json for each package
2. Create tsconfig.json for each package
3. Create README.md for each package (<400 lines)
4. Create placeholder/scaffold files

---

## What's Next

### 📋 Phase 3: Directory Structure (Pending)

**Goal:** Create all directories and scaffold files

**Structure to Create:**
```
peptalk/
├── apps/
│   ├── web/              # Next.js frontend
│   └── workers/          # Cloudflare Workers
├── packages/
│   ├── research/         # Research pipeline
│   ├── database/         # Schema + queries
│   ├── schemas/          # Zod schemas
│   ├── payments/         # Stripe integration
│   └── ui/               # Shared components
├── content/              # Generated peptide pages
├── storage/              # PDF outputs
├── catalog/              # peptides.yaml
└── tests/                # Integration & E2E tests
```

**For Each Package:**
- Create directory structure
- Add `package.json`
- Add `tsconfig.json`
- Add `README.md` (<400 lines)
- Add placeholder files

### 📋 Phase 4: Package READMEs (Pending)

**Goal:** Document each package's purpose and API

**Packages to Document:**
- `packages/research/` - Research pipeline overview
- `packages/research/ingest/` - PubMed + CT.gov clients
- `packages/research/synthesis/` - Claude 4.5 integration
- `packages/research/compliance/` - GPT-5 validation
- `packages/research/rubric/` - Evidence grading
- `packages/research/publisher/` - PDF + D1 + R2
- `packages/database/` - Schema + migrations + queries
- `packages/schemas/` - Zod schemas (SourcePack, PageRecord, Study)
- `packages/payments/` - Stripe integration
- `apps/web/` - Next.js app
- `apps/workers/` - Cloudflare Workers API

### 📋 Phase 5: Git Worktrees (Pending)

**Goal:** Set up parallel development branches

**Commands to Run:**
```bash
git init
git add .
git commit -m "Initial commit: Documentation & monorepo setup"

# Create worktree branches
git worktree add worktree/research-pipeline -b research-pipeline
git worktree add worktree/frontend -b frontend
git worktree add worktree/api-workers -b api-workers
git worktree add worktree/auth-payments -b auth-payments
```

### 📋 Phase 6: Implementation (Not Started)

**4 Parallel Tracks (via worktrees):**

**Agent 1: Research Pipeline (Week 1-2)**
- Ingest (PubMed + ClinicalTrials.gov)
- Normalize (deduplication + type inference)
- Grade (evidence rubric)
- Synthesize (Claude 4.5)
- Comply (GPT-5)
- Publish (JSON + MD + PDF + D1 + R2)

**Agent 2: Frontend (Week 3)**
- Next.js app structure
- Peptide list page (search + filters)
- Peptide detail page
- Auth pages (login + callback)
- Account dashboard

**Agent 3: API Workers (Week 3)**
- Hono router setup
- GET /api/peptides (list + search)
- GET /api/peptides/:slug (detail)
- GET /api/pdf/:slug (signed URLs)
- Middleware (rate limiting, auth, CORS)

**Agent 4: Auth & Payments (Week 4)**
- Lucia auth + D1 adapter
- Magic link service (Resend)
- Stripe Checkout flow
- Stripe webhook handler
- Customer Portal integration

---

## Key Files Reference

### Configuration Files
- `package.json` - Root package with workspaces
- `pnpm-workspace.yaml` - Workspace configuration
- `tsconfig.json` - Shared TypeScript config
- `.eslintrc.js` - Linting rules (400-line check)
- `.prettierrc` - Code formatting
- `wrangler.toml` - Cloudflare Workers config

### Documentation
- `docs/claude.md` - Master plan (start here)
- `docs/project-structure.md` - Directory layout
- `docs/code-standards.md` - Development standards
- `docs/git-worktrees.md` - Parallel development guide

### Implementation Guides
- `docs/04-research-pipeline.md` - Pipeline implementation
- `docs/03-api-reference.md` - API endpoints
- `docs/02-database-schema.md` - Database design
- `docs/05-llm-prompts.md` - LLM prompts

---

## Commands

### Setup (Not Yet Run)
```bash
# Install dependencies
pnpm install

# Initialize database (local)
pnpm wrangler d1 execute peptalk-db --local --file=packages/database/migrations/0001-initial.sql

# Run type check
pnpm typecheck

# Run tests
pnpm test

# Start development
pnpm dev
```

### Development Workflow
```bash
# Create worktree for Agent 1
cd worktree/research-pipeline

# Make changes, commit frequently
git add .
git commit -m "feat(research): add PubMed client"

# Merge to main daily
cd ../..
git checkout main
git merge research-pipeline
```

---

## Context for New Agent/Session

### If You're Starting Fresh

1. **Read `docs/claude.md`** - Master plan with all links
2. **Check this file (`STATUS.md`)** - Current progress
3. **Review last todo** - See what's in progress
4. **Read relevant docs:**
   - `docs/project-structure.md` - Directory layout
   - `docs/code-standards.md` - 400-line rule
   - Component-specific docs as needed

### What NOT to Change

- Documentation structure (already complete)
- 400-line rule (enforced by design)
- Tech stack choices (documented in 00-overview.md)
- Git worktree strategy (documented in git-worktrees.md)

### What TO Focus On

- Completing monorepo setup
- Creating directory structure
- Writing package scaffolds
- Following 400-line rule strictly
- Documenting as you go (update this file!)

---

## Questions & Decisions Log

### Q: Why 400 lines per file?
**A:** Forces modularity, easier code review, better testability, prevents "god objects"

### Q: Why Claude 4.5 + GPT-5?
**A:** Claude 4.5 for medical synthesis (citation discipline), GPT-5 for compliance verification (variety)

### Q: Why git worktrees instead of branches?
**A:** True parallel development without branch switching, 4 agents work simultaneously

### Q: Why Cloudflare instead of Vercel/AWS?
**A:** Edge-first for latency + cost efficiency, D1/R2 integrated, generous free tier

### Q: Why annual subscriptions ($99/year)?
**A:** Lower churn, better cash flow, aligns with research update cycles

---

## Risks & Mitigations

### Risk: LLM Costs Too High
**Status:** Monitored
**Mitigation:** Batch processing, cache SourcePacks, use smaller models for simple tasks
**Details:** See `docs/09-cost-model.md`

### Risk: D1 Row Limit (100k free)
**Status:** Not Yet an Issue
**Mitigation:** Migrate to Neon Postgres at ~10k peptides
**Threshold:** Current = 0, Alert at 50k

### Risk: Context Loss Between Sessions
**Status:** Mitigated
**Mitigation:** Comprehensive documentation, this STATUS.md file
**Action:** Always update STATUS.md before ending session

---

## Cost Tracking

### One-Time Setup Costs
- Initial 20 peptides (LLM synthesis): **$80-120** (not yet incurred)

### Monthly Recurring Costs
- LLM updates (weekly, 5 peptides): **$80-120/month** (not yet incurred)
- Cloudflare infrastructure: **$0-2/month** (not yet incurred)
- Resend (email): **$0** (free tier)
- Stripe fees: **2.9% + $0.30 per transaction**

**Break-Even:** 14 subscribers @ $99/year = $1386/year ($115.50/month)

---

## Timeline

### Week 1-2: Research Pipeline (Agent 1)
- [ ] Ingest implementation
- [ ] Synthesis integration (Claude 4.5)
- [ ] Compliance checks (GPT-5)
- [ ] Publisher (PDF + D1 + R2)
- [ ] CLI tools

### Week 3: Frontend + API (Agents 2 & 3)
- [ ] Next.js app structure
- [ ] Peptide list + detail pages
- [ ] Cloudflare Workers API
- [ ] Rate limiting + CORS

### Week 4: Auth + Payments (Agent 4)
- [ ] Lucia auth setup
- [ ] Magic link flow
- [ ] Stripe integration
- [ ] Customer Portal

### Week 5+: Polish & Launch
- [ ] Seed 20 peptides
- [ ] Testing (unit + E2E)
- [ ] Security audit
- [ ] Production deployment

---

## Getting Help

### Documentation Issues
- Check `docs/claude.md` for navigation
- Check component-specific docs (e.g., `docs/04-research-pipeline.md`)

### Implementation Questions
- Refer to package READMEs (when created)
- Check `docs/code-standards.md` for patterns

### Stuck on a Task?
1. Check STATUS.md (this file) for context
2. Review relevant documentation
3. Update STATUS.md with your findings
4. Ask user for clarification if needed

---

## How to Update This File

**When you complete a task:**
1. Move it from "In Progress" to "Completed"
2. Update progress percentage
3. Add any new decisions to "Questions & Decisions Log"
4. Update "What's Next" section

**When you start a new task:**
1. Move it from "Pending" to "In Progress"
2. Add details about what you're doing
3. Document any blockers or questions

**Before ending a session:**
1. Save all work
2. Update this file with current state
3. Commit changes
4. Push to remote (when git is initialized)

---

**Last Edited By:** Initial Setup Agent
**Next Agent Should:** Complete monorepo configuration, then create directory structure
