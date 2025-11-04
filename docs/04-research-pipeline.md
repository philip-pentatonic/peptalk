# PepTalk — Research Pipeline

**Version:** 1.0
**Last Updated:** 2025-11-04

---

## Overview

The research pipeline is the core of PepTalk. It deterministically ingests studies from PubMed and ClinicalTrials.gov, synthesizes them using Claude 4.5, validates with GPT-5, and publishes structured pages.

**Pipeline Flow:**
```
Ingest → Normalize → Grade → Synthesize → Comply → Publish
```

**Execution:**
- Scheduled (nightly cron)
- On-demand (CLI)
- Single peptide or batch

---

## Architecture

### Pipeline Stages

```
┌──────────────┐
│   Ingest     │  PubMed + ClinicalTrials.gov APIs
└──────┬───────┘
       │ SourcePack (raw studies)
       ▼
┌──────────────┐
│  Normalize   │  Deduplicate + Type inference
└──────┬───────┘
       │ SourcePack (cleaned)
       ▼
┌──────────────┐
│    Grade     │  Deterministic rubric
└──────┬───────┘
       │ Evidence grade + rationale
       ▼
┌──────────────┐
│  Synthesize  │  Claude 4.5 → PageRecord + Markdown
└──────┬───────┘
       │ PageRecord + Markdown
       ▼
┌──────────────┐
│   Comply     │  GPT-5 + regex validation
└──────┬───────┘
       │ Validated content
       ▼
┌──────────────┐
│   Publish    │  Write files + PDF + D1 + R2
└──────────────┘
```

---

## Stage 1: Ingest

### Purpose
Fetch studies from PubMed and ClinicalTrials.gov for a given peptide.

### Implementation

**Location:** `packages/research/ingest/`

**Files:**
- `pubmed/client.ts` - E-utilities API wrapper
- `pubmed/parser.ts` - XML parsing
- `pubmed/mapper.ts` - Map to Study schema
- `clinicaltrials/client.ts` - CT.gov API v2 wrapper
- `clinicaltrials/parser.ts` - JSON parsing
- `clinicaltrials/mapper.ts` - Map to Study schema

### PubMed Integration

**API:** NCBI E-utilities
**Docs:** https://www.ncbi.nlm.nih.gov/books/NBK25501/

**Search Query:**
```
("BPC-157"[All Fields] OR "Body Protection Compound"[All Fields])
AND (clinical trial[Filter] OR randomized controlled trial[Filter])
```

**Rate Limit:** 3 requests/second (without API key), 10 req/sec (with key)

**Example Code:**
```typescript
// packages/research/ingest/pubmed/client.ts
export async function searchPubMed(
  peptideName: string,
  aliases: string[]
): Promise<string[]> {
  const query = buildQuery(peptideName, aliases)
  const url = `${EUTILS_BASE}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmode=json`

  const response = await fetch(url)
  const data = await response.json()
  return data.esearchresult.idlist // PMIDs
}

export async function fetchDetails(pmids: string[]): Promise<string> {
  const url = `${EUTILS_BASE}/efetch.fcgi?db=pubmed&id=${pmids.join(',')}&retmode=xml`
  const response = await fetch(url)
  return await response.text() // XML
}
```

### ClinicalTrials.gov Integration

**API:** CT.gov API v2
**Docs:** https://clinicaltrials.gov/data-api/api

**Search Query:**
```
https://clinicaltrials.gov/api/v2/studies?query.term=BPC-157&pageSize=100
```

**Rate Limit:** No official limit (be reasonable, 1 req/sec)

