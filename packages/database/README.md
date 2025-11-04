# @peptalk/database

Database schema, migrations, and query utilities for PepTalk's Cloudflare D1 (SQLite) database.

## Purpose

This package provides:
- SQL migration files for database schema
- Type-safe query builders and utilities
- Reusable query patterns for common operations
- D1-specific helpers and utilities

## Database Structure

PepTalk uses Cloudflare D1 (SQLite) with the following tables:

### Core Tables

- **peptides** - Main peptide records with evidence grades
- **studies** - Research studies (PubMed + ClinicalTrials.gov)
- **studies_fts** - Full-text search index (FTS5)
- **legal_notes** - Compliance disclaimers and warnings
- **page_versions** - Version history for peptide pages

### User & Subscription Tables

- **users** - User accounts (email-based)
- **sessions** - Lucia session management
- **subscriptions** - Stripe subscription records

### Audit Tables

- **changelog** - Audit log for data changes

## Migrations

### Running Migrations

```bash
# Local development
pnpm migrate:local

# Production
pnpm migrate:prod
```

### Migration Files

Located in `migrations/` directory:

- `0001-initial.sql` - Initial schema setup
- `0002-*.sql` - Future migrations (append only)

### Migration Naming Convention

Format: `NNNN-description.sql`

Example:
- `0001-initial.sql`
- `0002-add-admin-users.sql`
- `0003-add-study-metadata.sql`

## Usage

### Basic Query

```typescript
import { db } from '@peptalk/database'

// Get peptide by slug
const peptide = await db.peptides.getBySlug(env.DB, 'bpc-157')

// List peptides with pagination
const peptides = await db.peptides.list(env.DB, {
  limit: 20,
  offset: 0,
  search: 'muscle'
})
```

### Full-Text Search

```typescript
import { db } from '@peptalk/database'

// Search studies
const results = await db.studies.search(env.DB, {
  query: 'healing muscle',
  limit: 10
})
```

### Transactions

```typescript
import { db } from '@peptalk/database'

// Execute multiple queries atomically
await db.transaction(env.DB, async (tx) => {
  await tx.peptides.create({ slug: 'new-peptide', name: 'New Peptide' })
  await tx.studies.create({ peptideId: 'new-peptide', pmid: '12345678' })
})
```

## API Reference

### Peptides

#### `db.peptides.getBySlug(db: D1Database, slug: string)`

Get peptide by slug.

**Returns:** `Promise<Peptide | null>`

```typescript
const peptide = await db.peptides.getBySlug(env.DB, 'bpc-157')
```

#### `db.peptides.list(db: D1Database, options: ListOptions)`

List peptides with pagination and search.

**Options:**
- `limit` (number, default: 20) - Max results
- `offset` (number, default: 0) - Skip results
- `search` (string, optional) - Search query
- `evidenceGrade` (EvidenceGrade, optional) - Filter by grade

**Returns:** `Promise<{ peptides: Peptide[], total: number }>`

```typescript
const { peptides, total } = await db.peptides.list(env.DB, {
  limit: 20,
  offset: 0,
  search: 'muscle',
  evidenceGrade: 'moderate'
})
```

#### `db.peptides.create(db: D1Database, data: CreatePeptide)`

Insert new peptide record.

**Returns:** `Promise<Peptide>`

```typescript
const peptide = await db.peptides.create(env.DB, {
  slug: 'bpc-157',
  name: 'BPC-157',
  aliases: ['Body Protection Compound'],
  evidenceGrade: 'moderate',
  humanRctCount: 5,
  animalCount: 23
})
```

#### `db.peptides.update(db: D1Database, slug: string, data: UpdatePeptide)`

Update existing peptide.

**Returns:** `Promise<Peptide>`

```typescript
const updated = await db.peptides.update(env.DB, 'bpc-157', {
  evidenceGrade: 'high',
  humanRctCount: 7
})
```

### Studies

#### `db.studies.getById(db: D1Database, id: string)`

Get study by ID (e.g., "PMID:12345678").

**Returns:** `Promise<Study | null>`

#### `db.studies.getByPeptide(db: D1Database, peptideId: string)`

Get all studies for a peptide.

**Returns:** `Promise<Study[]>`

#### `db.studies.search(db: D1Database, options: SearchOptions)`

Full-text search across study titles and abstracts.

**Options:**
- `query` (string, required) - Search terms
- `limit` (number, default: 10) - Max results
- `peptideId` (string, optional) - Filter by peptide

**Returns:** `Promise<Study[]>`

```typescript
const studies = await db.studies.search(env.DB, {
  query: 'healing muscle',
  limit: 10,
  peptideId: 'bpc-157'
})
```

#### `db.studies.create(db: D1Database, data: CreateStudy)`

Insert new study.

**Returns:** `Promise<Study>`

#### `db.studies.bulkInsert(db: D1Database, studies: CreateStudy[])`

Insert multiple studies efficiently.

**Returns:** `Promise<void>`

