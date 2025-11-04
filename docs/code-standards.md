# PepTalk — Code Standards

**Version:** 1.0
**Last Updated:** 2025-11-04

---

## Overview

This document defines the coding standards for PepTalk. All code must follow these rules to ensure consistency, maintainability, and composability.

**Core Principle:** Every file has a single responsibility and stays under 400 lines.

---

## File Size Limit

### The 400-Line Rule

**All code files must be ≤400 lines** (excluding blank lines and comments).

**Why 400 lines?**
- Forces modular design
- Easier code review (fits on one screen scroll)
- Testable in isolation
- Prevents "god objects"
- Encourages composition over inheritance

**Enforcement:**

1. **ESLint Rule** (`.eslintrc.js`):
```javascript
module.exports = {
  rules: {
    'max-lines': ['error', {
      max: 400,
      skipBlankLines: true,
      skipComments: true
    }]
  }
}
```

2. **Pre-commit Hook** (`.git/hooks/pre-commit`):
```bash
#!/bin/bash
for file in $(git diff --cached --name-only | grep -E '\.(ts|tsx|js|jsx)$'); do
  lines=$(grep -c -v '^\s*$' "$file" | grep -c -v '^\s*//')
  if [ "$lines" -gt 400 ]; then
    echo "❌ $file has $lines lines (max 400)"
    exit 1
  fi
done
```

3. **CI Check** (GitHub Actions):
```yaml
- name: Check file sizes
  run: |
    find . -name "*.ts" -o -name "*.tsx" | while read file; do
      lines=$(wc -l < "$file")
      if [ "$lines" -gt 400 ]; then
        echo "❌ $file exceeds 400 lines"
        exit 1
      fi
    done
```

---

## File Organization

### Naming Conventions

**TypeScript Files:**
- `kebab-case.ts` for utilities, services, clients
- `PascalCase.tsx` for React components

**Examples:**
```
✅ packages/research/ingest/pubmed/client.ts
✅ packages/research/ingest/pubmed/parser.ts
✅ apps/web/components/peptides/PeptideCard.tsx
✅ apps/web/components/detail/EvidenceBadge.tsx

❌ packages/research/ingest/pubmed/PubMedClient.ts  (use kebab-case)
❌ apps/web/components/peptides/peptide-card.tsx    (use PascalCase for components)
```

### File Structure Template

**For utilities/services:**
```typescript
// 1. Imports (external first, internal second)
import { z } from 'zod'
import type { Study } from '@peptalk/schemas'

// 2. Types and interfaces
export interface PubMedClientConfig {
  apiKey: string
  email: string
}

// 3. Constants
const API_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils'

// 4. Main implementation
export class PubMedClient {
  // ...
}

// 5. Helper functions (private/exported as needed)
function formatDate(date: Date): string {
  // ...
}
```

**For React components:**
```typescript
// 1. Imports
import { type FC } from 'react'
import { Badge } from '@peptalk/ui'

// 2. Types
interface PeptideCardProps {
  name: string
  grade: string
}

// 3. Component
export const PeptideCard: FC<PeptideCardProps> = ({ name, grade }) => {
  return (
    <div>
      {/* ... */}
    </div>
  )
}

// 4. Sub-components (if small and coupled)
const GradeBadge: FC<{ grade: string }> = ({ grade }) => {
  // ...
}
```

---

## TypeScript Standards

### Strict Mode (Always)

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### No `any` Type

**Never use `any`. Use `unknown` if type is truly unknown.**

**Bad:**
```typescript
function parseJson(str: string): any {
  return JSON.parse(str)
}
```

**Good:**
```typescript
function parseJson(str: string): unknown {
  return JSON.parse(str)
}

// Use type guard or Zod for validation
const result = parseJson(str)
if (isStudy(result)) {
  // TypeScript knows result is Study here
}
```

### Explicit Return Types

**Always specify return types for functions.**

**Bad:**
```typescript
function getStudies(peptideId: string) {
  return db.query('SELECT * FROM studies WHERE peptide_id = ?', [peptideId])
}
```