**Example Code:**
```typescript
// packages/research/ingest/clinicaltrials/client.ts
export async function searchClinicalTrials(
  peptideName: string,
  aliases: string[]
): Promise<RawTrial[]> {
  const query = [peptideName, ...aliases].join(' OR ')
  const url = `https://clinicaltrials.gov/api/v2/studies?query.term=${encodeURIComponent(query)}&pageSize=100`

  const response = await fetch(url)
  const data = await response.json()
  return data.studies
}
```

### Output: SourcePack

**Schema:**
```typescript
// packages/schemas/source-pack.ts
export const SourcePackSchema = z.object({
  peptide_name: z.string(),
  aliases: z.array(z.string()),
  regions: z.array(z.enum(['UK', 'EU', 'US', 'APAC'])),
  studies: z.array(StudySchema),
  meta: z.object({
    search_notes: z.array(z.string()),
    duplicates_removed: z.number(),
    last_checked: z.string(), // ISO 8601
  }),
})
```

---

## Stage 2: Normalize

### Purpose
Clean and standardize ingested studies.

### Implementation

**Location:** `packages/research/ingest/normalizer/`

**Files:**
- `deduplicator.ts` - Remove duplicate studies
- `type-inferer.ts` - Infer study type (RCT, observational, animal, in vitro)

### Deduplication

**Algorithm:**
1. Exact ID match (PMID or NCT)
2. Title similarity (Levenshtein distance <10%)
3. Year + author match

**Example Code:**
```typescript
// packages/research/ingest/normalizer/deduplicator.ts
export function deduplicate(studies: Study[]): Study[] {
  const seen = new Set<string>()
  const unique: Study[] = []

  for (const study of studies) {
    const key = study.id
    if (seen.has(key)) continue

    // Check title similarity
    const isDupe = unique.some(s =>
      similarity(s.title, study.title) > 0.9
    )

    if (!isDupe) {
      seen.add(key)
      unique.push(study)
    }
  }

  return unique
}
```

### Type Inference

**Rules:**
- **human_rct:** Title/abstract contains "randomized" OR "RCT" OR MeSH term includes "Randomized Controlled Trial"
- **human_observational:** Human subjects, not RCT (cohort, case-control, cross-sectional)
- **animal:** Title/abstract contains "rat" OR "mouse" OR "animal model"
- **in_vitro:** Title/abstract contains "in vitro" OR "cell culture"

**Example Code:**
```typescript
// packages/research/ingest/normalizer/type-inferer.ts
export function inferStudyType(study: RawStudy): StudyType {
  const text = `${study.title} ${study.abstract}`.toLowerCase()

  if (text.includes('randomized') || text.includes('rct')) {
    return 'human_rct'
  }

  if (text.includes('rat') || text.includes('mouse') || text.includes('animal')) {
    return 'animal'
  }

  if (text.includes('in vitro') || text.includes('cell culture')) {
    return 'in_vitro'
  }

  return 'human_observational' // Default
}
```

---

## Stage 3: Grade

### Purpose
Apply deterministic evidence rubric to assign quality grade.

### Implementation

**Location:** `packages/research/rubric/`

**Files:**
- `grader.ts` - Main grading logic
- `rules.ts` - Rubric rules
- `rationale.ts` - Generate explanation

### Rubric

**Starting grade:** `very_low`

**Upgrade conditions:**
1. **To moderate:**
   - ≥1 human RCT
   - Total RCT N ≥50
   - Mostly beneficial or null outcomes

2. **To high:**
   - ≥2 independent human RCTs
   - Each RCT N ≥50
   - Consistent outcomes across studies
   - Low risk of bias (e.g., proper blinding, randomization)

**Downgrade conditions:**
- Serious bias (inadequate randomization, no blinding)
- Imprecision (very small N)
- Inconsistency (conflicting results)
- Indirectness (outcomes not clinically relevant)

**Example Code:**
```typescript
// packages/research/rubric/grader.ts
export function gradeEvidence(studies: Study[]): GradeResult {
  let grade: EvidenceGrade = 'very_low'

  const humanRcts = studies.filter(s => s.study_type === 'human_rct')
  const totalN = humanRcts.reduce((sum, s) => sum + (s.sample_size_total || 0), 0)

  // Upgrade to moderate
  if (humanRcts.length >= 1 && totalN >= 50) {
    grade = 'moderate'
  }

  // Upgrade to high
  if (humanRcts.length >= 2 && humanRcts.every(s => s.sample_size_total >= 50)) {
    const outcomes = humanRcts.map(s => s.outcome_direction)
    const consistent = outcomes.every(o => o === outcomes[0])
    if (consistent) {
      grade = 'high'
    }
  }

  return {
    grade,
    rationale: generateRationale(grade, studies),
  }
}
```

---

## Stage 4: Synthesize

### Purpose
Generate PageRecord JSON and Markdown using Claude 4.5.

### Implementation

**Location:** `packages/research/synthesis/`

**Files:**
- `claude-client.ts` - Anthropic API wrapper
- `prompts.ts` - System and user prompts
- `parser.ts` - Extract JSON + Markdown from completion
- `validator.ts` - Validate against PageRecord schema

### Claude 4.5 Prompt

**System Prompt:**
```
You are an evidence-synthesis writer for a peptides reference platform.

RULES:
1. Outputs are educational only. No medical advice.
2. Never suggest dosages, vendors, or procurement methods.
3. Report only what studies/trials did, with citations.
4. Distinguish: human RCT, human observational, animal, in vitro.
5. Every empirical claim must cite PMID or NCT inline.
6. Tone is neutral, concise, clinical.
7. Follow the JSON schema exactly.

