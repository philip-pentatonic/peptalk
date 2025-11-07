-- Part 3: Insert Sample Data (run this third)

INSERT OR IGNORE INTO peptide_news (id, title, type, peptide_slug, content, summary, source, source_url, published_at) VALUES ('news-bpc157-2025-01', 'New Clinical Trial: BPC-157 for Inflammatory Bowel Disease', 'clinical_trial', 'bpc-157', 'A new Phase 2 clinical trial has been announced investigating BPC-157 (Body Protection Compound) for the treatment of inflammatory bowel disease (IBD). The trial will enroll 120 patients across multiple sites and evaluate safety, tolerability, and preliminary efficacy over 12 weeks.', 'Phase 2 trial announced for BPC-157 in IBD treatment', 'ClinicalTrials.gov', 'https://clinicaltrials.gov/study/NCT12345678', '2025-01-05T10:00:00Z');

INSERT OR IGNORE INTO peptide_news (id, title, type, peptide_slug, content, summary, source, source_url, published_at) VALUES ('news-semaglutide-2025-01', 'FDA Approves Expanded Indication for Semaglutide', 'fda_news', 'semaglutide', 'The U.S. Food and Drug Administration has approved an expanded indication for semaglutide (Wegovy) to include reduction of cardiovascular risk in adults with obesity and established cardiovascular disease. This approval is based on the SELECT trial results showing a 20% reduction in major adverse cardiovascular events.', 'FDA expands semaglutide approval to include CV risk reduction', 'FDA', 'https://www.fda.gov/news-events', '2025-01-04T14:30:00Z');

INSERT OR IGNORE INTO peptide_news (id, title, type, peptide_slug, content, summary, source, source_url, published_at) VALUES ('news-tb500-2025-01', 'TB-500 Shows Promise in Tendon Repair Study', 'new_study', 'tb-500', 'New research published in the Journal of Orthopedic Research demonstrates that TB-500 (Thymosin Beta-4) significantly accelerated tendon healing in a controlled animal study. The peptide showed a 40% improvement in tensile strength compared to controls at 4 weeks post-injury.', 'TB-500 accelerates tendon healing by 40% in animal study', 'Journal of Orthopedic Research', 'https://pubmed.ncbi.nlm.nih.gov/12345678', '2025-01-06T08:00:00Z');

INSERT OR IGNORE INTO peptide_metrics (peptide_slug, view_count, search_count, save_count, last_viewed, updated_at) VALUES ('bpc-157', 1250, 430, 89, '2025-01-06T08:00:00Z', '2025-01-06T08:00:00Z');

INSERT OR IGNORE INTO peptide_metrics (peptide_slug, view_count, search_count, save_count, last_viewed, updated_at) VALUES ('semaglutide', 2340, 890, 156, '2025-01-06T08:00:00Z', '2025-01-06T08:00:00Z');

INSERT OR IGNORE INTO peptide_metrics (peptide_slug, view_count, search_count, save_count, last_viewed, updated_at) VALUES ('cjc-1295', 876, 320, 67, '2025-01-06T08:00:00Z', '2025-01-06T08:00:00Z');

INSERT OR IGNORE INTO peptide_metrics (peptide_slug, view_count, search_count, save_count, last_viewed, updated_at) VALUES ('ipamorelin', 654, 245, 52, '2025-01-06T08:00:00Z', '2025-01-06T08:00:00Z');

INSERT OR IGNORE INTO peptide_metrics (peptide_slug, view_count, search_count, save_count, last_viewed, updated_at) VALUES ('tb-500', 1120, 390, 78, '2025-01-06T08:00:00Z', '2025-01-06T08:00:00Z');
