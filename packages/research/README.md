# @peptalk/research

Research pipeline for ingesting, synthesizing, and publishing peptide evidence pages.

## Purpose

This package implements the complete research pipeline:

1. **Ingest** - Fetch data from PubMed and ClinicalTrials.gov
2. **Normalize** - Deduplicate and classify studies
3. **Grade** - Apply evidence rubric to determine quality
4. **Synthesize** - Generate content with Claude Sonnet 4.5
5. **Comply** - Validate with GPT-5 for compliance
6. **Publish** - Generate PDF, save to D1 + R2

## Architecture

```
Input (peptides.yaml)
    ↓
[Ingest] → SourcePack (JSON)
    ↓
[Normalize] → Deduplicated studies
    ↓
[Grade] → Evidence grades applied
    ↓
[Synthesize] → HTML content (Claude 4.5)
    ↓
[Comply] → Validated content (GPT-5)
    ↓
[Publish] → PageRecord + PDF + Database
```

## CLI Usage

### Process Single Peptide

```bash
pnpm cli "BPC-157" "Body Protection Compound"
```

Output:
- `content/peptides/bpc-157.json` - PageRecord
- `content/peptides/bpc-157.md` - Markdown version
- `storage/pages/bpc-157.pdf` - PDF render
- Database records in D1

### Process Batch

```bash
pnpm cli:batch catalog/peptides.yaml
```

Processes all peptides in YAML file sequentially.

### Example peptides.yaml

```yaml
peptides:
  - id: bpc-157
    name: BPC-157
    aliases:
      - Body Protection Compound
      - Pentadecapeptide BPC 157

  - id: tb-500
    name: TB-500
    aliases:
      - Thymosin Beta-4 Fragment
```

## Pipeline Stages

### 1. Ingest

Fetches research data from external APIs.

```typescript
import { ingestPeptide } from '@peptalk/research/ingest'

const sourcePack = await ingestPeptide({
  peptideId: 'bpc-157',
  name: 'BPC-157',
  aliases: ['Body Protection Compound']
})

// sourcePack.studies contains PubMed + ClinicalTrials data
```

**Outputs:**
- `SourcePack` object with raw study data
- Saved to `content/peptides/bpc-157-source.json`

### 2. Normalize

Deduplicates studies and infers study types.

```typescript
import { normalize } from '@peptalk/research/ingest/normalizer'

const normalized = await normalize(sourcePack)

// Removes duplicates, infers study types (human_rct, animal_invivo, etc.)
```

### 3. Grade

Applies evidence rubric to determine quality grade.

```typescript
import { gradeEvidence } from '@peptalk/research/rubric'

const grade = gradeEvidence(normalized.studies)

// Returns: 'very_low' | 'low' | 'moderate' | 'high'
```

**Grading Criteria:**
- `high` - 3+ human RCTs
- `moderate` - 1-2 human RCTs or 3+ observational studies
- `low` - Only animal studies (5+)
- `very_low` - Minimal evidence (<5 animal studies)

### 4. Synthesize

Generates content using Claude Sonnet 4.5.

```typescript
import { synthesize } from '@peptalk/research/synthesis'

const synthesized = await synthesize({
  peptideId: 'bpc-157',
  name: 'BPC-157',
  studies: normalized.studies,
  evidenceGrade: grade
})

// Returns HTML content with inline citations
```

**Claude 4.5 Configuration:**
- Model: `claude-sonnet-4-5-20250929`
- Max tokens: 8000
- Temperature: 0.3
- System prompt enforces citation discipline

### 5. Comply

Validates content with GPT-5 for compliance.

```typescript
import { validateCompliance } from '@peptalk/research/compliance'

const validation = await validateCompliance(synthesized)

if (!validation.passed) {
  console.error('Compliance issues:', validation.issues)
  // Fix and retry
}
```

**GPT-5 Configuration:**
- Model: `gpt-5`
- Checks for medical advice, dosage claims, vendor recommendations

### 6. Publish

Generates PDF and saves to database + R2.

```typescript
import { publish } from '@peptalk/research/publisher'

await publish({
  pageRecord: synthesized,
  pdfPath: 'storage/pages/bpc-157.pdf',
  db: env.DB,
  r2: env.R2
})
```

**Outputs:**
- PDF file rendered with Puppeteer
- Database records in D1 (peptides, studies, page_versions)
- PDF uploaded to R2 bucket

## API Reference

### ingestPeptide(options)

Fetches research data from PubMed and ClinicalTrials.gov.

