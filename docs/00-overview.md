# PepTalk — System Overview

**Version:** 1.0
**Last Updated:** 2025-11-04

---

## What is PepTalk?

PepTalk is a citation-first, evidence-focused reference platform for peptide research. We deterministically ingest studies from PubMed and ClinicalTrials.gov, synthesize them using state-of-the-art AI (Claude 4.5, GPT-5), and publish structured pages with transparent sourcing and evidence grading.

### Core Mission
Provide credible, unbiased peptide information without promotional content, vendor links, or medical recommendations.

---

## Key Differentiators

1. **Citation-first:** Every empirical claim cites PMID or NCT
2. **Evidence grading:** Deterministic rubric (very_low → high)
3. **Human vs animal distinction:** Always explicit
4. **Reported, not recommended:** Protocols shown as studied, never advised
5. **Regulatory transparency:** UK/EU/US status with citations
6. **Weekly updates:** Automated digest from new research

---

## Architecture at a Glance

```
┌─────────────────┐
│  User (Browser) │
└────────┬────────┘
         │
         │ HTTPS
         ▼
┌─────────────────────────┐
│  Cloudflare Pages       │  Next.js 14 (App Router)
│  (Edge Network)         │  - Peptide list/detail
└────────┬────────────────┘  - Search UI
         │                   - Auth pages
         │ API Calls         - Account dashboard
         ▼
┌─────────────────────────┐
│  Cloudflare Workers     │  Hono API
│  (Edge Runtime)         │  - GET /api/peptides
└────────┬────────────────┘  - GET /api/peptides/:slug
         │                   - PDF signed URLs
         │ DB/Storage        - Stripe webhooks
         ▼
┌──────────────┬──────────────┐
│  D1 (SQLite) │  R2 (S3-like)│
│  - peptides  │  - PDFs      │
│  - studies   │              │
│  - users     │              │
└──────────────┴──────────────┘

┌─────────────────────────────┐
│  Research Pipeline          │  Scheduled (nightly)
│  (Node.js CLI)              │  - Ingest new studies
└─────────────────────────────┘  - Synthesize pages
                                 - Generate PDFs
```

---

## Technology Stack

### Frontend
- **Next.js 14** (App Router, RSC)
- **React 18** (Server/Client components)
- **TailwindCSS** (Utility-first styling)
- **Radix UI** (Accessible primitives)

### Backend
- **Cloudflare Workers** (Edge functions)
- **Hono** (Lightweight HTTP router)
- **D1** (Distributed SQLite)
- **R2** (Object storage)

### Research Pipeline
- **TypeScript** (Strict mode)
- **Zod** (Schema validation)
- **Claude Sonnet 4.5** (Synthesis)
- **GPT-5** (Compliance)
- **Puppeteer** (PDF rendering)

### Auth & Payments
- **Lucia** (Session management)
- **Resend** (Transactional email)
- **Stripe** (Subscriptions)

### Development
- **pnpm** (Monorepo package manager)
- **Vitest** (Testing)
- **TypeScript 5.x** (Type safety)
- **ESLint + Prettier** (Code quality)

---

## Core Concepts

### Peptides
Individual peptide compounds (e.g., BPC-157, TB-500). Each peptide has:
- Unique slug (URL-friendly identifier)
- Evidence grade (very_low, low, moderate, high)
- Study counts (human RCT, animal, etc.)
- Last review timestamp

### Studies
Research publications or clinical trials. Each study has:
- Registry source (PubMed or ClinicalTrials.gov)
- External ID (PMID or NCT number)
- Study type (human_rct, human_observational, animal, in_vitro)
- Outcome direction (benefit, null, harm, mixed)
- Structured safety data

### SourcePack
Raw ingestion output containing all studies for a peptide. Schema includes:
- Studies array (title, year, type, outcomes, safety)
- Search metadata (duplicates removed, last checked)

### PageRecord
Final structured output from synthesis. Schema includes:
- Peptide metadata
- Evidence snapshot (grade, counts, rationale)
- Protocols table (reported from studies)
- Safety summary
- Regulatory notes
- Citations list

### Evidence Grading
Deterministic rubric applied to study set:
- **very_low:** Animal/in-vitro only
- **low:** Human observational only
- **moderate:** ≥1 human RCT, N≥50, mostly beneficial
- **high:** ≥2 independent RCTs, adequate N, consistent outcomes

Downgrades for bias, imprecision, indirectness, or inconsistency.

---

## Data Flow

### Research Pipeline (Weekly)
```
1. Ingest
   PubMed API → SourcePack (studies[])
   CT.gov API → SourcePack (trials[])
   ↓
2. Normalize
   Deduplicate studies
   Infer study types
   ↓
3. Grade
   Apply rubric → evidence grade
   ↓
4. Synthesize
   Claude 4.5 → PageRecord JSON + Markdown
   ↓
5. Compliance
   GPT-5 + regex → validate
   ↓
6. Publish
   Write JSON/MD → content/
   Render PDF → R2
   Update DB → D1
```

