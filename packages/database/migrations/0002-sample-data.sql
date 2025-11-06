-- Sample Peptide Data for PepTalk
-- Created: 2025-11-04
-- Purpose: Initial data for testing and demonstration

-- ============================================================================
-- Sample Peptides
-- ============================================================================

INSERT INTO peptides (id, slug, name, aliases, evidence_grade, human_rct_count, animal_count, summary_html, last_updated, version)
VALUES
  (
    '1',
    'bpc-157',
    'BPC-157',
    '["Body Protection Compound-157", "Pentadecapeptide BPC 157", "PL 14736"]',
    'moderate',
    8,
    45,
    '<p>BPC-157 is a synthetic peptide derived from a protective protein found in gastric juice. Research suggests it may promote healing of various tissues including tendons, ligaments, and the gastrointestinal tract.</p><p>Animal studies have shown promising results for tissue repair and anti-inflammatory effects. Human clinical trials are limited but growing, with preliminary evidence supporting its regenerative properties.</p>',
    datetime('now'),
    1
  ),
  (
    '2',
    'tb-500',
    'TB-500',
    '["Thymosin Beta-4", "Tβ4"]',
    'low',
    2,
    38,
    '<p>TB-500 is a synthetic version of Thymosin Beta-4, a naturally occurring peptide present in most human and animal cells. It plays a crucial role in cell migration, proliferation, and differentiation.</p><p>Preclinical research indicates potential benefits for wound healing, tissue repair, and reducing inflammation. Human evidence is currently limited to small pilot studies.</p>',
    datetime('now'),
    1
  ),
  (
    '3',
    'thymosin-alpha-1',
    'Thymosin Alpha-1',
    '["Tα1", "Zadaxin"]',
    'high',
    42,
    67,
    '<p>Thymosin Alpha-1 is an immunomodulatory peptide that has been extensively studied for its effects on immune function. It is approved in several countries for treating chronic hepatitis B and C.</p><p>Strong clinical evidence supports its use in enhancing immune response, particularly in immunocompromised patients. Multiple randomized controlled trials have demonstrated efficacy in various immune-related conditions.</p>',
    datetime('now'),
    1
  ),
  (
    '4',
    'epithalon',
    'Epithalon',
    '["Epitalon", "Epithalone", "Alanyl-glutamyl-aspartyl-glycine"]',
    'very_low',
    0,
    22,
    '<p>Epithalon is a synthetic tetrapeptide researched primarily in Russia for its potential anti-aging properties. It is believed to regulate the pineal gland and influence melatonin production.</p><p>Research is predominantly based on animal models with promising results for telomere elongation and lifespan extension. No peer-reviewed human randomized controlled trials have been published to date.</p>',
    datetime('now'),
    1
  ),
  (
    '5',
    'ghk-cu',
    'GHK-Cu',
    '["Copper Peptide", "GHK-Copper", "Tripeptide-1"]',
    'moderate',
    12,
    56,
    '<p>GHK-Cu is a naturally occurring copper complex that has been studied for wound healing and skin regeneration. It is present in human plasma, saliva, and urine, with levels declining with age.</p><p>Clinical trials have demonstrated effectiveness in improving skin appearance, promoting collagen synthesis, and accelerating wound healing. It is commonly used in cosmetic formulations.</p>',
    datetime('now'),
    1
  );

-- ============================================================================
-- Sample Studies for BPC-157
-- ============================================================================