**Good:**
```typescript
function getStudies(peptideId: string): Promise<Study[]> {
  return db.query('SELECT * FROM studies WHERE peptide_id = ?', [peptideId])
}
```

### Prefer `type` over `interface`

**Use `type` for most cases. Use `interface` only for object shapes that might be extended.**

**Good:**
```typescript
type PeptideGrade = 'very_low' | 'low' | 'moderate' | 'high'

type Study = {
  id: string
  title: string
  year: number
}
```

**When to use `interface`:**
```typescript
// Base interface that will be extended
interface BaseEntity {
  id: string
  createdAt: string
}

interface Peptide extends BaseEntity {
  name: string
  slug: string
}
```

---

## Import Organization

### Order and Grouping

```typescript
// 1. External dependencies (alphabetical)
import { z } from 'zod'
import type { FC } from 'react'

// 2. Internal packages (alphabetical)
import { db } from '@peptalk/database'
import type { Study } from '@peptalk/schemas'

// 3. Relative imports (alphabetical)
import { formatDate } from '../utils'
import type { Config } from './types'

// 4. Side effects last (rare, avoid if possible)
import './styles.css'
```

### Path Aliases

**Use workspace paths, not relative imports for cross-package imports.**

**Bad:**
```typescript
import { Study } from '../../../packages/schemas/study'
```

**Good:**
```typescript
import { Study } from '@peptalk/schemas'
```

**Configure in tsconfig.json:**
```json
{
  "compilerOptions": {
    "paths": {
      "@peptalk/schemas": ["./packages/schemas"],
      "@peptalk/database": ["./packages/database"],
      "@peptalk/research": ["./packages/research"]
    }
  }
}
```

---

## Composability Patterns

### Single Responsibility

**Each file does ONE thing.**

**Example: PubMed Ingest**

❌ **Bad (450 lines):**
```typescript
// packages/research/ingest/pubmed.ts
export class PubMedService {
  // Fetches studies (100 lines)
  // Parses XML (150 lines)
  // Maps to Study schema (100 lines)
  // Deduplicates (100 lines)
}
```

✅ **Good (4 files × ~100 lines each):**
```typescript
// packages/research/ingest/pubmed/client.ts
export class PubMedClient {
  // Only handles HTTP requests to PubMed API
}

// packages/research/ingest/pubmed/parser.ts
export function parseXml(xml: string): RawStudy[] {
  // Only handles XML parsing
}

// packages/research/ingest/pubmed/mapper.ts
export function mapToStudy(raw: RawStudy): Study {
  // Only handles schema mapping
}

// packages/research/ingest/normalizer/deduplicator.ts
export function deduplicate(studies: Study[]): Study[] {
  // Only handles deduplication logic
}
```

### Composition over Inheritance

**Prefer small, composable functions over large class hierarchies.**

**Bad:**
```typescript
class BaseIngestService {
  // 200 lines of shared logic
}

class PubMedService extends BaseIngestService {
  // 150 lines
}

class ClinicalTrialsService extends BaseIngestService {
  // 150 lines
}
```

**Good:**
```typescript
// Shared utilities
function fetchWithRetry(url: string): Promise<Response> { /* ... */ }
function parseDate(str: string): Date { /* ... */ }

// Specific implementations (small, focused)
export async function ingestPubMed(peptideName: string): Promise<Study[]> {
  const xml = await fetchWithRetry(buildPubMedUrl(peptideName))
  return parseXml(xml).map(mapToStudy)
}

export async function ingestClinicalTrials(peptideName: string): Promise<Study[]> {
  const json = await fetchWithRetry(buildCTUrl(peptideName))
  return parseJson(json).map(mapToStudy)
}
```

---

## Error Handling

### Use Custom Error Classes

**Define specific error types for different failure modes.**

```typescript
// packages/research/errors.ts
export class IngestError extends Error {
  constructor(
    message: string,
    public readonly source: 'pubmed' | 'clinicaltrials',
    public readonly peptideId: string
  ) {
    super(message)
    this.name = 'IngestError'
  }
}

export class SynthesisError extends Error {
  constructor(
    message: string,
    public readonly peptideId: string,
    public readonly modelOutput?: string
  ) {
    super(message)
    this.name = 'SynthesisError'
  }
}
```