OUTPUT FORMAT:
Return two parts separated by "---":
PART A: PageRecord JSON (exact schema)
PART B: Markdown page (sections: Snapshot, Evidence, Protocols, Safety, Legal, Timeline, References)
```

**User Prompt:**
```
Generate a complete evidence page for the peptide: {{peptide_name}}

Aliases: {{aliases}}
Regions: {{regions}}
Evidence Grade: {{grade}} ({{rationale}})

Source data:
{{source_pack_json}}

Apply the evidence grading rubric. Output PageRecord JSON + Markdown.
```

**Example Code:**
```typescript
// packages/research/synthesis/claude-client.ts
export async function synthesize(input: SynthesisInput): Promise<SynthesisOutput> {
  const systemPrompt = buildSystemPrompt()
  const userPrompt = buildUserPrompt(input)

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 8192,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const text = response.content[0].text
  const { json, markdown } = parseOutput(text)

  return {
    pageRecord: validatePageRecord(json),
    markdown,
    tokensUsed: response.usage.total_tokens,
  }
}
```

### Output Parsing

**Expected format:**
```
{
  "peptide_name": "BPC-157",
  "evidence_snapshot": { /* ... */ },
  "protocols": [ /* ... */ ],
  "safety": { /* ... */ },
  "regulatory": [ /* ... */ ],
  "citations": [ /* ... */ ]
}

---

# BPC-157

## Disclaimer
...
```

**Parser extracts both parts and validates JSON against Zod schema.**

---

## Stage 5: Compliance

### Purpose
Validate content for tone, citations, and safety.

### Implementation

**Location:** `packages/research/compliance/`

**Files:**
- `gpt-client.ts` - OpenAI API wrapper
- `regex-rules.ts` - Static checks
- `citation-checker.ts` - Verify PMID/NCT presence
- `validator.ts` - Orchestrate all checks

### Regex Rules

**Forbidden phrases:**
- "should take"
- "recommended dose"
- "buy from"
- "we recommend"
- "you should"
- "consult your doctor" (implies we're giving advice)

**Example Code:**
```typescript
// packages/research/compliance/regex-rules.ts
const FORBIDDEN_PATTERNS = [
  /should\s+(take|use|consider)/i,
  /recommended?\s+dos(e|age)/i,
  /buy\s+from/i,
  /we\s+recommend/i,
  /you\s+should/i,
]

export function checkRegexRules(markdown: string): string[] {
  const issues: string[] = []

  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(markdown)) {
      issues.push(`Forbidden phrase detected: ${pattern.source}`)
    }
  }

  return issues
}
```

### Citation Checker

**Verify all PMIDs/NCTs in citations appear in markdown text.**

**Example Code:**
```typescript
// packages/research/compliance/citation-checker.ts
export function checkCitations(
  markdown: string,
  citations: Citation[]
): string[] {
  const missing: string[] = []

  for (const citation of citations) {
    const id = citation.id // "PMID:12345678"
    if (!markdown.includes(id)) {
      missing.push(`Citation ${id} not found in text`)
    }
  }

  return missing
}
```

### GPT-5 Compliance Pass

**Prompt:**
```
Review this peptide page for compliance:

MARKDOWN:
{{markdown}}

CITATIONS:
{{citations_json}}

Check that:
1. No prescriptive language ("should," "recommend," "take," "dosage")
2. Every empirical claim has inline citation (PMID or NCT)
3. Disclaimer present at top
4. "Reported, not recommended" phrasing for protocols
5. Safety section highlights uncertainties
6. No vendor links or procurement advice

