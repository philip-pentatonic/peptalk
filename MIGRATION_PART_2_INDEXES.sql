-- Part 2: Create Indexes (run this second)

CREATE INDEX IF NOT EXISTS idx_user_peptides_user ON user_peptides(user_id);
CREATE INDEX IF NOT EXISTS idx_user_peptides_status ON user_peptides(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_peptides_updated ON user_peptides(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_journal_user ON user_journal(user_id);
CREATE INDEX IF NOT EXISTS idx_user_journal_peptide ON user_journal(peptide_slug);
CREATE INDEX IF NOT EXISTS idx_user_journal_created ON user_journal(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_alerts_user ON user_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_peptide_news_published ON peptide_news(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_peptide_news_peptide ON peptide_news(peptide_slug);
CREATE INDEX IF NOT EXISTS idx_peptide_news_type ON peptide_news(type);
CREATE INDEX IF NOT EXISTS idx_peptide_news_created ON peptide_news(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_news_read_user ON user_news_read(user_id);
CREATE INDEX IF NOT EXISTS idx_user_news_read_at ON user_news_read(read_at DESC);
CREATE INDEX IF NOT EXISTS idx_peptide_metrics_views ON peptide_metrics(view_count DESC);
CREATE INDEX IF NOT EXISTS idx_peptide_metrics_saves ON peptide_metrics(save_count DESC);
CREATE INDEX IF NOT EXISTS idx_peptide_metrics_daily_date ON peptide_metrics_daily(date DESC);
CREATE INDEX IF NOT EXISTS idx_peptide_metrics_daily_views ON peptide_metrics_daily(view_count DESC);