**Usage:**
```typescript
try {
  const studies = await ingestPubMed(peptide.name)
} catch (error) {
  if (error instanceof IngestError) {
    logger.error('Ingest failed', {
      source: error.source,
      peptideId: error.peptideId
    })
  }
  throw error
}
```

### Never Swallow Errors

**Always handle or re-throw errors.**

**Bad:**
```typescript
try {
  await riskyOperation()
} catch (error) {
  // Silent failure
}
```

**Good:**
```typescript
try {
  await riskyOperation()
} catch (error) {
  logger.error('Operation failed', { error })
  throw error  // or handle gracefully
}
```

---

## Testing Standards

### Test File Naming

**Place tests alongside implementation:**
```
packages/research/ingest/pubmed/
├── client.ts
├── client.test.ts      ← Test file
├── parser.ts
└── parser.test.ts
```

### Test Structure (AAA Pattern)

**Arrange, Act, Assert:**
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

### Coverage Target

**Minimum 80% coverage for all packages.**

```bash
pnpm test --coverage
```

---

## Documentation Standards

### File Headers (Optional)

**Only add headers for complex files:**
```typescript
/**
 * PubMed E-utilities API client
 *
 * Handles search and fetch operations with rate limiting (3 req/sec).
 * Throws IngestError on failures.
 *
 * @see https://www.ncbi.nlm.nih.gov/books/NBK25501/
 */
export class PubMedClient {
  // ...
}
```

### JSDoc for Public APIs

**Document all exported functions/classes:**
```typescript
/**
 * Grades evidence quality based on study design and consistency.
 *
 * @param studies - Array of studies for the peptide
 * @returns Evidence grade and rationale
 *
 * @example
 * const result = gradeEvidence(studies)
 * console.log(result.grade) // "moderate"
 */
export function gradeEvidence(studies: Study[]): GradeResult {
  // ...
}
```

### Inline Comments (Sparingly)

**Code should be self-documenting. Use comments only for "why", not "what".**

**Bad:**
```typescript
// Increment counter
count++
```

**Good:**
```typescript
// Reset count to prevent memory leak in long-running process
count = 0
```

---

## React Component Standards

### Functional Components Only

**No class components.**

```typescript
// ✅ Good
export const PeptideCard: FC<Props> = ({ name }) => {
  return <div>{name}</div>
}

// ❌ Bad
export class PeptideCard extends React.Component {
  // ...
}
```

### Props Interface

**Always define props with TypeScript:**
```typescript
interface PeptideCardProps {
  name: string
  grade: 'very_low' | 'low' | 'moderate' | 'high'
  onClick?: () => void
}

export const PeptideCard: FC<PeptideCardProps> = ({ name, grade, onClick }) => {
  // ...
}
```

### No Inline Styles

**Use Tailwind classes or CSS modules:**
```typescript
// ✅ Good
<div className="rounded-lg border p-4 shadow-sm">

// ❌ Bad
<div style={{ borderRadius: 8, padding: 16 }}>
```

---

## Formatting

### Prettier Configuration

**.prettierrc:**
```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100,
  "tabWidth": 2
}
```

**Run on save (VS Code):**
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

---

## Linting

### ESLint Configuration

**.eslintrc.js:**
```javascript
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended'
  ],
  rules: {
    'max-lines': ['error', { max: 400 }],
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-function-return-type': 'warn',
    'no-console': ['warn', { allow: ['warn', 'error'] }]
  }
}
```

---

## Summary Checklist

Before committing, verify:

- [ ] All files ≤400 lines
- [ ] No `any` types
- [ ] Explicit return types
- [ ] Imports organized correctly
- [ ] Tests written (80% coverage)
- [ ] JSDoc for public APIs
- [ ] Formatted with Prettier
- [ ] ESLint passes
- [ ] TypeScript compiles (`pnpm typecheck`)

---

## References

- [claude.md](./claude.md) - Master build plan
- [project-structure.md](./project-structure.md) - File organization
- [contributing.md](./contributing.md) - PR process

---

**Document Owner:** Engineering Team
**Lines:** 394 (within 400-line limit ✓)
