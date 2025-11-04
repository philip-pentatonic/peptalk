# @peptalk/schemas

Shared Zod schemas for data validation across PepTalk.

## Purpose

This package provides type-safe data validation schemas using Zod for all major data structures in the PepTalk platform. These schemas ensure data integrity across the research pipeline, API, and database layers.

## Key Schemas

### SourcePack

Raw research data ingested from PubMed and ClinicalTrials.gov.

```typescript
import { SourcePackSchema } from '@peptalk/schemas'

const sourcePack = SourcePackSchema.parse({
  peptideId: 'bpc-157',
  studies: [
    {
      pmid: '12345678',
      title: 'Study Title',
      abstract: 'Abstract text...',
      year: 2023,
      studyType: 'human_rct',
      // ...
    }
  ]
})
```

### PageRecord

Synthesized peptide page data ready for publication.

```typescript
import { PageRecordSchema } from '@peptalk/schemas'

const pageRecord = PageRecordSchema.parse({
  slug: 'bpc-157',
  name: 'BPC-157',
  aliases: ['Body Protection Compound'],
  evidenceGrade: 'moderate',
  summaryHtml: '<p>...</p>',
  // ...
})
```

### Study

Individual research study with type discrimination.

```typescript
import { StudySchema } from '@peptalk/schemas'

const study = StudySchema.parse({
  id: 'PMID:12345678',
  type: 'pubmed',
  pmid: '12345678',
  title: 'Study Title',
  studyType: 'human_rct',
  // ...
})
```

## Schema Hierarchy

```
SourcePackSchema
├── studies: StudySchema[]
└── peptideId: string

PageRecordSchema
├── slug: string
├── name: string
├── evidenceGrade: EvidenceGradeSchema
├── summaryHtml: string
├── sections: SectionSchema[]
└── studies: StudySchema[]

StudySchema (discriminated union)
├── PubMedStudySchema (type: 'pubmed')
└── ClinicalTrialStudySchema (type: 'clinicaltrials')
```

## Evidence Grades

```typescript
import { EvidenceGradeSchema } from '@peptalk/schemas'

// Allowed values: 'very_low' | 'low' | 'moderate' | 'high'
const grade = EvidenceGradeSchema.parse('moderate')
```

## Study Types

```typescript
import { StudyTypeSchema } from '@peptalk/schemas'

// Human studies: 'human_rct' | 'human_observational' | 'human_case_report'
// Animal studies: 'animal_invivo' | 'animal_invitro'
const studyType = StudyTypeSchema.parse('human_rct')
```

## Usage

### Installation

This package is automatically available in the monorepo via workspace references.

```json
{
  "dependencies": {
    "@peptalk/schemas": "workspace:*"
  }
}
```

### Basic Usage

```typescript
import {
  SourcePackSchema,
  PageRecordSchema,
  StudySchema,
  EvidenceGradeSchema
} from '@peptalk/schemas'

// Validate raw data
const sourcePack = SourcePackSchema.parse(rawData)

// Type inference
type SourcePack = z.infer<typeof SourcePackSchema>
type PageRecord = z.infer<typeof PageRecordSchema>
```

### Partial Validation

```typescript
import { StudySchema } from '@peptalk/schemas'

// Validate only required fields
const partialStudy = StudySchema.partial().parse({
  id: 'PMID:12345678',
  type: 'pubmed'
})
```

### Error Handling

```typescript
import { SourcePackSchema } from '@peptalk/schemas'
import { z } from 'zod'

try {
  const sourcePack = SourcePackSchema.parse(rawData)
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('Validation errors:', error.errors)
  }
}
```

## API Reference

### SourcePackSchema

Schema for raw research data ingested from external APIs.

**Fields:**
- `peptideId` (string, required) - Unique peptide identifier (slug format)
- `studies` (StudySchema[], required) - Array of research studies
- `ingestedAt` (string, optional) - ISO 8601 timestamp of ingestion

### PageRecordSchema

Schema for synthesized peptide page data.

