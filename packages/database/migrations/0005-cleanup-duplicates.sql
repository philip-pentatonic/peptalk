-- Clean up duplicate BPC-157 entries
-- Keep only 'bpc-157' and delete all test/duplicate versions

-- First, let's see what we're deleting (for safety)
-- SELECT slug, name FROM peptides WHERE (slug LIKE '%bpc%' OR name LIKE '%BPC%') AND slug != 'bpc-157';

-- Delete page sections for duplicate entries
DELETE FROM page_sections
WHERE peptide_id IN (
  SELECT slug FROM peptides
  WHERE (slug LIKE '%bpc%' OR name LIKE '%BPC%')
  AND slug != 'bpc-157'
);

-- Delete studies for duplicate entries
DELETE FROM studies
WHERE peptide_id IN (
  SELECT slug FROM peptides
  WHERE (slug LIKE '%bpc%' OR name LIKE '%BPC%')
  AND slug != 'bpc-157'
);

-- Delete peptide_categories for duplicate entries (if they exist)
DELETE FROM peptide_categories
WHERE peptide_id IN (
  SELECT slug FROM peptides
  WHERE (slug LIKE '%bpc%' OR name LIKE '%BPC%')
  AND slug != 'bpc-157'
);

-- Delete the duplicate peptide entries
DELETE FROM peptides
WHERE (slug LIKE '%bpc%' OR name LIKE '%BPC%')
AND slug != 'bpc-157';

-- Log the cleanup in changelog
INSERT INTO changelog (entity_type, entity_id, action, changes)
VALUES (
  'system',
  'cleanup-2025-11-06',
  'cleanup',
  '{"action": "removed_duplicates", "peptide": "BPC-157", "kept_slug": "bpc-157", "reason": "Removed test and duplicate entries"}'
);
