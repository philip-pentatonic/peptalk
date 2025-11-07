-- Part 1: Create Tables (run this first)

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

CREATE TABLE IF NOT EXISTS user_journal (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  peptide_slug TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_alerts (
  user_id TEXT NOT NULL,
  peptide_slug TEXT NOT NULL,
  alert_type TEXT NOT NULL CHECK(alert_type IN ('new_study', 'clinical_trial', 'fda_news', 'all')),
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, peptide_slug, alert_type)
);

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

CREATE TABLE IF NOT EXISTS user_news_read (
  user_id TEXT NOT NULL,
  news_id TEXT NOT NULL,
  read_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, news_id)
);

CREATE TABLE IF NOT EXISTS peptide_metrics (
  peptide_slug TEXT PRIMARY KEY,
  view_count INTEGER NOT NULL DEFAULT 0,
  search_count INTEGER NOT NULL DEFAULT 0,
  save_count INTEGER NOT NULL DEFAULT 0,
  last_viewed TEXT,
  last_searched TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS peptide_metrics_daily (
  peptide_slug TEXT NOT NULL,
  date TEXT NOT NULL,
  view_count INTEGER NOT NULL DEFAULT 0,
  search_count INTEGER NOT NULL DEFAULT 0,
  save_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (peptide_slug, date)
);
