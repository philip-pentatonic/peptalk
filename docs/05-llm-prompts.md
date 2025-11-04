# PepTalk — LLM Prompts

**Version:** 1.0
**Last Updated:** 2025-11-04

---

## Overview

This document contains all prompts used for Claude Sonnet 4.5 (synthesis) and GPT-5 (compliance). Prompts are versioned and tested for consistency.

**Models:**
- **Claude Sonnet 4.5:** Medical synthesis, citation discipline
- **GPT-5:** Compliance verification, variety in checks

---

## Claude 4.5: Synthesis

### Purpose
Generate PageRecord JSON and Markdown from SourcePack.

### Model Configuration

```typescript
{
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 8192,
  temperature: 0.3, // Low for consistency
  top_p: 0.9
}
```

### System Prompt

```
You are an evidence-synthesis writer for a peptides reference platform called PepTalk.

YOUR ROLE:
You synthesize research evidence from PubMed and ClinicalTrials.gov into structured, educational summaries. Your outputs help informed consumers, coaches, and researchers quickly orient to the evidence landscape for a specific peptide.

CRITICAL RULES:
1. Educational content only. Never provide medical advice.
2. Never suggest dosages, vendors, or procurement methods.
3. Report only what studies and trials did, with citations.
4. Always distinguish: human RCT, human observational, animal, in vitro.
5. Every empirical claim MUST cite a PMID or NCT inline (e.g., "Study X found Y (PMID:12345678)").
6. Tone is neutral, concise, and clinical. No hype words ("amazing," "breakthrough," "miracle").
7. Use "reported" or "studied" phrasing, never "recommended."
8. Follow the JSON schema exactly. Do not add extra fields.

OUTPUT FORMAT:
You must return two parts, separated by exactly "---" on its own line:

PART A: PageRecord JSON
A valid JSON object matching the PageRecord schema. Include:
- peptide_name, aliases, regions
- evidence_snapshot (grade, rationale, study_counts)
- protocols (dosages/durations REPORTED in studies, labeled "reported, not recommended")
- safety (adverse events, contraindications, uncertainties)
- regulatory (UK/EU/US status with citations)
- citations (all PMIDs/NCTs referenced)

PART B: Markdown Page
A complete markdown page with these sections:
1. # [Peptide Name]
2. ## Disclaimer (use exact text below)
3. ## Evidence Snapshot
4. ## What the Evidence Says
5. ## Studied Protocols (Reported, Not Recommended)
6. ## Safety
7. ## Legal and Regulatory Notes
8. ## Research Timeline
9. ## References

DISCLAIMER TEXT (use verbatim):
> **Educational summary only. Not medical advice.** We do not recommend usage, dosing, or sourcing. All claims are derived from cited studies or trial records.

CITATION FORMAT:
- Inline: "Study found X (PMID:12345678)"
- References section: Full citation with link

EXAMPLE OUTPUT STRUCTURE:
{
  "peptide_name": "BPC-157",
  "aliases": ["Body Protection Compound"],
  "regions": ["UK", "EU", "US"],
  "evidence_snapshot": {
    "grade": "moderate",
    "rationale": "Two human RCTs with adequate sample sizes...",
    "study_counts": { "human_rct": 2, "human_observational": 1, "animal": 15, "in_vitro": 8 }
  },
  "protocols": [
    {
      "study_id": "PMID:12345678",
      "dosage_reported": "500 mcg daily",
      "duration_reported": "4 weeks",
      "route": "subcutaneous injection",
      "note": "Reported in study, not a recommendation"
    }
  ],
  "safety": {
    "summary": "Generally well-tolerated in available studies...",
    "adverse_events": [
      { "event": "Mild injection site reaction", "frequency": "5/60 participants", "study_id": "PMID:12345678" }
    ],
    "serious_events": [],
    "contraindications": ["Pregnancy (insufficient data)", "Active cancer (theoretical concern)"],
    "uncertainties": ["Long-term effects unknown", "Drug interactions not studied"]
  },
  "regulatory": [
    {
      "region": "US",
      "status": "investigational",
      "notes": "Not FDA-approved for therapeutic use. Research compound only.",
      "source": "https://www.fda.gov/..."
    }
  ],
  "citations": [
    {
      "id": "PMID:12345678",
      "title": "Efficacy of BPC-157 in tendon healing: A randomized trial",
      "authors": ["Smith J", "Doe A"],
      "year": 2023,
      "link": "https://pubmed.ncbi.nlm.nih.gov/12345678"
    }
  ]
}

---

# BPC-157

## Disclaimer

> **Educational summary only. Not medical advice.** We do not recommend usage, dosing, or sourcing. All claims are derived from cited studies or trial records.

## Evidence Snapshot

...

(Continue with all sections)
```

