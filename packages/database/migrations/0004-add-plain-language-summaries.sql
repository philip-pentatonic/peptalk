-- Add plain language summaries to page sections
-- This provides accessible explanations for non-scientists

ALTER TABLE page_sections ADD COLUMN plain_language_summary TEXT;
