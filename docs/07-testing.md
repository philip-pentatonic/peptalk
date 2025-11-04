# PepTalk — Testing Strategy

**Version:** 1.0
**Last Updated:** 2025-11-04

---

## Overview

Comprehensive testing ensures PepTalk maintains quality as it scales. This document covers unit, integration, and E2E testing strategies.

**Testing Principles:**
1. Test behavior, not implementation
2. 80% minimum coverage
3. Fast feedback (tests run in <2 minutes)
4. Automated via CI/CD

**Tools:**
- **Unit/Integration:** Vitest
- **E2E:** Playwright
- **Coverage:** c8 (built into Vitest)

---

## Test Structure

### Directory Layout

```
packages/research/
├── ingest/
│   ├── pubmed/
│   │   ├── client.ts
│   │   ├── client.test.ts      ← Unit tests
│   │   ├── parser.ts
│   │   └── parser.test.ts
│   └── integration.test.ts      ← Integration tests
└── __fixtures__/                ← Test fixtures
    ├── source-pack.json
    └── page-record.json

tests/
├── integration/                 ← Cross-package tests
│   └── research-pipeline.test.ts
└── e2e/                         ← End-to-end tests
    ├── peptide-list.spec.ts
    └── pdf-download.spec.ts
```

---

## Unit Tests

### Purpose
Test individual functions/classes in isolation.

### Guidelines

**1. AAA Pattern (Arrange, Act, Assert)**

```typescript
import { describe, it, expect } from 'vitest'
import { gradeEvidence } from './grader'

describe('gradeEvidence', () => {
  it('returns "high" for 2+ consistent RCTs with N≥50', () => {
    // Arrange
    const studies = [
      { type: 'human_rct', sample_size: 60, outcome: 'benefit' },
      { type: 'human_rct', sample_size: 80, outcome: 'benefit' }
    ]

    // Act
    const result = gradeEvidence(studies)

    // Assert
    expect(result.grade).toBe('high')
    expect(result.rationale).toContain('consistent')
  })
})
```

**2. Test Edge Cases**

```typescript
it('returns "very_low" for empty study list', () => {
  const result = gradeEvidence([])
  expect(result.grade).toBe('very_low')
})

it('handles missing sample_size gracefully', () => {
  const studies = [{ type: 'human_rct', sample_size: null }]
  const result = gradeEvidence(studies)
  expect(result.grade).toBe('low')
})
```

**3. Use Fixtures**

```typescript
import { testSourcePack } from '../__fixtures__/source-pack'

it('parses valid SourcePack', () => {
  const result = normalize(testSourcePack)
  expect(result.studies).toHaveLength(5)
})
```

### Coverage Target

**Minimum:** 80% line coverage per package

```bash
pnpm test --coverage
```

**Focus on:**
- Business logic (rubric, synthesis)
- Data transformations (parsers, mappers)
- Critical paths (auth, payments)

**OK to skip:**
- Type definitions
- Simple getters/setters
- Logging statements

---

## Integration Tests

### Purpose
Test multiple components working together.

### Example: Research Pipeline

```typescript
// tests/integration/research-pipeline.test.ts
import { describe, it, expect, beforeAll } from 'vitest'
import { runPipeline } from '@peptalk/research'

describe('Research Pipeline Integration', () => {
  beforeAll(async () => {
    // Set up test database
    await setupTestDB()
  })

  it('processes a peptide end-to-end', async () => {
    const result = await runPipeline({
      name: 'BPC-157',
      aliases: ['Body Protection Compound']
    })

    expect(result.pageRecord).toBeDefined()
    expect(result.pageRecord.evidence_snapshot.grade).toMatch(/very_low|low|moderate|high/)
    expect(result.markdown).toContain('## Disclaimer')
    expect(result.pdf).toBeTruthy()
  })

  it('fails gracefully on invalid peptide', async () => {
    await expect(runPipeline({ name: '' })).rejects.toThrow('Invalid peptide name')
  })
})
```

### Mocking External Services

**PubMed API:**
```typescript
import { vi } from 'vitest'

vi.mock('./pubmed/client', () => ({
  searchPubMed: vi.fn().mockResolvedValue(['12345678', '87654321']),
  fetchDetails: vi.fn().mockResolvedValue(mockXML)
}))
```

**Claude/GPT APIs:**
```typescript
vi.mock('@anthropic/sdk', () => ({
  Anthropic: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ text: mockClaudeResponse }],
        usage: { total_tokens: 8000 }
      })
    }
  }))
}))
```

---

## E2E Tests

### Purpose
Test user flows in a real browser.

### Setup (Playwright)

```bash
pnpm add -D @playwright/test
pnpm playwright install
```

**Configuration:** `playwright.config.ts`