### User Request (Read)
```
1. User visits /peptides/bpc-157
   ↓
2. Next.js SSR fetches from Workers API
   GET /api/peptides/bpc-157
   ↓
3. Worker queries D1
   SELECT * FROM peptides WHERE slug = 'bpc-157'
   ↓
4. Return PageRecord JSON
   ↓
5. Next.js renders page
   - Evidence snapshot
   - Studied protocols
   - Safety section
   - Citations
   ↓
6. User clicks "Download PDF"
   → GET /api/pdf/bpc-157 (auth required)
   → Signed R2 URL (1 hour TTL)
```

---

## Security Model

### Authentication
- **Magic links:** Passwordless email login
- **Sessions:** httpOnly cookies, 30-day expiry
- **CSRF:** SameSite=Lax cookies

### Authorization
- **Public:** Peptide list, search, sample page
- **Subscribers:** PDF downloads, full access
- **Internal:** Cron endpoints (shared secret)

### Rate Limiting
- 10 requests/second per IP
- Cloudflare Workers KV for tracking

### Data Protection
- No PII beyond email
- Stripe handles payment data
- D1 encrypted at rest
- R2 signed URLs only

---

## Cost Structure

### Fixed Monthly Costs
- Cloudflare: ~$1-2 (R2 storage + bandwidth)
- Resend: Free tier (100 emails/month)
- Stripe: 2.9% + $0.30 per transaction

### Variable Costs (Research Pipeline)
- Claude 4.5: $3-5 per peptide
- GPT-5: $0.50-1 per peptide
- **Total:** ~$4-6 per peptide processed

### Projected Monthly (20 peptides, weekly updates)
- Initial synthesis: $80-120 (one-time)
- Weekly updates (5 peptides): $20-30/week → $80-120/month
- **Total:** ~$85-125/month

---

## Scalability

### Current Limits (MVP)
- D1: 100k rows, 5M reads/day
- R2: Unlimited storage, 10M reads/month included
- Workers: 100k requests/day

### Scale Plan
- 100 peptides: Well within limits
- 1000 peptides: May need Postgres (Neon) + larger R2 plan
- 10k+ users: Add CDN caching, read replicas

---

## Quality Assurance

### Automated Checks
1. **Schema validation:** Zod at every step
2. **Citation verification:** All PMID/NCT present in text
3. **Regex filters:** No prescriptive language
4. **LLM compliance:** GPT-5 final pass

### Human Review
- Manual approval before first publish
- Spot checks on weekly updates
- User feedback loop

### Testing
- Unit tests for all logic <400 lines
- Integration tests for pipeline
- E2E tests for user flows

---

## Development Workflow

### Git Worktrees
Four parallel development branches:
1. `research-pipeline` (Agent 1)
2. `frontend` (Agent 2)
3. `api-workers` (Agent 3)
4. `auth-payments` (Agent 4)

### Code Standards
- Max 400 lines per file
- Single responsibility per module
- Strict TypeScript
- No `any` types

### Review Process
1. PR created from worktree branch
2. CI runs: lint, type check, tests
3. Manual review (focus: logic, not style)
4. Merge to main
5. Auto-deploy to staging
6. Manual promotion to production

---

## Operational Runbook

### Daily Tasks
- Monitor error logs (Cloudflare dashboard)
- Check pipeline success (nightly cron)

### Weekly Tasks
- Review digest output
- Check subscription metrics
- Scan user feedback

### Monthly Tasks
- Review cost reports (LLM + infra)
- Audit security logs
- Update dependencies

### Incident Response
1. Check Cloudflare status page
2. Review recent deploys
3. Check LLM API status
4. Rollback if needed
5. Postmortem for >5 min outages

---

## Future Enhancements (Post-MVP)

### Q1 2026
- Expand to 50 peptides
- Add comparison view (2+ peptides side-by-side)
- User saved searches

### Q2 2026
- API access tier (for clinics/researchers)
- Advanced filters (mechanism of action, tissue type)
- Email alerts (new studies for saved peptides)

### Q3 2026
- International regulatory expansion (APAC)
- Practitioner notes (peer-reviewed commentary)
- Mobile app (iOS/Android)

---

## References

- [01-architecture.md](./01-architecture.md) - Detailed component design
- [02-database-schema.md](./02-database-schema.md) - Full DB schema
- [04-research-pipeline.md](./04-research-pipeline.md) - Pipeline internals
- [claude.md](./claude.md) - Master build plan

---

**Document Owner:** Engineering Team
**Review Cadence:** Monthly