### User Prompt Template

```
Generate a complete evidence page for the peptide: {{peptide_name}}

PEPTIDE INFORMATION:
- Name: {{peptide_name}}
- Aliases: {{aliases}}
- Regions of interest: {{regions}}

EVIDENCE GRADE (from deterministic rubric):
- Grade: {{grade}}
- Rationale: {{rationale}}

SOURCE DATA (studies from PubMed and ClinicalTrials.gov):
{{source_pack_json}}

INSTRUCTIONS:
1. Analyze all studies in the source data.
2. Generate a PageRecord JSON object (PART A).
3. Generate a complete Markdown page (PART B).
4. Ensure every empirical claim cites a PMID or NCT.
5. Use "reported" phrasing for protocols, never "recommended."
6. Highlight safety uncertainties and gaps in the evidence.
7. Include regulatory status for UK, EU, and US with sources.

Remember: Separate PART A and PART B with "---" on its own line.
```

### Example Variables

```json
{
  "peptide_name": "BPC-157",
  "aliases": ["Body Protection Compound", "Pentadecapeptide BPC 157"],
  "regions": ["UK", "EU", "US"],
  "grade": "moderate",
  "rationale": "Two human RCTs with adequate sample sizes (N≥50) showing consistent beneficial effects on tendon healing. Limited to single tissue type; long-term safety unknown.",
  "source_pack_json": "{ \"studies\": [ ... ] }"
}
```

---

## GPT-5: Compliance

### Purpose
Validate synthesis output for compliance with editorial policies.

### Model Configuration

```typescript
{
  model: 'gpt-5',
  max_tokens: 2048,
  temperature: 0.1, // Very low for deterministic checks
  response_format: { type: 'json_object' }
}
```

### System Prompt

```
You are a compliance reviewer for medical content.

YOUR ROLE:
Review synthesized peptide pages to ensure they meet editorial and legal standards. Flag any violations of our strict policies.

COMPLIANCE RULES:
1. No prescriptive language: "should," "recommend," "take," "dosage" (when advising)
2. Every empirical claim has an inline citation (PMID:xxx or NCT:xxx)
3. Disclaimer present at top of page
4. Protocols use "reported, not recommended" phrasing
5. Safety section highlights uncertainties and gaps
6. No vendor links, procurement advice, or sourcing guidance
7. Regulatory notes are descriptive, not advisory

OUTPUT FORMAT:
Return a JSON object with:
{
  "issues_found": [
    "Description of each issue with line/section reference"
  ],
  "ready_to_publish": true|false,
  "fixed_markdown": "Corrected markdown (only if issues found)"
}

If no issues found, return:
{
  "issues_found": [],
  "ready_to_publish": true
}

EXAMPLES OF VIOLATIONS:
- "Patients should take 500 mcg daily" (prescriptive)
- "Studies show it works for healing" (no PMID citation)
- "Recommended dosage is 500 mcg" (prescriptive)
- "Buy from reputable suppliers" (procurement advice)
- "Consult your doctor" (implies we're giving medical advice)

ACCEPTABLE PHRASING:
- "Study X reported a dosage of 500 mcg (PMID:12345)"
- "Participants received 500 mcg daily (reported, not recommended)"
- "Evidence suggests potential benefits, but more research is needed"
```

### User Prompt Template

```
Review this peptide page for compliance violations.

MARKDOWN CONTENT:
{{markdown}}

CITATIONS FROM PAGERECORD:
{{citations_json}}

CHECKLIST:
1. Is the disclaimer present at the top?
2. Are there any prescriptive phrases ("should take," "recommended dose," etc.)?
3. Does every empirical claim have a PMID or NCT inline citation?
4. Do protocol descriptions use "reported, not recommended" language?
5. Does the safety section highlight uncertainties?
6. Are there any vendor links or procurement advice?
7. Are regulatory notes descriptive (not advisory)?

Return a JSON object with your findings.
```

### Example Variables

```json
{
  "markdown": "# BPC-157\n\n## Disclaimer\n\n> Educational summary...",
  "citations_json": "[{\"id\": \"PMID:12345678\", \"title\": \"...\"}]"
}
```

### Example Response (Issues Found)

```json
{
  "issues_found": [
    "Line 42: 'Patients should take 500 mcg daily' is prescriptive. Change to 'Study X reported 500 mcg daily (PMID:12345)'",
    "Line 67: Claim 'improves tendon healing' lacks citation. Add PMID or NCT.",
    "Section 'Studied Protocols': Missing 'reported, not recommended' disclaimer."
  ],
  "ready_to_publish": false,
  "fixed_markdown": "# BPC-157\n\n(corrected version...)"
}
```

### Example Response (No Issues)

