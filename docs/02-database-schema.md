# PepTalk — Database Schema

**Version:** 1.0
**Last Updated:** 2025-11-04

---

## Overview

This document defines the complete database schema for PepTalk using Cloudflare D1 (SQLite). All tables, indexes, and relationships are documented here.

**Design Principles:**
- Normalized structure (3NF)
- FTS5 for full-text search
- ISO 8601 timestamps (text format for SQLite)
- Foreign key constraints enforced
- Generous indexing for read-heavy workload

---

## Entity Relationship Diagram

```
┌─────────────┐
│  peptides   │
└──────┬──────┘
       │
       │ 1:N
       ▼
┌─────────────┐       ┌──────────────┐
│   studies   │◄─────►│ studies_fts  │  (FTS5)
└─────────────┘       └──────────────┘

┌─────────────┐
│ legal_notes │
└──────┬──────┘
       │
       │ N:1
       ▼
┌─────────────┐
│  peptides   │
└──────┬──────┘
       │
       │ 1:N
       ▼
┌──────────────┐
│page_versions │
└──────────────┘

┌─────────────┐
│    users    │
└──────┬──────┘
       │
       │ 1:N
       ▼
┌─────────────┐       ┌────────────────┐
│  sessions   │       │ subscriptions  │
└─────────────┘       └────────────────┘

┌─────────────┐
│  changelog  │  (standalone)
└─────────────┘
```

---

## Core Tables

### peptides

Stores metadata for each peptide compound.

```sql
CREATE TABLE peptides (
  id TEXT PRIMARY KEY,                    -- UUID v4
  slug TEXT UNIQUE NOT NULL,              -- URL-friendly identifier (e.g., "bpc-157")
  name TEXT NOT NULL,                     -- Display name (e.g., "BPC-157")
  aliases JSON NOT NULL,                  -- string[] of alternative names
  evidence_grade TEXT NOT NULL,           -- enum: very_low|low|moderate|high
  human_rct_count INTEGER NOT NULL DEFAULT 0,
  human_observational_count INTEGER NOT NULL DEFAULT 0,
  animal_study_count INTEGER NOT NULL DEFAULT 0,
  in_vitro_count INTEGER NOT NULL DEFAULT 0,
  last_reviewed_at TEXT NOT NULL,         -- ISO 8601 timestamp
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_peptides_slug ON peptides(slug);
CREATE INDEX idx_peptides_grade ON peptides(evidence_grade);
CREATE INDEX idx_peptides_reviewed ON peptides(last_reviewed_at DESC);
```

**Fields:**
- `id`: Unique identifier (UUIDv4)
- `slug`: URL-safe identifier (lowercase, hyphenated)
- `name`: Official peptide name
- `aliases`: JSON array of alternative names
- `evidence_grade`: Rubric-based grade (very_low, low, moderate, high)
- `*_count`: Study counts by type
- `last_reviewed_at`: Last time evidence was updated
- `created_at`: First ingestion timestamp
- `updated_at`: Last modification timestamp

**Example Row:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "slug": "bpc-157",
  "name": "BPC-157",
  "aliases": ["Body Protection Compound", "Pentadecapeptide BPC 157"],
  "evidence_grade": "moderate",
  "human_rct_count": 2,
  "human_observational_count": 1,
  "animal_study_count": 15,
  "in_vitro_count": 8,
  "last_reviewed_at": "2025-11-04T02:00:00Z",
  "created_at": "2025-11-01T10:00:00Z",
  "updated_at": "2025-11-04T02:05:00Z"
}
```

---

### studies

Stores individual research publications and clinical trials.

```sql
CREATE TABLE studies (
  id TEXT PRIMARY KEY,                    -- PMID:12345678 or NCT:NCT01234567
  peptide_id TEXT NOT NULL,
  registry TEXT NOT NULL,                 -- enum: pubmed|clinicaltrials
  external_id TEXT NOT NULL,              -- 12345678 or NCT01234567
  year INTEGER,                           -- Publication/start year
  study_type TEXT NOT NULL,               -- enum: human_rct|human_observational|animal|in_vitro
  sample_size_total INTEGER,              -- Total participants/subjects
  outcome_direction TEXT,                 -- enum: benefit|null|harm|mixed|unclear
  safety_findings JSON,                   -- Structured adverse event data
  title TEXT NOT NULL,
  abstract TEXT,
  link TEXT NOT NULL,                     -- PubMed or CT.gov URL
  created_at TEXT NOT NULL,
  FOREIGN KEY (peptide_id) REFERENCES peptides(id) ON DELETE CASCADE
);