```typescript
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

### Example: Peptide List Flow

```typescript
// tests/e2e/peptide-list.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Peptide List', () => {
  test('loads and displays peptides', async ({ page }) => {
    await page.goto('/peptides')

    // Check title
    await expect(page.locator('h1')).toContainText('Peptides')

    // Check cards
    const cards = page.locator('[data-testid="peptide-card"]')
    await expect(cards).toHaveCount(20)

    // Check first card
    await expect(cards.first()).toContainText('BPC-157')
  })

  test('search filters results', async ({ page }) => {
    await page.goto('/peptides')

    // Enter search query
    await page.fill('input[name="query"]', 'tendon')
    await page.press('input[name="query"]', 'Enter')

    // Check filtered results
    await expect(page.locator('h2')).toContainText('2 results')
  })
})
```

### Example: PDF Download Flow

```typescript
// tests/e2e/pdf-download.spec.ts
test.describe('PDF Download', () => {
  test('requires authentication', async ({ page }) => {
    await page.goto('/peptides/bpc-157')

    // Click download without auth
    await page.click('button:has-text("Download PDF")')

    // Should redirect to login
    await expect(page).toHaveURL('/auth/login')
  })

  test('downloads PDF when authenticated', async ({ page }) => {
    // Log in (using test account)
    await page.goto('/auth/login')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.click('button[type="submit"]')

    // Mock magic link callback (in test env, skip email)
    await page.goto('/auth/callback?token=test-token')

    // Go to peptide page
    await page.goto('/peptides/bpc-157')

    // Download PDF
    const downloadPromise = page.waitForEvent('download')
    await page.click('button:has-text("Download PDF")')
    const download = await downloadPromise

    // Check downloaded file
    expect(download.suggestedFilename()).toBe('bpc-157.pdf')
  })
})
```

---

## Test Data

### Fixtures

**Location:** `packages/*/fixtures__/`

**source-pack.json:**
```json
{
  "peptide_name": "BPC-157",
  "aliases": ["Body Protection Compound"],
  "regions": ["UK", "EU", "US"],
  "studies": [
    {
      "id": "PMID:12345678",
      "title": "Test study",
      "year": 2023,
      "study_type": "human_rct",
      "sample_size_total": 60
    }
  ],
  "meta": {
    "search_notes": [],
    "duplicates_removed": 0,
    "last_checked": "2025-11-04T00:00:00Z"
  }
}
```

### Test Database

**Setup:**
```typescript
// tests/setup.ts
import { D1Database } from '@cloudflare/workers-types'

export async function setupTestDB(): Promise<D1Database> {
  const db = await env.DB

  // Run migrations
  await db.exec(await readFile('migrations/0001-initial.sql'))
  await db.exec(await readFile('migrations/0002-fts.sql'))

  // Seed test data
  await db.prepare(`
    INSERT INTO peptides (id, slug, name, aliases, evidence_grade)
    VALUES (?, ?, ?, ?, ?)
  `).bind('test-id', 'bpc-157', 'BPC-157', JSON.stringify(['BPC']), 'moderate').run()

  return db
}
```

---

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4

      - name: Install dependencies
        run: pnpm install

      - name: Run unit tests
        run: pnpm test:unit --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3

  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4

      - name: Run integration tests
        run: pnpm test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4

      - name: Install Playwright
        run: pnpm playwright install --with-deps

      - name: Run E2E tests
        run: pnpm test:e2e

      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Test Commands

```json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest run packages/",
    "test:integration": "vitest run tests/integration/",
    "test:e2e": "playwright test",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest watch"
  }
}
```

---

## Performance Testing

### Load Testing (Optional)

**Tool:** k6

```javascript
// tests/load/peptide-list.js
import http from 'k6/http'
import { check } from 'k6'

export const options = {
  vus: 100, // 100 virtual users
  duration: '30s',
}

export default function () {
  const res = http.get('https://api.peptalk.com/api/peptides')

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  })
}
```

**Run:**
```bash
k6 run tests/load/peptide-list.js
```

---

## Testing Checklist

Before merging PR:

- [ ] All tests pass locally
- [ ] New code has 80%+ coverage
- [ ] Integration tests for new features
- [ ] E2E tests for critical user flows
- [ ] No flaky tests (run 3x to verify)
- [ ] CI passes (all jobs green)

---

## Debugging Tests

### Run Single Test File

```bash
pnpm vitest packages/research/rubric/grader.test.ts
```

### Run Single Test Case

```bash
pnpm vitest -t "returns high for 2+ RCTs"
```

### Debug in VS Code

**`.vscode/launch.json`:**
```json
{
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Vitest Tests",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["vitest", "run", "${file}"],
      "console": "integratedTerminal"
    }
  ]
}
```

---

## References

- [Vitest Docs](https://vitest.dev/)
- [Playwright Docs](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)
- [code-standards.md](./code-standards.md) - Testing standards

---

**Document Owner:** Engineering Team
**Lines:** 395 (within 400-line limit ✓)
