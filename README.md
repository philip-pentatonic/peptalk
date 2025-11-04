# PepTalk

**Citation-first peptide evidence reference platform**

> Educational summary of peptide research from PubMed and ClinicalTrials.gov. No medical advice, no recommendations, just transparent evidence with proper sourcing.

---

## Quick Start

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env
# Edit .env with your API keys

# Run type check
pnpm typecheck

# Run tests
pnpm test

# Start development (all services)
pnpm dev
```

---

## Project Status

**Phase:** Foundation Setup (30% Complete)
**Last Updated:** 2025-11-04

See [STATUS.md](./STATUS.md) for detailed progress.

---

## Documentation

### Start Here
- **[docs/claude.md](./docs/claude.md)** - Master build plan (navigation hub)
- **[STATUS.md](./STATUS.md)** - Current project state

### Architecture
- [docs/00-overview.md](./docs/00-overview.md) - System overview
- [docs/01-architecture.md](./docs/01-architecture.md) - Component architecture
- [docs/02-database-schema.md](./docs/02-database-schema.md) - Database design
- [docs/03-api-reference.md](./docs/03-api-reference.md) - API endpoints

### Development
- [docs/code-standards.md](./docs/code-standards.md) - 400-line rule & standards
- [docs/git-worktrees.md](./docs/git-worktrees.md) - Parallel development
- [docs/contributing.md](./docs/contributing.md) - PR process
- [docs/project-structure.md](./docs/project-structure.md) - Directory layout

### Implementation Guides
- [docs/04-research-pipeline.md](./docs/04-research-pipeline.md) - Pipeline details
- [docs/05-llm-prompts.md](./docs/05-llm-prompts.md) - Claude 4.5 & GPT-5
- [docs/06-deployment.md](./docs/06-deployment.md) - Cloudflare setup
- [docs/07-testing.md](./docs/07-testing.md) - Testing strategy
- [docs/08-security.md](./docs/08-security.md) - Security architecture
- [docs/09-cost-model.md](./docs/09-cost-model.md) - Cost projections
- [docs/10-runbook.md](./docs/10-runbook.md) - Operations
- [docs/11-stripe-integration.md](./docs/11-stripe-integration.md) - Payments

---

## Tech Stack

### Frontend
- **Next.js 14** (App Router, React Server Components)
- **Cloudflare Pages** (Edge deployment)
- **TailwindCSS** + **Radix UI**

### Backend
- **Cloudflare Workers** (Edge functions, Hono router)
- **D1** (SQLite + FTS5)
- **R2** (Object storage for PDFs)

### Research Pipeline
- **Claude Sonnet 4.5** (Evidence synthesis)
- **GPT-5** (Compliance validation)
- **PubMed API** + **ClinicalTrials.gov API**
- **Puppeteer** (PDF rendering)

### Auth & Payments
- **Lucia** (Session management)
- **Resend** (Magic link emails)
- **Stripe** (Subscriptions)

---

## Project Structure

```
peptalk/
├── apps/
│   ├── web/              # Next.js frontend
│   └── workers/          # Cloudflare Workers API
├── packages/
│   ├── research/         # Research pipeline (Claude 4.5 + GPT-5)
│   ├── database/         # D1 schema + migrations + queries
│   ├── schemas/          # Zod schemas (SourcePack, PageRecord, Study)
│   ├── payments/         # Stripe integration
│   └── ui/               # Shared React components
├── content/              # Generated peptide pages (JSON + MD)
├── storage/              # PDF outputs (staged for R2)
├── catalog/              # peptides.yaml (initial 20 peptides)
├── tests/                # Integration & E2E tests
└── docs/                 # Comprehensive documentation
```

---

## Development Workflow

### Parallel Development (Git Worktrees)

We use git worktrees for 4 agents working in parallel:

```bash
# Agent 1: Research Pipeline
git worktree add worktree/research-pipeline -b research-pipeline

# Agent 2: Frontend
git worktree add worktree/frontend -b frontend

# Agent 3: API Workers
git worktree add worktree/api-workers -b api-workers

# Agent 4: Auth & Payments
git worktree add worktree/auth-payments -b auth-payments
```

See [docs/git-worktrees.md](./docs/git-worktrees.md) for details.

### Code Standards

**Max 400 lines per file** (enforced by ESLint)

Why? Forces modularity, easier code review, better testability.

See [docs/code-standards.md](./docs/code-standards.md) for details.

---

## Commands

### Development
```bash
pnpm dev                  # Start all services (Next.js + Workers)
pnpm typecheck            # Type check all packages
pnpm lint                 # Lint all files
pnpm lint:fix             # Lint and auto-fix
pnpm format               # Format all files with Prettier
```

### Testing
```bash
pnpm test                 # Run all tests (watch mode)
pnpm test:unit            # Unit tests only
pnpm test:integration     # Integration tests
pnpm test:e2e             # End-to-end tests (Playwright)
pnpm test:coverage        # Generate coverage report
```

### Research Pipeline (once implemented)
```bash
pnpm cli "BPC-157" "Body Protection Compound"  # Process single peptide
pnpm cli:batch catalog/peptides.yaml           # Process batch
```

### Database (Cloudflare D1)
```bash
# Local development
pnpm wrangler d1 execute peptalk-db --local --file=packages/database/migrations/0001-initial.sql

# Production
pnpm wrangler d1 execute peptalk-db --remote --file=packages/database/migrations/0001-initial.sql
```

---

## Contributing

### Before You Start
1. Read [docs/claude.md](./docs/claude.md) - Master plan
2. Read [STATUS.md](./STATUS.md) - Current progress
3. Read [docs/contributing.md](./docs/contributing.md) - PR guidelines
4. Read [docs/code-standards.md](./docs/code-standards.md) - Standards

### Submitting Changes
1. Create feature branch (or use worktree)
2. Make changes (max 400 lines/file)
3. Write tests (80% coverage minimum)
4. Run checks: `pnpm typecheck && pnpm lint && pnpm test`
5. Commit with conventional commits: `feat(component): description`
6. Create PR with description + checklist

---

## Deployment

### Staging (Automatic)
- **Trigger:** Merge to `main`
- **URL:** https://staging.peptalk.com
- **Process:** CI/CD via GitHub Actions

### Production (Manual)
- **Trigger:** Create release (tag `v1.0.0`)
- **URL:** https://peptalk.com
- **Process:** CI/CD via GitHub Actions

See [docs/06-deployment.md](./docs/06-deployment.md) for details.

---

## Cost Model

### MVP Costs
- **One-time:** $80-120 (initial 20 peptides, LLM synthesis)
- **Monthly:** $80-120 (LLM updates) + $1 (infrastructure)
- **Break-even:** 14 subscribers @ $99/year

See [docs/09-cost-model.md](./docs/09-cost-model.md) for details.

---

## License

UNLICENSED - Proprietary

---

## Contact

- **Documentation Issues:** See [docs/contributing.md](./docs/contributing.md)
- **Security:** security@peptalk.com (after launch)

---

## For New Contributors

**Starting fresh?** Follow this sequence:

1. Read [docs/claude.md](./docs/claude.md) - 5 minutes
2. Read [STATUS.md](./STATUS.md) - Current state
3. Read [docs/project-structure.md](./docs/project-structure.md) - Directory layout
4. Read [docs/code-standards.md](./docs/code-standards.md) - Development rules
5. Pick a task from STATUS.md
6. Read relevant component docs
7. Start coding!

**Key Principle:** Every file ≤400 lines. If it's getting longer, split it.

---

**Last Updated:** 2025-11-04