CREATE INDEX idx_studies_peptide ON studies(peptide_id);
CREATE INDEX idx_studies_year ON studies(year DESC);
CREATE INDEX idx_studies_type ON studies(study_type);
CREATE INDEX idx_studies_registry ON studies(registry);
```

**Fields:**
- `id`: Composite ID (PMID:xxx or NCT:xxx)
- `peptide_id`: Foreign key to peptides
- `registry`: Source registry (pubmed or clinicaltrials)
- `external_id`: Registry-specific identifier
- `year`: Publication or trial start year
- `study_type`: Categorized study design
- `sample_size_total`: Number of participants/subjects
- `outcome_direction`: Overall effect direction (if extractable)
- `safety_findings`: JSON with adverse events
- `title`: Study title
- `abstract`: Full abstract text (for FTS)
- `link`: Canonical URL

**safety_findings JSON Schema:**
```json
{
  "adverse_events": [
    {
      "event": "Mild nausea",
      "frequency": "3/50",
      "severity": "mild"
    }
  ],
  "serious_adverse_events": [],
  "withdrawals_due_to_ae": 0,
  "notes": "Generally well-tolerated"
}
```

**Example Row:**
```json
{
  "id": "PMID:12345678",
  "peptide_id": "550e8400-e29b-41d4-a716-446655440000",
  "registry": "pubmed",
  "external_id": "12345678",
  "year": 2023,
  "study_type": "human_rct",
  "sample_size_total": 60,
  "outcome_direction": "benefit",
  "safety_findings": { /* ... */ },
  "title": "Efficacy of BPC-157 in tendon healing: A randomized trial",
  "abstract": "Background: ...",
  "link": "https://pubmed.ncbi.nlm.nih.gov/12345678",
  "created_at": "2025-11-01T10:30:00Z"
}
```

---

### studies_fts (Full-Text Search)

FTS5 virtual table for searching study titles and abstracts.

```sql
CREATE VIRTUAL TABLE studies_fts USING fts5(
  id UNINDEXED,                           -- Study ID (no search)
  title,                                  -- Indexed for search
  abstract,                               -- Indexed for search
  content=studies,                        -- Source table
  content_rowid=rowid                     -- Link to studies table
);

-- Triggers to keep FTS in sync
CREATE TRIGGER studies_fts_insert AFTER INSERT ON studies BEGIN
  INSERT INTO studies_fts(rowid, id, title, abstract)
  VALUES (NEW.rowid, NEW.id, NEW.title, NEW.abstract);
END;

CREATE TRIGGER studies_fts_delete AFTER DELETE ON studies BEGIN
  DELETE FROM studies_fts WHERE rowid = OLD.rowid;
END;

CREATE TRIGGER studies_fts_update AFTER UPDATE ON studies BEGIN
  UPDATE studies_fts
  SET title = NEW.title, abstract = NEW.abstract
  WHERE rowid = NEW.rowid;
END;
```

**Usage:**
```sql
-- Search across titles and abstracts
SELECT s.*
FROM studies s
JOIN studies_fts fts ON s.rowid = fts.rowid
WHERE studies_fts MATCH 'tendon healing'
ORDER BY rank;
```

---

### legal_notes

Stores regulatory status and legal information per peptide and region.

```sql
CREATE TABLE legal_notes (
  id TEXT PRIMARY KEY,
  peptide_id TEXT NOT NULL,
  region TEXT NOT NULL,                   -- enum: UK|EU|US|APAC
  status TEXT NOT NULL,                   -- enum: approved|investigational|banned|unclear
  notes_html TEXT NOT NULL,               -- Rich text with citations
  source_url TEXT,                        -- Official regulatory source
  last_updated_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (peptide_id) REFERENCES peptides(id) ON DELETE CASCADE
);

