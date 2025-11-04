# PepTalk — Project Status

**Last Updated:** 2025-11-04
**Current Phase:** Foundation Setup Complete → Ready for Implementation
**Progress:** 70% Complete (Foundation Phase)

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

## What's Been Completed (Continued)

### ✅ Phase 2: Monorepo Configuration (100% Complete)

**Completed:**
- ✅ All directories created (34 directories)
- ✅ Monorepo configuration files (pnpm, TypeScript, ESLint)
- ✅ Root package.json with workspace scripts
- ✅ TypeScript config with path aliases
- ✅ ESLint config (400-line rule enforced)
- ✅ Prettier config
- ✅ .gitignore
- ✅ .env.example
- ✅ README.md
- ✅ STATUS.md
- ✅ SETUP_COMPLETE.md

### ✅ Phase 3: Package Scaffolds (100% Complete)

**Completed:**
- ✅ `packages/schemas` - Zod validation schemas
  - package.json, tsconfig.json, README.md (395 lines)
  - src/index.ts with exports
- ✅ `packages/database` - D1 schema and queries
  - package.json, tsconfig.json, README.md (397 lines)
  - src/index.ts with exports
- ✅ `packages/payments` - Stripe integration
  - package.json, tsconfig.json, README.md (394 lines)
  - src/index.ts with exports
- ✅ `packages/ui` - React component library
  - package.json, tsconfig.json, README.md (398 lines)
  - src/index.ts with exports
- ✅ `packages/research` - Research pipeline
  - package.json, tsconfig.json, README.md (392 lines)
- ✅ `apps/web` - Next.js frontend
  - package.json, tsconfig.json, README.md (396 lines)
- ✅ `apps/workers` - Cloudflare Workers API
  - package.json, tsconfig.json, README.md (398 lines)

**All READMEs:** <400 lines ✓

**Git Repository:**
- ✅ Initialized and pushed to GitHub
- ✅ 2 commits made (initial + scaffolds)
- ✅ Remote: https://github.com/philip-pentatonic/peptalk.git

## What's Been Completed (Continued)

### ✅ Phase 4: Git Worktrees (100% Complete)

**Completed:**
- ✅ Created 4 worktree branches:
  - `worktree/research-pipeline` (branch: research-pipeline)
  - `worktree/frontend` (branch: frontend)
  - `worktree/api-workers` (branch: api-workers)
  - `worktree/auth-payments` (branch: auth-payments)

**Status:** All worktrees ready for parallel development

## What's In Progress

**Current Phase:** Ready for Implementation (Phase 5)

**Next Step:** Begin implementation in parallel across 4 worktrees

---

## What's Next

### 📋 Phase 5: Implementation (Ready to Start)

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

**Last Edited By:** Foundation Setup Agent (Session 2)
**Next Agent Should:** Begin implementation in worktrees (any of 4 parallel tracks)

**Session Summary:**
- Created 7 package scaffolds with full documentation
- All READMEs comply with 400-line limit
- Created 4 git worktrees for parallel development
- Committed and pushed to GitHub (4 commits total)
- Progress: 40% → 70% complete
- Foundation phase complete, ready for implementation

**Available Worktrees:**
1. `worktree/research-pipeline` - Agent 1: Research pipeline implementation
2. `worktree/frontend` - Agent 2: Next.js frontend
3. `worktree/api-workers` - Agent 3: Cloudflare Workers API
4. `worktree/auth-payments` - Agent 4: Auth & Payments

**Recommended Starting Point:** Agent 1 (research-pipeline) since other components depend on it