**Parameters:**
- `peptideId` (string) - Unique identifier (slug)
- `name` (string) - Primary peptide name
- `aliases` (string[]) - Alternative names for search

**Returns:** `Promise<SourcePack>`

### normalize(sourcePack)

Deduplicates and classifies studies.

**Parameters:**
- `sourcePack` (SourcePack) - Raw ingested data

**Returns:** `Promise<SourcePack>`

### gradeEvidence(studies)

Determines evidence quality grade.

**Parameters:**
- `studies` (Study[]) - Normalized studies

**Returns:** `EvidenceGrade`

### synthesize(options)

Generates content with Claude Sonnet 4.5.

**Parameters:**
- `peptideId` (string)
- `name` (string)
- `studies` (Study[])
- `evidenceGrade` (EvidenceGrade)

**Returns:** `Promise<PageRecord>`

### validateCompliance(pageRecord)

Validates content with GPT-5.

**Parameters:**
- `pageRecord` (PageRecord) - Synthesized content

**Returns:** `Promise<ComplianceResult>`

### publish(options)

Publishes page to database and storage.

**Parameters:**
- `pageRecord` (PageRecord)
- `pdfPath` (string) - Output path for PDF
- `db` (D1Database)
- `r2` (R2Bucket)

**Returns:** `Promise<void>`

## Configuration

### Environment Variables

```bash
# LLM APIs
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-proj-...

# PubMed
PUBMED_EMAIL=dev@peptalk.com

# Cloudflare (for publishing)
D1_DATABASE_ID=...
R2_BUCKET_NAME=peptalk-dev-pdfs
```

## Cost Tracking

### Per-Peptide Costs

- **Claude 4.5** (synthesis): ~$3-4 per peptide
- **GPT-5** (compliance): ~$1-2 per peptide
- **Total**: ~$4-6 per peptide

### Batch Processing

20 peptides = $80-120 one-time cost

See [docs/09-cost-model.md](../../docs/09-cost-model.md) for details.

## Testing

```bash
# Run all tests
pnpm test

# Run specific stage tests
pnpm test ingest
pnpm test synthesis
pnpm test compliance

# Integration test
pnpm test integration
```

## Error Handling

### API Rate Limits

```typescript
try {
  const sourcePack = await ingestPeptide(options)
} catch (error) {
  if (error.code === 'RATE_LIMIT') {
    // Wait and retry
    await sleep(error.retryAfter * 1000)
    return ingestPeptide(options)
  }
  throw error
}
```

### LLM Failures

```typescript
const maxRetries = 3
let attempt = 0

while (attempt < maxRetries) {
  try {
    return await synthesize(options)
  } catch (error) {
    attempt++
    if (attempt === maxRetries) throw error
    await sleep(2000 * attempt) // Exponential backoff
  }
}
```

## File Structure

```
packages/research/
├── ingest/
│   ├── pubmed/              # PubMed API client
│   ├── clinicaltrials/      # ClinicalTrials.gov client
│   └── normalizer/          # Deduplication + classification
├── synthesis/               # Claude 4.5 integration
├── compliance/              # GPT-5 validation
├── rubric/                  # Evidence grading logic
├── publisher/               # PDF + D1 + R2 publishing
├── cli/                     # CLI tools
├── package.json
├── tsconfig.json
└── README.md
```

## Development

### Adding New Ingest Source

1. Create client in `ingest/new-source/`
2. Implement `fetchStudies()` method
3. Update `ingestPeptide()` to include new source
4. Add tests

### Customizing Synthesis

Edit prompts in `synthesis/prompts.ts`:

```typescript
export const SYSTEM_PROMPT = `
You are an evidence-synthesis writer for a peptides reference platform.

CRITICAL RULES:
1. Educational content only. Never provide medical advice.
2. Every empirical claim MUST cite a PMID or NCT inline.
...
`
```

### Adjusting Evidence Rubric

Edit `rubric/grade-evidence.ts`:

```typescript
export function gradeEvidence(studies: Study[]): EvidenceGrade {
  const humanRcts = studies.filter(s => s.studyType === 'human_rct').length

  if (humanRcts >= 3) return 'high'
  if (humanRcts >= 1) return 'moderate'
  // ... custom logic
}
```

## Related Documentation

- [docs/04-research-pipeline.md](../../docs/04-research-pipeline.md) - Complete pipeline guide
- [docs/05-llm-prompts.md](../../docs/05-llm-prompts.md) - LLM prompts and examples
- [docs/09-cost-model.md](../../docs/09-cost-model.md) - Cost analysis
