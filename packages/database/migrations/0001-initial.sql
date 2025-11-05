-- PepTalk Initial Database Schema
-- SQLite (Cloudflare D1)
-- Created: 2025-11-04

-- ============================================================================
-- Core Tables
-- ============================================================================

-- Peptides table: Main peptide records
CREATE TABLE peptides (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  aliases JSON NOT NULL DEFAULT '[]',
  evidence_grade TEXT NOT NULL CHECK(evidence_grade IN ('very_low', 'low', 'moderate', 'high')),
  human_rct_count INTEGER NOT NULL DEFAULT 0,
  animal_count INTEGER NOT NULL DEFAULT 0,
  summary_html TEXT NOT NULL,
  last_updated TEXT NOT NULL DEFAULT (datetime('now')),
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_peptides_slug ON peptides(slug);
CREATE INDEX idx_peptides_evidence_grade ON peptides(evidence_grade);

-- Studies table: Research studies (PubMed + ClinicalTrials.gov)
CREATE TABLE studies (
  id TEXT PRIMARY KEY,
  peptide_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('pubmed', 'clinicaltrials')),
  title TEXT NOT NULL,
  study_type TEXT NOT NULL CHECK(study_type IN (
    'human_rct',
    'human_observational',
    'human_case_report',
    'animal_invivo',
    'animal_invitro'
  )),

  -- PubMed fields
  pmid TEXT,
  abstract TEXT,
  authors JSON,
  journal TEXT,
  year INTEGER,
  doi TEXT,

  -- ClinicalTrials fields
  nct_id TEXT,
  status TEXT,
  phase TEXT,
  conditions JSON,
  interventions JSON,
  enrollment INTEGER,
  start_date TEXT,
  completion_date TEXT,

  url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (peptide_id) REFERENCES peptides(slug) ON DELETE CASCADE
);

CREATE INDEX idx_studies_peptide_id ON studies(peptide_id);
CREATE INDEX idx_studies_type ON studies(type);
CREATE INDEX idx_studies_study_type ON studies(study_type);
CREATE INDEX idx_studies_pmid ON studies(pmid);
CREATE INDEX idx_studies_nct_id ON studies(nct_id);

-- Full-text search for studies
CREATE VIRTUAL TABLE studies_fts USING fts5(
  id UNINDEXED,
  title,
  abstract,
  content=studies,
  content_rowid=rowid
);

-- Triggers to keep FTS in sync
CREATE TRIGGER studies_fts_insert AFTER INSERT ON studies BEGIN
  INSERT INTO studies_fts(rowid, id, title, abstract)
  VALUES (new.rowid, new.id, new.title, COALESCE(new.abstract, ''));
END;

CREATE TRIGGER studies_fts_delete AFTER DELETE ON studies BEGIN
  DELETE FROM studies_fts WHERE rowid = old.rowid;
END;

CREATE TRIGGER studies_fts_update AFTER UPDATE ON studies BEGIN
  UPDATE studies_fts
  SET title = new.title, abstract = COALESCE(new.abstract, '')
  WHERE rowid = old.rowid;
END;

-- Legal notes table: Compliance disclaimers
CREATE TABLE legal_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  peptide_id TEXT NOT NULL,
  note_text TEXT NOT NULL,
  note_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (peptide_id) REFERENCES peptides(slug) ON DELETE CASCADE
);

CREATE INDEX idx_legal_notes_peptide_id ON legal_notes(peptide_id);

-- Page sections table: Content sections
CREATE TABLE page_sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  peptide_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content_html TEXT NOT NULL,
  section_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (peptide_id) REFERENCES peptides(slug) ON DELETE CASCADE
);

CREATE INDEX idx_page_sections_peptide_id ON page_sections(peptide_id);

-- Page versions table: Version history
CREATE TABLE page_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  peptide_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  content_snapshot JSON NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (peptide_id) REFERENCES peptides(slug) ON DELETE CASCADE,
  UNIQUE(peptide_id, version)
);

CREATE INDEX idx_page_versions_peptide_id ON page_versions(peptide_id);

-- ============================================================================
-- User & Auth Tables
-- ============================================================================

-- Users table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  email_verified INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_users_email ON users(email);

-- Sessions table (Lucia)
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);

-- Subscriptions table (Stripe)
CREATE TABLE subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  status TEXT NOT NULL,
  current_period_end TEXT NOT NULL,
  cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- ============================================================================
-- Audit Tables
-- ============================================================================

-- Changelog table: Track all changes
CREATE TABLE changelog (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  changes JSON,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_changelog_entity ON changelog(entity_type, entity_id);
CREATE INDEX idx_changelog_created_at ON changelog(created_at);