INSERT INTO studies (id, peptide_id, type, title, study_type, pmid, abstract, authors, journal, year, doi, url)
VALUES
  (
    's1',
    'bpc-157',
    'pubmed',
    'Stable gastric pentadecapeptide BPC 157 in trials for inflammatory bowel disease (PL-10, PLD-116, PL 14736, Pliva, Croatia): full and distended stomach, and vascular response',
    'animal_invivo',
    '31950881',
    'The stable gastric pentadecapeptide BPC 157 has been extensively studied for its beneficial effects on various tissues. This review summarizes evidence for its protective effects in inflammatory bowel disease models, including effects on stomach distention and vascular responses.',
    '["Seiwerth S", "Rucman R", "Turkovic B", "Sever M", "Klicek R", "Radic B", "Drmic D", "Stupnisek M", "Misic M", "Vuletic LB", "Sikiric P"]',
    'Inflammopharmacology',
    2020,
    '10.1007/s10787-020-00676-w',
    'https://pubmed.ncbi.nlm.nih.gov/31950881/'
  ),
  (
    's2',
    'bpc-157',
    'pubmed',
    'BPC 157 as a therapy for ischemicreperfusion injury in rat ovarian torsion model',
    'animal_invivo',
    '28470933',
    'Ovarian torsion is a serious gynecological emergency. This study investigated the protective effects of BPC 157 on ischemia-reperfusion injury in a rat ovarian torsion model, demonstrating significant tissue protection.',
    '["Tvrdeic A", "Kralj T", "Jagic S", "Zubcic S", "Belanovic T", "Tadic S", "Jelicic N", "Klicek R", "Seiwerth S", "Sikiric P"]',
    'Toxicol Mech Methods',
    2017,
    '10.1080/15376516.2017.1333553',
    'https://pubmed.ncbi.nlm.nih.gov/28470933/'
  ),
  (
    's3',
    'bpc-157',
    'pubmed',
    'Pentadecapeptide BPC 157 enhances the growth hormone receptor expression in tendon fibroblasts',
    'animal_invitro',
    '24012082',
    'BPC 157 has been shown to improve tendon healing. This in vitro study demonstrates that BPC 157 enhances growth hormone receptor expression in tendon fibroblasts, providing insight into its mechanism of action.',
    '["Chang CH", "Tsai WC", "Lin MS", "Hsu YH", "Pang JH"]',
    'Molecules',
    2014,
    '10.3390/molecules19019814',
    'https://pubmed.ncbi.nlm.nih.gov/24012082/'
  );

-- ============================================================================
-- Sample Studies for TB-500
-- ============================================================================

INSERT INTO studies (id, peptide_id, type, title, study_type, pmid, abstract, authors, journal, year, doi, url)
VALUES
  (
    's4',
    'tb-500',
    'pubmed',
    'Thymosin β4 promotes the recovery of peripheral neuropathy in type II diabetic mice',
    'animal_invivo',
    '27256572',
    'Peripheral neuropathy is a common complication of diabetes. This study investigated the therapeutic potential of thymosin β4 in diabetic neuropathy using a mouse model, showing significant improvements in nerve function.',
    '["Qiu P", "Wheater MK", "Qiu Y", "Sosne G"]',
    'Neuroscience',
    2016,
    '10.1016/j.neuroscience.2016.05.054',
    'https://pubmed.ncbi.nlm.nih.gov/27256572/'
  ),
  (
    's5',
    'tb-500',
    'pubmed',
    'Thymosin β4 and cardiac repair',
    'animal_invivo',
    '25600386',
    'This review examines the role of thymosin β4 in cardiac repair and regeneration following myocardial infarction. Evidence from animal models suggests potential for clinical translation.',
    '["Smart N", "Riley PR"]',
    'Ann N Y Acad Sci',
    2012,
    '10.1111/j.1749-6632.2012.06492.x',
    'https://pubmed.ncbi.nlm.nih.gov/25600386/'
  );

-- ============================================================================
-- Sample Studies for Thymosin Alpha-1
-- ============================================================================

INSERT INTO studies (id, peptide_id, type, title, study_type, pmid, abstract, authors, journal, year, doi, url)
VALUES
  (
    's6',
    'thymosin-alpha-1',
    'pubmed',
    'Thymosin alpha 1: a clinical review',
    'human_rct',
    '21595685',
    'Thymosin alpha 1 has been studied extensively in clinical trials for immunomodulation. This comprehensive review analyzes multiple randomized controlled trials demonstrating efficacy in chronic hepatitis B and C, as well as other immune-related conditions.',
    '["Garaci E", "Pica F", "Serafino A", "Balestrieri E", "Matteucci C", "Moroni G", "Sinibaldi-Vallebona P"]',
    'Expert Opin Biol Ther',
    2007,
    '10.1517/14712598.7.11.1699',
    'https://pubmed.ncbi.nlm.nih.gov/21595685/'
  ),
  (
    's7',
    'thymosin-alpha-1',
    'pubmed',
    'Randomized controlled trial of thymosin alpha 1 in HBeAg-positive chronic hepatitis B',
    'human_rct',
    '9662411',
    'This multicenter randomized controlled trial evaluated the efficacy of thymosin alpha 1 in patients with HBeAg-positive chronic hepatitis B. Results showed significant improvements in viral clearance and liver function.',
    '["Chan HL", "Tang JL", "Tam W", "Sung JJ"]',
    'Hepatology',
    1998,
    '10.1002/hep.510280127',
    'https://pubmed.ncbi.nlm.nih.gov/9662411/'
  );

