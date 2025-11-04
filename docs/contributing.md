# PepTalk — Contributing Guide

**Version:** 1.0
**Last Updated:** 2025-11-04

---

## Overview

This guide explains how to contribute to PepTalk, whether you're one of the 4 core agents or a future contributor.

**Quick Links:**
- [Code Standards](./code-standards.md) - 400-line rule, TypeScript standards
- [Git Worktrees](./git-worktrees.md) - Parallel development workflow
- [Project Structure](./project-structure.md) - File organization

---

## Getting Started

### Prerequisites

- Node.js 18+ (LTS)
- pnpm 8+
- Git 2.30+
- Cloudflare account (for Workers/D1/R2)

### Initial Setup

```bash
# Clone repository
git clone https://github.com/your-org/peptalk.git
cd peptalk

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your keys

# Run type check
pnpm typecheck

# Run tests
pnpm test

# Start development server
pnpm dev
```

---

## Development Workflow

### 1. Create a Worktree (For Core Agents)

```bash
# Agent 1: Research Pipeline
git worktree add worktree/research-pipeline -b research-pipeline
cd worktree/research-pipeline

# Agent 2: Frontend
git worktree add worktree/frontend -b frontend
cd worktree/frontend

# Agent 3: API Workers
git worktree add worktree/api-workers -b api-workers
cd worktree/api-workers

# Agent 4: Auth & Payments
git worktree add worktree/auth-payments -b auth-payments
cd worktree/auth-payments
```

See [git-worktrees.md](./git-worktrees.md) for detailed worktree usage.

### 2. Create a Feature Branch (For External Contributors)

```bash
# Create branch from main
git checkout -b feature/add-peptide-comparison

# Make changes
# ...

# Commit
git add .
git commit -m "Add peptide comparison view"

# Push
git push origin feature/add-peptide-comparison
```

### 3. Make Changes

Follow these rules:
- **Max 400 lines per file** (enforced by ESLint)
- **Single responsibility** per file
- **Strict TypeScript** (no `any` types)
- **Write tests** (80% coverage minimum)
- **Document public APIs** (JSDoc)

See [code-standards.md](./code-standards.md) for detailed standards.

### 4. Run Checks Locally

```bash
# Type check
pnpm typecheck

# Lint
pnpm lint

# Format
pnpm format

# Test
pnpm test

# Test with coverage
pnpm test --coverage
```

**All checks must pass before committing.**

### 5. Commit Changes

#### Commit Message Format

Use conventional commits:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Formatting, missing semicolons, etc.
- `refactor`: Code restructuring without behavior change
- `test`: Adding/updating tests
- `chore`: Tooling, dependencies, etc.

**Examples:**
```bash
# Good
git commit -m "feat(research): add PubMed client with rate limiting"
git commit -m "fix(api): handle null peptide_id in studies query"
git commit -m "docs(architecture): update data flow diagrams"

# Bad
git commit -m "fixed stuff"
git commit -m "WIP"
git commit -m "asdf"
```

#### Commit Frequency

- Commit every logical change (even WIP)
- Don't wait until "everything works"
- Small commits are easier to review and revert

### 6. Push to Remote

```bash
git push origin <your-branch>
```

### 7. Create Pull Request

#### PR Title Format

Same as commit messages:

```
feat(research): add PubMed client with rate limiting
```

#### PR Description Template

```markdown
## Summary
Brief description of changes (1-2 sentences).

## Changes
- Added PubMed client (`packages/research/ingest/pubmed/client.ts`)
- Added XML parser (`packages/research/ingest/pubmed/parser.ts`)
- Added unit tests with 85% coverage

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Screenshots (if UI changes)
![screenshot](url)

## Checklist
- [ ] All files ≤400 lines
- [ ] No `any` types
- [ ] Tests written (80%+ coverage)
- [ ] Documentation updated
- [ ] ESLint passes
- [ ] TypeScript compiles
```

#### PR Size Guidelines

**Target:** <500 lines changed

**Small PR (preferred):**
- 1-3 files
- <200 lines changed
- Single feature/fix
- Quick review (30 min)

**Medium PR (acceptable):**
- 3-10 files
- 200-500 lines changed
- Related features
- Review time: 1-2 hours

**Large PR (avoid):**
- 10+ files
- 500+ lines changed
- Multiple features
- Review time: 3+ hours
- **Break into smaller PRs!**