```typescript
await db.studies.bulkInsert(env.DB, [
  { id: 'PMID:123', type: 'pubmed', peptideId: 'bpc-157', ... },
  { id: 'PMID:456', type: 'pubmed', peptideId: 'bpc-157', ... }
])
```

### Users

#### `db.users.getById(db: D1Database, id: string)`

Get user by ID.

**Returns:** `Promise<User | null>`

#### `db.users.getByEmail(db: D1Database, email: string)`

Get user by email address.

**Returns:** `Promise<User | null>`

#### `db.users.create(db: D1Database, data: CreateUser)`

Create new user account.

**Returns:** `Promise<User>`

```typescript
const user = await db.users.create(env.DB, {
  email: 'user@example.com',
  emailVerified: false
})
```

### Subscriptions

#### `db.subscriptions.getByUserId(db: D1Database, userId: string)`

Get active subscription for user.

**Returns:** `Promise<Subscription | null>`

#### `db.subscriptions.create(db: D1Database, data: CreateSubscription)`

Create subscription record (after Stripe checkout).

**Returns:** `Promise<Subscription>`

```typescript
const subscription = await db.subscriptions.create(env.DB, {
  userId: user.id,
  stripeSubscriptionId: 'sub_...',
  stripeCustomerId: 'cus_...',
  status: 'active',
  currentPeriodEnd: new Date('2025-01-01')
})
```

#### `db.subscriptions.updateStatus(db: D1Database, stripeSubId: string, status: string)`

Update subscription status (via webhook).

**Returns:** `Promise<void>`

## Query Patterns

### Pagination

```typescript
const page = 1
const pageSize = 20

const { peptides, total } = await db.peptides.list(env.DB, {
  limit: pageSize,
  offset: (page - 1) * pageSize
})

const totalPages = Math.ceil(total / pageSize)
```

### Filtering

```typescript
// Filter by evidence grade
const highQuality = await db.peptides.list(env.DB, {
  evidenceGrade: 'high'
})

// Filter by search query
const matching = await db.peptides.list(env.DB, {
  search: 'collagen'
})
```

### Sorting

```typescript
// Sort by evidence grade (desc) then name (asc)
const peptides = await db.peptides.list(env.DB, {
  orderBy: 'evidence_grade DESC, name ASC'
})
```

## Testing

### Unit Tests

```bash
pnpm test
```

### Integration Tests

Located in `tests/integration/database.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { db } from '@peptalk/database'

describe('Peptides', () => {
  it('should create and retrieve peptide', async () => {
    const created = await db.peptides.create(testDb, {
      slug: 'test-peptide',
      name: 'Test Peptide'
    })

    const retrieved = await db.peptides.getBySlug(testDb, 'test-peptide')
    expect(retrieved).toEqual(created)
  })
})
```

## File Structure

```
packages/database/
├── src/
│   ├── index.ts              # Main exports
│   ├── types.ts              # TypeScript types
│   ├── queries/
│   │   ├── peptides.ts       # Peptide queries
│   │   ├── studies.ts        # Study queries
│   │   ├── users.ts          # User queries
│   │   └── subscriptions.ts  # Subscription queries
│   └── utils/
│       ├── transaction.ts    # Transaction helper
│       └── pagination.ts     # Pagination utilities
├── migrations/
│   └── 0001-initial.sql      # Initial schema
├── schema/
│   └── schema.sql            # Reference schema (not executed)
├── package.json
├── tsconfig.json
└── README.md
```

## Development

### Adding New Queries

1. Add query function to appropriate file in `src/queries/`
2. Export from `src/index.ts`
3. Add tests
4. Update this README

Example:

```typescript
// src/queries/peptides.ts
export async function getBySlug(
  db: D1Database,
  slug: string
): Promise<Peptide | null> {
  const result = await db
    .prepare('SELECT * FROM peptides WHERE slug = ?')
    .bind(slug)
    .first<Peptide>()

  return result || null
}
```

### Creating Migrations

1. Create new file: `migrations/NNNN-description.sql`
2. Write forward migration SQL
3. Test locally with `pnpm migrate:local`
4. Document in this README
5. Run in production with `pnpm migrate:prod`

## Performance Considerations

### Indexes

All frequently queried columns have indexes:
- `peptides.slug` (unique)
- `studies.peptide_id`
- `studies.pmid`
- `users.email` (unique)
- `subscriptions.user_id`

### Full-Text Search

Use `studies_fts` table for search queries:

```typescript
// Efficient (uses FTS index)
SELECT * FROM studies_fts WHERE studies_fts MATCH 'healing muscle'

// Inefficient (full table scan)
SELECT * FROM studies WHERE title LIKE '%healing%' OR abstract LIKE '%muscle%'
```

### Batch Operations

Use `bulkInsert` for multiple records:

```typescript
// Efficient
await db.studies.bulkInsert(env.DB, studies)

// Inefficient (N queries)
for (const study of studies) {
  await db.studies.create(env.DB, study)
}
```

## Related Documentation

- [docs/02-database-schema.md](../../docs/02-database-schema.md) - Complete schema design
- [docs/03-api-reference.md](../../docs/03-api-reference.md) - API endpoints using these queries
- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)