**Fields:**
- `slug` (string, required) - URL-safe identifier
- `name` (string, required) - Primary peptide name
- `aliases` (string[], required) - Alternative names
- `evidenceGrade` (EvidenceGrade, required) - Overall evidence quality
- `summaryHtml` (string, required) - HTML summary section
- `sections` (SectionSchema[], required) - Content sections
- `studies` (StudySchema[], required) - Referenced studies
- `humanRctCount` (number, required) - Count of human RCTs
- `animalCount` (number, required) - Count of animal studies
- `legalNotes` (string[], required) - Compliance disclaimers
- `lastUpdated` (string, required) - ISO 8601 timestamp
- `version` (number, required) - Version number for page

### StudySchema

Discriminated union schema for research studies.

**Common Fields:**
- `id` (string, required) - Unique identifier (e.g., "PMID:12345678")
- `type` ('pubmed' | 'clinicaltrials', required) - Study source type
- `title` (string, required) - Study title
- `studyType` (StudyType, required) - Classification of study design

**PubMed-specific Fields:**
- `pmid` (string, required) - PubMed ID
- `abstract` (string, required) - Study abstract
- `authors` (string[], required) - Author list
- `journal` (string, required) - Journal name
- `year` (number, required) - Publication year
- `doi` (string, optional) - Digital Object Identifier

**ClinicalTrials.gov-specific Fields:**
- `nctId` (string, required) - NCT identifier
- `status` (string, required) - Trial status
- `phase` (string, optional) - Trial phase
- `conditions` (string[], required) - Medical conditions studied
- `interventions` (string[], required) - Interventions tested
- `enrollment` (number, optional) - Number of participants

### EvidenceGradeSchema

Enum schema for evidence quality grades.

**Values:**
- `'very_low'` - Minimal or poor quality evidence
- `'low'` - Limited evidence, primarily animal studies
- `'moderate'` - Some human evidence, mixed quality
- `'high'` - Strong human evidence from multiple RCTs

### StudyTypeSchema

Enum schema for study design classification.

**Human Studies:**
- `'human_rct'` - Randomized Controlled Trial
- `'human_observational'` - Observational/cohort study
- `'human_case_report'` - Case report or case series

**Animal Studies:**
- `'animal_invivo'` - In vivo animal study
- `'animal_invitro'` - In vitro/cell culture study

## Testing

```bash
# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Type check
pnpm typecheck
```

## Development

### Adding New Schemas

1. Create schema file in `src/` (e.g., `src/new-schema.ts`)
2. Define schema with Zod
3. Export from `src/index.ts`
4. Add tests in `src/new-schema.test.ts`
5. Update this README

Example:

```typescript
// src/new-schema.ts
import { z } from 'zod'

export const NewSchema = z.object({
  field: z.string(),
  optional: z.number().optional()
})

export type New = z.infer<typeof NewSchema>
```

### Schema Design Principles

1. **Strict by default** - Use `.strict()` to prevent unknown keys
2. **Explicit optionals** - Mark optional fields with `.optional()`
3. **Descriptive errors** - Use `.describe()` for better error messages
4. **Type inference** - Always export inferred types
5. **Composability** - Build complex schemas from smaller ones

## Dependencies

- **zod** (^3.22.4) - Schema validation library

## Used By

- `@peptalk/research` - Research pipeline data validation
- `@peptalk/database` - Database query/mutation validation
- `apps/workers` - API request/response validation
- `apps/web` - Client-side data validation

## File Structure

```
packages/schemas/
├── src/
│   ├── index.ts              # Main exports
│   ├── source-pack.ts        # SourcePack schema
│   ├── page-record.ts        # PageRecord schema
│   ├── study.ts              # Study schemas (discriminated union)
│   ├── evidence-grade.ts     # Evidence grade enum
│   ├── study-type.ts         # Study type enum
│   └── section.ts            # Content section schema
├── package.json
├── tsconfig.json
└── README.md
```

## Notes

- All schemas are exported from `src/index.ts` for single import point
- Schemas are kept under 400 lines per file (enforced by ESLint)
- Use discriminated unions for polymorphic data (e.g., PubMed vs ClinicalTrials)
- Validation errors are automatically formatted by Zod

## Related Documentation

- [docs/02-database-schema.md](../../docs/02-database-schema.md) - Database schema design
- [docs/04-research-pipeline.md](../../docs/04-research-pipeline.md) - Pipeline data flow
- [docs/code-standards.md](../../docs/code-standards.md) - Coding standards