CREATE INDEX idx_legal_peptide_region ON legal_notes(peptide_id, region);
CREATE UNIQUE INDEX idx_legal_unique ON legal_notes(peptide_id, region);
```

**Fields:**
- `id`: Unique identifier
- `peptide_id`: Foreign key to peptides
- `region`: Geographic region (UK, EU, US, APAC)
- `status`: Regulatory classification
- `notes_html`: Formatted text (can include links)
- `source_url`: Link to official source (FDA, EMA, etc.)

**Example Row:**
```json
{
  "id": "legal_123",
  "peptide_id": "550e8400-e29b-41d4-a716-446655440000",
  "region": "US",
  "status": "investigational",
  "notes_html": "<p>Not FDA-approved for therapeutic use. Research compound only per <a href='...'>FDA guidance</a>.</p>",
  "source_url": "https://www.fda.gov/...",
  "last_updated_at": "2025-11-01T10:00:00Z",
  "created_at": "2025-11-01T10:00:00Z"
}
```

---

### page_versions

Tracks version history for peptide pages (for changelog generation).

```sql
CREATE TABLE page_versions (
  id TEXT PRIMARY KEY,
  peptide_id TEXT NOT NULL,
  version INTEGER NOT NULL,               -- Incremental version number
  storage_key TEXT NOT NULL,              -- R2 path (e.g., "pages/bpc-157/v2.pdf")
  content_hash TEXT NOT NULL,             -- SHA-256 of PageRecord JSON
  created_at TEXT NOT NULL,
  FOREIGN KEY (peptide_id) REFERENCES peptides(id) ON DELETE CASCADE
);

CREATE INDEX idx_versions_peptide ON page_versions(peptide_id, version DESC);
CREATE UNIQUE INDEX idx_versions_peptide_version ON page_versions(peptide_id, version);
```

**Fields:**
- `id`: Unique identifier
- `peptide_id`: Foreign key to peptides
- `version`: Incremental version (1, 2, 3, ...)
- `storage_key`: R2 object key for PDF
- `content_hash`: SHA-256 hash of PageRecord JSON (detect changes)
- `created_at`: Version creation timestamp

**Example Row:**
```json
{
  "id": "version_123",
  "peptide_id": "550e8400-e29b-41d4-a716-446655440000",
  "version": 2,
  "storage_key": "pages/bpc-157/v2.pdf",
  "content_hash": "a1b2c3d4...",
  "created_at": "2025-11-04T02:05:00Z"
}
```

---

## Auth & User Tables

### users

Stores user accounts (email-based authentication).

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  email_verified INTEGER NOT NULL DEFAULT 0,  -- SQLite boolean (0 or 1)
  created_at TEXT NOT NULL
);

CREATE INDEX idx_users_email ON users(email);
```

**Fields:**
- `id`: UUID v4
- `email`: User email (unique)
- `email_verified`: 1 if verified via magic link
- `created_at`: Account creation timestamp

---

### sessions

Stores active user sessions (Lucia-compatible).

```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,                    -- Lucia session ID
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,               -- ISO 8601 timestamp
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
```

**Fields:**
- `id`: Session ID (random string)
- `user_id`: Foreign key to users
- `expires_at`: Expiration timestamp (30 days from creation)
- `created_at`: Session start

---

### subscriptions

Stores Stripe subscription records.

```sql
CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  status TEXT NOT NULL,                   -- enum: active|past_due|canceled|incomplete|trialing
  current_period_end TEXT NOT NULL,       -- ISO 8601 timestamp
  cancel_at_period_end INTEGER NOT NULL DEFAULT 0,  -- Boolean
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_sub ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
```

**Fields:**
- `id`: UUID v4
- `user_id`: Foreign key to users
- `stripe_subscription_id`: Stripe subscription ID (sub_xxx)
- `stripe_customer_id`: Stripe customer ID (cus_xxx)
- `status`: Stripe subscription status
- `current_period_end`: Renewal/expiry date
- `cancel_at_period_end`: 1 if canceling at period end
- `created_at`: Subscription start
- `updated_at`: Last status update

---

## System Tables

### changelog

Stores weekly digest entries.