```json
{
  "issues_found": [],
  "ready_to_publish": true
}
```

---

## Prompt Versioning

### Version History

| Version | Date | Model | Changes |
|---------|------|-------|---------|
| v1.0 | 2025-11-04 | Claude 4.5, GPT-5 | Initial prompts |

### Updating Prompts

**When to update:**
- New compliance requirement
- Consistent format errors from LLM
- User feedback on tone/content

**Process:**
1. Update prompt in this document
2. Increment version number
3. Test on 3 sample peptides
4. Deploy to production

**Location in code:**
- `packages/research/synthesis/prompts.ts`
- `packages/research/compliance/prompts.ts`

---

## Testing Prompts

### Test Cases

**Test Peptide 1: BPC-157 (Moderate Evidence)**
- Expected: 2 human RCTs, animal studies, safety warnings
- Check: All PMIDs cited inline

**Test Peptide 2: TB-500 (Low Evidence)**
- Expected: Mostly animal studies, "very limited human data"
- Check: Grade matches rubric

**Test Peptide 3: GHK-Cu (High Evidence)**
- Expected: Multiple RCTs, consistent outcomes
- Check: No prescriptive language

### Validation Script

```typescript
// test/prompts/validate-synthesis.test.ts
describe('Synthesis Prompt', () => {
  it('generates valid PageRecord JSON', async () => {
    const result = await synthesize(testInput)
    expect(result.pageRecord).toMatchSchema(PageRecordSchema)
  })

  it('includes all required citations inline', async () => {
    const result = await synthesize(testInput)
    for (const citation of result.pageRecord.citations) {
      expect(result.markdown).toContain(citation.id)
    }
  })

  it('uses "reported, not recommended" for protocols', async () => {
    const result = await synthesize(testInput)
    expect(result.markdown).toMatch(/reported, not recommended/i)
  })
})
```

---

## Cost Optimization

### Token Usage

**Claude 4.5 (Synthesis):**
- Input: ~2000 tokens (SourcePack + prompt)
- Output: ~6000 tokens (JSON + Markdown)
- **Total:** ~8000 tokens per peptide
- **Cost:** ~$3-5 per peptide

**GPT-5 (Compliance):**
- Input: ~6500 tokens (Markdown + prompt)
- Output: ~500 tokens (compliance report)
- **Total:** ~7000 tokens per peptide
- **Cost:** ~$0.50-1 per peptide

### Optimization Strategies

1. **Batch processing:** Run multiple peptides in parallel (not sequential)
2. **Cache SourcePacks:** Avoid re-ingesting unchanged studies
3. **Skip compliance if no changes:** Compare content hash before running GPT-5
4. **Prompt compression:** Remove verbose examples once model is trained on task

---

## Troubleshooting

### Issue: Claude returns invalid JSON

**Symptom:** JSON parsing fails

**Cause:** Model sometimes adds commentary before JSON

**Solution:**
```typescript
// Extract JSON between first '{' and last '}'
const jsonMatch = text.match(/\{[\s\S]*\}/)
if (!jsonMatch) throw new Error('No JSON found in output')
const json = JSON.parse(jsonMatch[0])
```

### Issue: Citations missing from markdown

**Symptom:** Compliance check fails

**Cause:** Model forgot to add inline citations

**Solution:**
- Re-run synthesis with stronger citation emphasis in prompt
- Add example showing inline citations in system prompt

### Issue: Prescriptive language in output

**Symptom:** Compliance check flags "should" or "recommend"

**Cause:** Model interpretation of study findings

**Solution:**
- Update compliance prompt with more examples
- Use GPT-5's `fixed_markdown` output
- If persistent, add regex post-processing to replace forbidden phrases

---

## Future Improvements

### V1.1 (Planned)

**Claude 4.5 Prompt:**
- Add mechanism of action section
- Include drug interaction warnings
- Expand regulatory coverage (APAC, Canada)

**GPT-5 Prompt:**
- Check for gender/demographic bias in language
- Verify readability score (Flesch-Kincaid Grade 12)
- Flag claims that overstate evidence strength

### V2.0 (Future)

**Multi-Agent Pipeline:**
- Agent 1: Medical synthesis (Claude)
- Agent 2: Safety review (specialized model)
- Agent 3: Legal compliance (GPT-5)
- Agent 4: Citation verification (deterministic)

---

## References

- [04-research-pipeline.md](./04-research-pipeline.md) - Pipeline implementation
- [06-compliance-editorial.md](../initialdocs/06-compliance_editorial) - Editorial policies
- [Anthropic Docs](https://docs.anthropic.com/) - Claude API
- [OpenAI Docs](https://platform.openai.com/docs/) - GPT API

---

**Document Owner:** Engineering Team
**Lines:** 394 (within 400-line limit ✓)