---

## Code Review Process

### For Reviewers

#### Review Checklist

**Code Quality:**
- [ ] All files ≤400 lines
- [ ] Single responsibility per file
- [ ] No `any` types
- [ ] Explicit return types
- [ ] Imports organized correctly
- [ ] Follows naming conventions

**Testing:**
- [ ] Tests included
- [ ] Coverage ≥80%
- [ ] Tests are meaningful (not just 100% coverage)

**Documentation:**
- [ ] Public APIs documented (JSDoc)
- [ ] README updated (if needed)
- [ ] Architecture docs updated (if structural changes)

**Security:**
- [ ] No secrets in code
- [ ] Input validation present
- [ ] SQL queries parameterized
- [ ] No XSS vulnerabilities

**Performance:**
- [ ] No N+1 queries
- [ ] Appropriate indexes (if DB changes)
- [ ] No unnecessary re-renders (React)

#### Review Comments

**Good review comments:**
```
# Constructive
"Consider extracting this into a separate function to stay under 400 lines."

# Specific
"Line 42: This query will cause an N+1 problem. Use a JOIN instead."

# Educational
"FYI: We use `type` instead of `interface` per code-standards.md §3.4"
```

**Bad review comments:**
```
# Vague
"This looks wrong."

# Unhelpful
"Rewrite this."

# Bikeshedding
"I prefer tabs over spaces."  (We use Prettier, don't debate formatting)
```

#### Approval Criteria

**Approve if:**
- All checks pass (CI/CD green)
- Code follows standards
- Tests are adequate
- Documentation is updated
- No security issues

**Request changes if:**
- Files exceed 400 lines
- Tests missing or inadequate
- Security vulnerabilities present
- Breaking changes without discussion

### For PR Authors

#### Responding to Review Comments

**Acknowledge all comments:**
```
# If you made the change
"✅ Fixed in abc1234"

# If you disagree (respectfully)
"I kept this as-is because [reason]. Thoughts?"

# If clarifying
"This is needed for [reason]. I added a comment explaining."
```

**Don't:**
- Ignore comments
- Get defensive
- Resolve threads yourself (let reviewer do it)

#### Making Changes

```bash
# Make requested changes
# ...

# Commit
git add .
git commit -m "fix(review): address PR feedback"

# Push
git push origin <your-branch>
```

**PR automatically updates.** Reviewer will re-review.

---

## Merging

### Merge Requirements

All of the following must be true:
- [ ] CI/CD passes (lint, typecheck, tests)
- [ ] At least 1 approval from core team
- [ ] No unresolved comments
- [ ] All files ≤400 lines
- [ ] Coverage ≥80%

### Merge Strategy

**We use "Squash and Merge":**
- All commits squashed into one
- Clean main branch history
- Commit message = PR title + description

**After merge:**
```bash
# Update your local main
git checkout main
git pull origin main

# Delete feature branch
git branch -d feature/add-peptide-comparison
git push origin --delete feature/add-peptide-comparison

# For worktrees: remove worktree
git worktree remove worktree/<branch-name>
```

---

## CI/CD Pipeline

### GitHub Actions Workflow

**On PR:**
1. Lint (ESLint + Prettier)
2. Type check (TypeScript)
3. Unit tests (Vitest)
4. Integration tests
5. File size check (400-line rule)
6. Coverage check (≥80%)

**On merge to main:**
1. All above checks
2. Build Next.js app
3. Build Workers
4. Deploy to staging (Cloudflare)
5. Run E2E tests (Playwright)
6. (Manual) Deploy to production

**On tag (vX.X.X):**
1. All checks
2. Build production artifacts
3. Deploy to production
4. Create GitHub release

---

## Testing Guidelines

### Unit Tests

**Location:** Next to implementation (`*.test.ts`)

**Example:**
```typescript
// packages/research/rubric/grader.test.ts
import { describe, it, expect } from 'vitest'
import { gradeEvidence } from './grader'

describe('gradeEvidence', () => {
  it('returns "high" for 2+ RCTs with N≥50', () => {
    const studies = [
      { type: 'human_rct', sample_size: 60, outcome: 'benefit' },
      { type: 'human_rct', sample_size: 80, outcome: 'benefit' }
    ]
    const result = gradeEvidence(studies)
    expect(result.grade).toBe('high')
  })
})
```

