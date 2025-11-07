-- Migration 0005: User Features (Personal Dashboard & News Feed)
-- Created: 2025-01-06
-- Purpose: Add user peptide tracking and news feed for retention features

-- ============================================================================
-- User Peptide Tracking (Personal Dashboard)
-- ============================================================================

-- Track which peptides users are interested in, using, or have tried
CREATE TABLE IF NOT EXISTS user_peptides (
  user_id TEXT NOT NULL,
  peptide_slug TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('saved', 'using', 'tried')),
  notes TEXT,
  dosage TEXT,
  frequency TEXT,
  start_date TEXT,
  end_date TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, peptide_slug)
);

CREATE INDEX IF NOT EXISTS idx_user_peptides_user ON user_peptides(user_id);
CREATE INDEX IF NOT EXISTS idx_user_peptides_status ON user_peptides(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_peptides_updated ON user_peptides(updated_at DESC);

-- User research journal entries
CREATE TABLE IF NOT EXISTS user_journal (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  peptide_slug TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_journal_user ON user_journal(user_id);
CREATE INDEX IF NOT EXISTS idx_user_journal_peptide ON user_journal(peptide_slug);
CREATE INDEX IF NOT EXISTS idx_user_journal_created ON user_journal(created_at DESC);

-- User alert preferences
CREATE TABLE IF NOT EXISTS user_alerts (
  user_id TEXT NOT NULL,
  peptide_slug TEXT NOT NULL,
  alert_type TEXT NOT NULL CHECK(alert_type IN ('new_study', 'clinical_trial', 'fda_news', 'all')),
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, peptide_slug, alert_type)
);

CREATE INDEX IF NOT EXISTS idx_user_alerts_user ON user_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_alerts_enabled ON user_alerts(enabled) WHERE enabled = 1;

-- ============================================================================
-- News Feed System
-- ============================================================================

-- Peptide-related news items (studies, trials, FDA announcements, etc.)
CREATE TABLE IF NOT EXISTS peptide_news (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('new_study', 'clinical_trial', 'fda_news', 'trending', 'industry_news')),
  peptide_slug TEXT,
  content TEXT NOT NULL,
  summary TEXT,
  source TEXT NOT NULL,
  source_url TEXT,
  pmid TEXT,
  nct_id TEXT,
  published_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_peptide_news_published ON peptide_news(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_peptide_news_peptide ON peptide_news(peptide_slug);
CREATE INDEX IF NOT EXISTS idx_peptide_news_type ON peptide_news(type);
CREATE INDEX IF NOT EXISTS idx_peptide_news_created ON peptide_news(created_at DESC);

-- Track which users have read which news items
CREATE TABLE IF NOT EXISTS user_news_read (
  user_id TEXT NOT NULL,
  news_id TEXT NOT NULL,
  read_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, news_id)
);

CREATE INDEX IF NOT EXISTS idx_user_news_read_user ON user_news_read(user_id);
CREATE INDEX IF NOT EXISTS idx_user_news_read_at ON user_news_read(read_at DESC);

-- ============================================================================
-- Trending/Popular Tracking
-- ============================================================================

-- Track peptide search/view metrics for trending calculations
CREATE TABLE IF NOT EXISTS peptide_metrics (
  peptide_slug TEXT PRIMARY KEY,
  view_count INTEGER NOT NULL DEFAULT 0,
  search_count INTEGER NOT NULL DEFAULT 0,
  save_count INTEGER NOT NULL DEFAULT 0,
  last_viewed TEXT,
  last_searched TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_peptide_metrics_views ON peptide_metrics(view_count DESC);
CREATE INDEX IF NOT EXISTS idx_peptide_metrics_saves ON peptide_metrics(save_count DESC);

-- Daily snapshot for trending calculations
CREATE TABLE IF NOT EXISTS peptide_metrics_daily (
  peptide_slug TEXT NOT NULL,
  date TEXT NOT NULL,
  view_count INTEGER NOT NULL DEFAULT 0,
  search_count INTEGER NOT NULL DEFAULT 0,
  save_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (peptide_slug, date)
);

CREATE INDEX IF NOT EXISTS idx_peptide_metrics_daily_date ON peptide_metrics_daily(date DESC);
CREATE INDEX IF NOT EXISTS idx_peptide_metrics_daily_views ON peptide_metrics_daily(view_count DESC);

-- ============================================================================
-- Sample Data (for testing)
-- ============================================================================

-- Sample news item for BPC-157
INSERT OR IGNORE INTO peptide_news (id, title, type, peptide_slug, content, summary, source, source_url, pmid, published_at)
VALUES (
  'news-bpc157-2025-01',
  'New Clinical Trial: BPC-157 for Inflammatory Bowel Disease',
  'clinical_trial',
  'bpc-157',
  'A new Phase 2 clinical trial has been announced investigating BPC-157 (Body Protection Compound) for the treatment of inflammatory bowel disease (IBD). The trial will enroll 120 patients across multiple sites and evaluate safety, tolerability, and preliminary efficacy over 12 weeks.',
  'Phase 2 trial announced for BPC-157 in IBD treatment',
  'ClinicalTrials.gov',
  'https://clinicaltrials.gov/study/NCT12345678',
  NULL,
  '2025-01-05T10:00:00Z'
);

-- Sample news item for Semaglutide
INSERT OR IGNORE INTO peptide_news (id, title, type, peptide_slug, content, summary, source, source_url, pmid, published_at)
VALUES (
  'news-semaglutide-2025-01',
  'FDA Approves Expanded Indication for Semaglutide',
  'fda_news',
  'semaglutide',
  'The U.S. Food and Drug Administration has approved an expanded indication for semaglutide (Wegovy) to include reduction of cardiovascular risk in adults with obesity and established cardiovascular disease. This approval is based on the SELECT trial results showing a 20% reduction in major adverse cardiovascular events.',
  'FDA expands semaglutide approval to include CV risk reduction',
  'FDA',
  'https://www.fda.gov/news-events',
  NULL,
  '2025-01-04T14:30:00Z'
);

-- Sample trending data
INSERT OR IGNORE INTO peptide_metrics (peptide_slug, view_count, search_count, save_count, last_viewed, updated_at)
VALUES
  ('bpc-157', 1250, 430, 89, '2025-01-06T08:00:00Z', '2025-01-06T08:00:00Z'),
  ('semaglutide', 2340, 890, 156, '2025-01-06T08:00:00Z', '2025-01-06T08:00:00Z'),
  ('cjc-1295', 876, 320, 67, '2025-01-06T08:00:00Z', '2025-01-06T08:00:00Z'),
  ('ipamorelin', 654, 245, 52, '2025-01-06T08:00:00Z', '2025-01-06T08:00:00Z');
