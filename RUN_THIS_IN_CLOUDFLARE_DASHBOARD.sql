-- ============================================================================
-- MIGRATION 0005: USER RETENTION FEATURES
-- Run this in Cloudflare Dashboard > D1 > peptalk-db > Console
-- ============================================================================

-- User Peptide Tracking
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

-- User Journal
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

-- User Alerts
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

-- News Feed
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

-- News Read Tracking
CREATE TABLE IF NOT EXISTS user_news_read (
  user_id TEXT NOT NULL,
  news_id TEXT NOT NULL,
  read_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, news_id)
);

CREATE INDEX IF NOT EXISTS idx_user_news_read_user ON user_news_read(user_id);
CREATE INDEX IF NOT EXISTS idx_user_news_read_at ON user_news_read(read_at DESC);

-- Peptide Metrics
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

-- Daily Metrics
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
-- SAMPLE DATA
-- ============================================================================

-- Sample News Items
INSERT OR IGNORE INTO peptide_news (id, title, type, peptide_slug, content, summary, source, source_url, published_at)
VALUES (
  'news-bpc157-2025-01',
  'New Clinical Trial: BPC-157 for Inflammatory Bowel Disease',
  'clinical_trial',
  'bpc-157',
  'A new Phase 2 clinical trial has been announced investigating BPC-157 (Body Protection Compound) for the treatment of inflammatory bowel disease (IBD). The trial will enroll 120 patients across multiple sites and evaluate safety, tolerability, and preliminary efficacy over 12 weeks.',
  'Phase 2 trial announced for BPC-157 in IBD treatment',
  'ClinicalTrials.gov',
  'https://clinicaltrials.gov/study/NCT12345678',
  '2025-01-05T10:00:00Z'
);

INSERT OR IGNORE INTO peptide_news (id, title, type, peptide_slug, content, summary, source, source_url, published_at)
VALUES (
  'news-semaglutide-2025-01',
  'FDA Approves Expanded Indication for Semaglutide',
  'fda_news',
  'semaglutide',
  'The U.S. Food and Drug Administration has approved an expanded indication for semaglutide (Wegovy) to include reduction of cardiovascular risk in adults with obesity and established cardiovascular disease. This approval is based on the SELECT trial results showing a 20% reduction in major adverse cardiovascular events.',
  'FDA expands semaglutide approval to include CV risk reduction',
  'FDA',
  'https://www.fda.gov/news-events',
  '2025-01-04T14:30:00Z'
);

INSERT OR IGNORE INTO peptide_news (id, title, type, peptide_slug, content, summary, source, source_url, published_at)
VALUES (
  'news-tb500-2025-01',
  'TB-500 Shows Promise in Tendon Repair Study',
  'new_study',
  'tb-500',
  'New research published in the Journal of Orthopedic Research demonstrates that TB-500 (Thymosin Beta-4) significantly accelerated tendon healing in a controlled animal study. The peptide showed a 40% improvement in tensile strength compared to controls at 4 weeks post-injury.',
  'TB-500 accelerates tendon healing by 40% in animal study',
  'Journal of Orthopedic Research',
  'https://pubmed.ncbi.nlm.nih.gov/12345678',
  '2025-01-06T08:00:00Z'
);

-- Sample Metrics
INSERT OR IGNORE INTO peptide_metrics (peptide_slug, view_count, search_count, save_count, last_viewed, updated_at)
VALUES
  ('bpc-157', 1250, 430, 89, '2025-01-06T08:00:00Z', '2025-01-06T08:00:00Z'),
  ('semaglutide', 2340, 890, 156, '2025-01-06T08:00:00Z', '2025-01-06T08:00:00Z'),
  ('cjc-1295', 876, 320, 67, '2025-01-06T08:00:00Z', '2025-01-06T08:00:00Z'),
  ('ipamorelin', 654, 245, 52, '2025-01-06T08:00:00Z', '2025-01-06T08:00:00Z'),
  ('tb-500', 1120, 390, 78, '2025-01-06T08:00:00Z', '2025-01-06T08:00:00Z');

-- ============================================================================
-- DONE! Your retention features are now live.
-- ============================================================================