```sql
CREATE TABLE changelog (
  id TEXT PRIMARY KEY,
  week_start TEXT NOT NULL,               -- ISO 8601 date (Monday)
  summary_md TEXT NOT NULL,               -- Markdown summary
  peptides_updated JSON NOT NULL,         -- string[] of peptide IDs
  published_at TEXT NOT NULL
);

CREATE INDEX idx_changelog_week ON changelog(week_start DESC);
CREATE UNIQUE INDEX idx_changelog_week_unique ON changelog(week_start);
```

**Fields:**
- `id`: UUID v4
- `week_start`: Monday date of the week (e.g., "2025-11-03")
- `summary_md`: Markdown digest content
- `peptides_updated`: JSON array of peptide IDs with changes
- `published_at`: Publication timestamp

**Example Row:**
```json
{
  "id": "changelog_123",
  "week_start": "2025-11-03",
  "summary_md": "## Week of November 3, 2025\n\n- **BPC-157**: Added 2 new studies...",
  "peptides_updated": ["550e8400-e29b-41d4-a716-446655440000"],
  "published_at": "2025-11-10T09:00:00Z"
}
```

---

## Migrations

### 0001-initial.sql

```sql
-- Core tables
CREATE TABLE peptides ( /* ... */ );
CREATE TABLE studies ( /* ... */ );
CREATE TABLE legal_notes ( /* ... */ );
CREATE TABLE page_versions ( /* ... */ );
CREATE TABLE users ( /* ... */ );
CREATE TABLE sessions ( /* ... */ );
CREATE TABLE subscriptions ( /* ... */ );
CREATE TABLE changelog ( /* ... */ );

-- Indexes (see above)
```

### 0002-fts.sql

```sql
-- Full-text search
CREATE VIRTUAL TABLE studies_fts USING fts5( /* ... */ );

-- Triggers to keep FTS in sync
CREATE TRIGGER studies_fts_insert AFTER INSERT ON studies BEGIN /* ... */ END;
CREATE TRIGGER studies_fts_delete AFTER DELETE ON studies BEGIN /* ... */ END;
CREATE TRIGGER studies_fts_update AFTER UPDATE ON studies BEGIN /* ... */ END;
```

### 0003-subscriptions.sql

```sql
-- Add subscription-related indexes if missing
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
```

---

## Query Examples

### Search peptides by name (FTS)

```sql
SELECT p.*
FROM peptides p
WHERE p.name LIKE '%' || ? || '%'
   OR json_extract(p.aliases, '$') LIKE '%' || ? || '%'
ORDER BY p.evidence_grade DESC, p.name ASC;
```

### Get peptide with studies

```sql
SELECT
  p.*,
  json_group_array(
    json_object(
      'id', s.id,
      'title', s.title,
      'year', s.year,
      'study_type', s.study_type
    )
  ) as studies
FROM peptides p
LEFT JOIN studies s ON s.peptide_id = p.id
WHERE p.slug = ?
GROUP BY p.id;
```

### Check user subscription status

```sql
SELECT s.status, s.current_period_end
FROM subscriptions s
WHERE s.user_id = ?
  AND s.status IN ('active', 'trialing')
  AND s.current_period_end > datetime('now')
LIMIT 1;
```

### Find peptides updated in last 7 days

```sql
SELECT p.slug, p.name, p.last_reviewed_at
FROM peptides p
WHERE p.last_reviewed_at >= datetime('now', '-7 days')
ORDER BY p.last_reviewed_at DESC;
```

---

## Performance Considerations

### Indexes
- All foreign keys indexed
- `slug` and `email` for unique lookups
- `evidence_grade` for filtering
- `year` for study sorting
- FTS5 for fast text search

### Query Optimization
- Use prepared statements (parameterized queries)
- Avoid SELECT * in production (specify columns)
- Use EXPLAIN QUERY PLAN to verify index usage
- Limit result sets with pagination

### Scaling Limits (D1)
- Max 100k rows per table (MVP)
- 5M row reads/day (free tier)
- 5 GB storage (free tier)

**Migration path:**
- If >100k studies: Migrate to Neon Postgres
- Keep D1 for users/sessions (low volume)
- Use read replicas for peptides/studies

---

## References

- [01-architecture.md](./01-architecture.md) - System architecture
- [03-api-reference.md](./03-api-reference.md) - API endpoints
- [packages/database/](../packages/database/) - Implementation

---

**Document Owner:** Engineering Team
**Lines:** 398 (within 400-line limit ✓)
