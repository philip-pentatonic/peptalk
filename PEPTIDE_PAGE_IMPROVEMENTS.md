# Peptide Detail Page Improvements

## Current Issues

1. **No Executive Summary**: Summary shows "Summary not available"
2. **Studies Not Loading**: Empty studies array from API
3. **Poor Readability**: Wall of text without proper spacing, max-width, or typography
4. **Non-clickable Citations**: PMIDs shown as `[PMID:38980576]` but not clickable
5. **No Table of Contents**: Long content with no navigation
6. **Dense Information**: Needs better visual hierarchy and white space

## Proposed Improvements

### 1. Executive Summary Section
```
┌─────────────────────────────────────────────────────────────┐
│ 📊 AT A GLANCE                                              │
│                                                              │
│ Evidence Grade: [HIGH badge]                                │
│ Human Studies: 23 RCTs | Animal Studies: 63                 │
│                                                              │
│ KEY FINDINGS:                                               │
│ • Limited but promising human evidence                      │
│ • Extensive animal research shows wound healing            │
│ • Not FDA-approved, safety data incomplete                  │
│ • Most claims based on animal studies only                  │
└─────────────────────────────────────────────────────────────┘
```

### 2. Improved Content Layout

**Typography & Spacing:**
- Max width: 800px for main content (optimal reading)
- Line height: 1.8 (increased from default 1.5)
- Font size: 18px for body text
- Section spacing: 3rem between major sections
- Paragraph spacing: 1.5rem

**Visual Hierarchy:**
- H2 sections: 2rem, bold, with top border
- H3 subsections: 1.5rem, semibold
- Body: 18px, relaxed line-height
- Inline code/citations: distinguished background

### 3. Clickable Inline Citations

Transform: `[PMID:38980576]` → clickable link that:
- Opens PubMed in new tab
- Also scrolls to reference in studies section
- Highlighted on hover
- Tooltip showing study title

### 4. Table of Contents (Sticky Sidebar)

```
┌──────────────┐  ┌────────────────────────────────┐
│ On This Page │  │ Content                        │
│              │  │                                │
│ • Overview   │  │ Lorem ipsum...                 │
│ • Human      │  │                                │
│   Research   │  │                                │
│ • Animal     │  │                                │
│   Research   │  │                                │
│   - GI       │  │                                │
│   - Vascular │  │                                │
│ • Studies    │  │                                │
└──────────────┘  └────────────────────────────────┘
```

### 5. Collapsible Sections

For very long sections (like Animal Research):
- Collapsed by default, showing first paragraph
- "Read more" button to expand
- "Jump to section" links from ToC

### 6. Studies Section Redesign

**Study Cards:**
```
┌─────────────────────────────────────────────────────┐
│ [Human RCT] BPC-157 safety in healthy volunteers   │
│                                                      │
│ Phase I pilot study assessing safety parameters...  │
│                                                      │
│ 🔗 NCT:02637284  📅 2024  👥 12 participants       │
│ [View on ClinicalTrials.gov →]                     │
└─────────────────────────────────────────────────────┘
```

**Filters:**
- All Studies / Human Only / Animal Only
- Filter by study type (RCT, Observational, In Vivo, etc.)
- Search studies by keyword

### 7. Key Evidence Highlights

Before main content:
```
┌─────────────────────────────────────────────────────┐
│ ⚠️ KEY LIMITATIONS                                   │
│                                                      │
│ • Very limited human clinical data                  │
│ • Not FDA-approved                                  │
│ • Most evidence from animal models only             │
│ • Long-term human safety unknown                    │
└─────────────────────────────────────────────────────┘
```

### 8. Progressive Disclosure

**Quick Summary** → **Detailed Findings** → **Full Study List**

### 9. Trust Indicators

- Last updated timestamp (prominent)
- Version number
- "Reviewed by" (if applicable)
- Links to methodology page
- Data sources badge (PubMed, ClinicalTrials.gov)

## Implementation Priority

1. **Phase 1** (Immediate):
   - Fix studies API to return actual study data
   - Add max-width and better typography
   - Make PMID/NCT citations clickable
   - Add executive summary section

2. **Phase 2** (Next):
   - Table of contents
   - Collapsible sections
   - Study filters
   - Key limitations box

3. **Phase 3** (Polish):
   - Search within page
   - Print-friendly version
   - Share/bookmark features
   - Related peptides suggestions