-- ClinicalTrials.gov studies need different columns
INSERT INTO studies (id, peptide_id, type, title, study_type, nct_id, status, phase, conditions, interventions, enrollment, start_date, completion_date, url)
VALUES
  (
    's8',
    'thymosin-alpha-1',
    'clinicaltrials',
    'Thymosin Alpha 1 for Severe COVID-19: A Randomized Clinical Trial',
    'human_rct',
    'NCT04428008',
    'Completed',
    'Phase 2/Phase 3',
    '["COVID-19", "SARS-CoV-2 Infection"]',
    '["Thymosin Alpha 1"]',
    240,
    '2020-06-01',
    '2021-12-01',
    'https://clinicaltrials.gov/ct2/show/NCT04428008'
  );

-- ============================================================================
-- Sample Legal Notes
-- ============================================================================

INSERT INTO legal_notes (peptide_id, note_text, note_order)
VALUES
  ('bpc-157', 'BPC-157 is not approved by the FDA for human use. It is classified as a research chemical.', 1),
  ('bpc-157', 'The information provided is for educational purposes only and should not be considered medical advice.', 2),
  ('tb-500', 'TB-500 is not approved by the FDA for human use. It is banned by WADA for athletic competition.', 1),
  ('tb-500', 'This content is for informational purposes and does not constitute medical advice.', 2),
  ('thymosin-alpha-1', 'Thymosin Alpha-1 is approved in several countries but not currently approved by the FDA in the United States.', 1),
  ('epithalon', 'Epithalon is not approved by any major regulatory agency for human use.', 1),
  ('epithalon', 'Information presented is based on limited research and should not be used as medical guidance.', 2),
  ('ghk-cu', 'GHK-Cu is approved for cosmetic use but not as a pharmaceutical agent.', 1);

-- ============================================================================
-- Sample Page Sections
-- ============================================================================

INSERT INTO page_sections (peptide_id, title, content_html, section_order)
VALUES
  (
    'bpc-157',
    'Mechanism of Action',
    '<p>BPC-157 appears to work through multiple mechanisms:</p><ul><li><strong>Angiogenesis:</strong> Promotes the formation of new blood vessels, facilitating nutrient delivery to damaged tissues</li><li><strong>VEGF Modulation:</strong> Influences vascular endothelial growth factor pathways</li><li><strong>Growth Hormone Receptors:</strong> Enhances growth hormone receptor expression in fibroblasts</li><li><strong>Anti-inflammatory:</strong> Reduces inflammatory markers and modulates immune response</li></ul>',
    1
  ),
  (
    'bpc-157',
    'Clinical Applications',
    '<p>Research has explored BPC-157 for various conditions:</p><ul><li>Tendon and ligament injuries</li><li>Muscle tears and strains</li><li>Inflammatory bowel disease (IBD)</li><li>Gastric ulcers</li><li>Bone healing</li><li>Vascular damage repair</li></ul><p>Most evidence comes from animal studies, with limited but growing human clinical data.</p>',
    2
  ),
  (
    'tb-500',
    'Scientific Background',
    '<p>TB-500 is a synthetic form of Thymosin Beta-4, a 43-amino acid peptide naturally present in all human cells except red blood cells. It plays a crucial role in:</p><ul><li>Cell migration and differentiation</li><li>Wound healing processes</li><li>Angiogenesis and blood vessel formation</li><li>Anti-inflammatory responses</li></ul>',
    1
  ),
  (
    'thymosin-alpha-1',
    'FDA Status and Global Approval',
    '<p>Thymosin Alpha-1 has a unique regulatory status worldwide:</p><ul><li><strong>Approved:</strong> China, Italy, and several other countries for hepatitis B and C treatment</li><li><strong>Not Approved:</strong> United States FDA (available for research only)</li><li><strong>Orphan Drug Status:</strong> Granted for certain conditions in the EU</li></ul><p>Clinical trials continue to explore additional therapeutic applications.</p>',
    1
  ),
  (
    'thymosin-alpha-1',
    'Clinical Evidence Summary',
    '<p>Thymosin Alpha-1 has the strongest clinical evidence among peptides:</p><ul><li><strong>42 human RCTs</strong> across various conditions</li><li><strong>Proven efficacy</strong> in chronic hepatitis B and C</li><li><strong>Immune enhancement</strong> in cancer patients</li><li><strong>COVID-19 research</strong> showing potential benefits</li><li><strong>Safety profile</strong> well-established over decades of use</li></ul>',
    2
  );
