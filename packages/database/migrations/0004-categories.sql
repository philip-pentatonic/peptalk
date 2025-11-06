-- Add categories/tags for peptide use cases
-- This allows users to filter peptides by use case (weight loss, skin, muscle, etc.)

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- emoji or icon identifier
  display_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Peptide-Category junction table (many-to-many)
CREATE TABLE IF NOT EXISTS peptide_categories (
  peptide_id TEXT NOT NULL,
  category_id TEXT NOT NULL,
  confidence TEXT DEFAULT 'high', -- high, medium, low (based on evidence)
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (peptide_id, category_id),
  FOREIGN KEY (peptide_id) REFERENCES peptides(slug) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- Index for fast category lookups
CREATE INDEX IF NOT EXISTS idx_peptide_categories_category ON peptide_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_peptide_categories_peptide ON peptide_categories(peptide_id);

-- Seed common categories
INSERT INTO categories (id, slug, name, description, icon, display_order) VALUES
  ('cat_weight_loss', 'weight-loss', 'Weight Loss', 'Peptides studied for fat loss, metabolism, and body composition', '⚖️', 1),
  ('cat_muscle', 'muscle-growth', 'Muscle Growth', 'Peptides for muscle building, recovery, and performance', '💪', 2),
  ('cat_skin', 'skin-health', 'Skin & Anti-Aging', 'Peptides for skin quality, wrinkles, and aging', '✨', 3),
  ('cat_healing', 'healing', 'Healing & Recovery', 'Wound healing, tissue repair, and injury recovery', '🩹', 4),
  ('cat_immune', 'immune', 'Immune Support', 'Immune system modulation and support', '🛡️', 5),
  ('cat_cognitive', 'cognitive', 'Cognitive Function', 'Brain health, memory, and neuroprotection', '🧠', 6),
  ('cat_longevity', 'longevity', 'Longevity & Aging', 'Anti-aging, telomere support, and lifespan extension', '⏳', 7),
  ('cat_joint', 'joint-bone', 'Joint & Bone Health', 'Cartilage, bone density, and joint support', '🦴', 8),
  ('cat_gut', 'gut-health', 'Gut Health', 'Digestive health and intestinal repair', '🫃', 9),
  ('cat_hormone', 'hormone', 'Hormone Support', 'Growth hormone, testosterone, and hormonal balance', '⚗️', 10)
ON CONFLICT(id) DO NOTHING;

-- Example: Tag BPC-157 with relevant categories
-- (This would be done by research pipeline or admin interface)
INSERT INTO peptide_categories (peptide_id, category_id, confidence) VALUES
  ('bpc-157', 'cat_healing', 'high'),
  ('bpc-157', 'cat_gut', 'high'),
  ('bpc-157', 'cat_joint', 'medium')
ON CONFLICT DO NOTHING;

-- Tag other peptides
INSERT INTO peptide_categories (peptide_id, category_id, confidence) VALUES
  ('tb-500', 'cat_healing', 'high'),
  ('tb-500', 'cat_muscle', 'medium'),
  ('thymosin-alpha-1', 'cat_immune', 'high'),
  ('epithalon', 'cat_longevity', 'medium'),
  ('epithalon', 'cat_skin', 'low'),
  ('ghk-cu', 'cat_skin', 'high'),
  ('ghk-cu', 'cat_healing', 'high')
ON CONFLICT DO NOTHING;