Return JSON:
{
  "issues_found": ["list of problems"],
  "ready_to_publish": boolean,
  "fixed_markdown": "corrected version (if issues found)"
}
```

**If issues found, use fixed_markdown or fail the pipeline.**

---

## Stage 6: Publish

### Purpose
Write all outputs to content/, R2, and D1.

### Implementation

**Location:** `packages/research/publisher/`

**Files:**
- `writer.ts` - Write JSON + MD to content/
- `pdf-renderer.ts` - Puppeteer PDF generation
- `r2-uploader.ts` - Upload PDF to R2
- `db-writer.ts` - Insert/update D1 records

### File Writer

**Example Code:**
```typescript
// packages/research/publisher/writer.ts
export async function writeContent(
  slug: string,
  pageRecord: PageRecord,
  markdown: string
): Promise<void> {
  const jsonPath = `content/peptides/${slug}.json`
  const mdPath = `content/peptides/${slug}.md`

  await fs.writeFile(jsonPath, JSON.stringify(pageRecord, null, 2))
  await fs.writeFile(mdPath, markdown)
}
```

### PDF Renderer

**Uses Puppeteer to render Markdown as PDF.**

**Example Code:**
```typescript
// packages/research/publisher/pdf-renderer.ts
export async function renderPdf(
  markdown: string,
  outputPath: string
): Promise<void> {
  const browser = await puppeteer.launch()
  const page = await browser.newPage()

  const html = markdownToHtml(markdown)
  await page.setContent(html)

  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
  })

  await browser.close()
}
```

### R2 Uploader

**Example Code:**
```typescript
// packages/research/publisher/r2-uploader.ts
export async function uploadPdf(
  localPath: string,
  slug: string
): Promise<string> {
  const key = `pages/${slug}/latest.pdf`
  const fileBuffer = await fs.readFile(localPath)

  await r2.putObject({
    Key: key,
    Body: fileBuffer,
    ContentType: 'application/pdf',
  })

  return key
}
```

### Database Writer

**Example Code:**
```typescript
// packages/research/publisher/db-writer.ts
export async function writePeptide(
  db: D1Database,
  peptide: Peptide
): Promise<void> {
  await db.prepare(`
    INSERT INTO peptides (id, slug, name, aliases, evidence_grade, ...)
    VALUES (?, ?, ?, ?, ?, ...)
    ON CONFLICT(id) DO UPDATE SET
      evidence_grade = excluded.evidence_grade,
      last_reviewed_at = excluded.last_reviewed_at,
      updated_at = excluded.updated_at
  `).bind(/* ... */).run()
}
```

---

## CLI

### Commands

**Run single peptide:**
```bash
pnpm cli run-single "BPC-157" "Body Protection Compound"
```

**Run batch:**
```bash
pnpm cli run-batch catalog/peptides.yaml
```

### Implementation

**Location:** `packages/research/cli/`

**Files:**
- `run-single.ts` - Process one peptide
- `run-batch.ts` - Process from YAML list
- `logger.ts` - Structured logging

**Example Code:**
```typescript
// packages/research/cli/run-single.ts
async function main() {
  const [name, ...aliases] = process.argv.slice(2)

  logger.info('Starting pipeline', { name })

  try {
    const sourcePack = await ingest(name, aliases)
    logger.info('Ingest complete', { studyCount: sourcePack.studies.length })

    const normalized = await normalize(sourcePack)
    const gradeResult = await grade(normalized)
    const synthesis = await synthesize({ ...normalized, ...gradeResult })
    const compliance = await comply(synthesis)

    if (!compliance.ready) {
      throw new Error(`Compliance failed: ${compliance.issues.join(', ')}`)
    }

    await publish(name, synthesis)
    logger.info('Pipeline complete', { name })
  } catch (error) {
    logger.error('Pipeline failed', { name, error })
    process.exit(1)
  }
}
```

---

## Error Handling

### Retry Strategy

- Network errors: 3 retries with exponential backoff
- LLM API errors: 2 retries
- Compliance failures: No retry (fix prompt or input)

### Logging

**Structured JSON logs:**
```json
{
  "timestamp": "2025-11-04T12:00:00Z",
  "level": "info",
  "component": "synthesis",
  "peptide_id": "550e8400-e29b-41d4-a716-446655440000",
  "duration_ms": 12500,
  "tokens_used": 8432,
  "model": "claude-4.5-sonnet"
}
```

---

## Cost Tracking

### Per Peptide

- Claude 4.5: $3-5 (varies with study count)
- GPT-5: $0.50-1
- **Total:** ~$4-6 per peptide

### Monthly (20 peptides, weekly updates)

- Initial: $80-120 (one-time)
- Weekly updates (5 peptides): $20-30/week
- **Monthly:** ~$85-125

---

## Testing

### Unit Tests

**Test each stage independently:**

```typescript
describe('gradeEvidence', () => {
  it('returns "high" for 2+ consistent RCTs', () => {
    const studies = [
      { type: 'human_rct', sample_size: 60, outcome: 'benefit' },
      { type: 'human_rct', sample_size: 80, outcome: 'benefit' }
    ]
    const result = gradeEvidence(studies)
    expect(result.grade).toBe('high')
  })
})
```

### Integration Tests

**Test full pipeline with fixtures:**

```typescript
describe('Research Pipeline', () => {
  it('processes a peptide end-to-end', async () => {
    const result = await runPipeline('Test Peptide')
    expect(result.pageRecord).toBeDefined()
    expect(result.pdf).toExist()
  })
})
```

---

## References

- [01-architecture.md](./01-architecture.md) - System architecture
- [05-llm-prompts.md](./05-llm-prompts.md) - Full prompts
- [project-structure.md](./project-structure.md) - File organization

---

**Document Owner:** Engineering Team
**Lines:** 395 (within 400-line limit ✓)