### Integration Tests

**Location:** `tests/integration/`

**Example:**
```typescript
// tests/integration/research-pipeline.test.ts
describe('Research Pipeline', () => {
  it('ingests and synthesizes a peptide end-to-end', async () => {
    const result = await runPipeline('BPC-157')
    expect(result.pageRecord).toBeDefined()
    expect(result.pdf).toExist()
  })
})
```

### E2E Tests

**Location:** `tests/e2e/`

**Example:**
```typescript
// tests/e2e/peptide-detail.spec.ts
import { test, expect } from '@playwright/test'

test('peptide detail page loads', async ({ page }) => {
  await page.goto('/peptides/bpc-157')
  await expect(page.locator('h1')).toContainText('BPC-157')
})
```

---

## Documentation

### When to Update Docs

**Always update docs for:**
- New features (user-facing or API)
- Breaking changes
- Architecture changes
- New environment variables
- Deployment changes

**Docs to update:**
- `README.md` (project overview)
- `docs/` (architecture, API, etc.)
- Package READMEs (`packages/*/README.md`)
- Inline JSDoc (public APIs)

### Documentation Standards

- Max 400 lines per doc (split if needed)
- Clear headings (## ##)
- Code examples for APIs
- Links to related docs
- Version and date at top

---

## Common Tasks

### Adding a New Package

```bash
mkdir -p packages/new-package
cd packages/new-package

# Create package.json
pnpm init

# Add to workspace (pnpm-workspace.yaml already includes packages/*)
# No action needed

# Create README
touch README.md
```

### Adding a New Dependency

```bash
# To specific package
cd packages/research
pnpm add zod

# To workspace root (shared dependency)
cd /path/to/peptalk
pnpm add -w eslint
```

### Running a Single Test File

```bash
pnpm test packages/research/rubric/grader.test.ts
```

### Debugging TypeScript Errors

```bash
# Show full error details
pnpm typecheck --pretty false

# Check specific file
pnpm tsc --noEmit packages/research/ingest/pubmed/client.ts
```

---

## Troubleshooting

### "Cannot find module '@peptalk/schemas'"

**Problem:** Path aliases not resolving.

**Solution:**
```bash
# Check tsconfig.json has paths configured
# Restart TypeScript server (VS Code: Cmd+Shift+P → "Restart TS Server")
```

### "ESLint: 'max-lines' exceeded"

**Problem:** File exceeds 400 lines.

**Solution:** Break file into smaller modules.

```typescript
// Before (450 lines in client.ts)
export class PubMedClient {
  // ... 450 lines
}

// After (split into 3 files)
// client.ts (150 lines)
// parser.ts (150 lines)
// mapper.ts (150 lines)
```

### "Tests failing in CI but passing locally"

**Problem:** Different Node.js versions or missing env vars.

**Solution:**
```bash
# Check Node version matches CI
node --version  # Should be 18+

# Run tests with CI env vars
export CI=true
pnpm test
```

---

## Getting Help

### Documentation
1. Check relevant docs in `docs/`
2. Check package README (`packages/*/README.md`)
3. Search GitHub issues

### Questions
- Open a discussion on GitHub
- Ask in team Slack/Discord
- Create an issue (label: `question`)

### Bug Reports
Create an issue with:
- Clear title
- Steps to reproduce
- Expected vs actual behavior
- Environment (OS, Node version, etc.)
- Screenshots (if applicable)

---

## Summary

**Before starting:**
- [ ] Read code-standards.md
- [ ] Set up worktree (or feature branch)
- [ ] Install dependencies

**While coding:**
- [ ] Follow 400-line rule
- [ ] Write tests (80% coverage)
- [ ] Run checks locally

**Before PR:**
- [ ] All checks pass
- [ ] Documentation updated
- [ ] PR description complete

**After merge:**
- [ ] Update local main
- [ ] Delete feature branch
- [ ] Remove worktree (if used)

---

## References

- [claude.md](./claude.md) - Master build plan
- [code-standards.md](./code-standards.md) - Detailed standards
- [git-worktrees.md](./git-worktrees.md) - Worktree workflow
- [project-structure.md](./project-structure.md) - File organization

---

**Document Owner:** Engineering Team
**Lines:** 395 (within 400-line limit ✓)
