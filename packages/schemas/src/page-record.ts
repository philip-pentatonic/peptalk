import { z } from 'zod'
import { EvidenceGradeSchema } from './evidence-grade'
import { SectionSchema } from './section'
import { StudySchema } from './study'

/**
 * PageRecord: Fully synthesized peptide page ready for publication.
 *
 * This is the final output of the research pipeline, containing:
 * - Synthesized HTML content with inline citations
 * - Evidence grade
 * - All referenced studies
 * - Legal disclaimers
 * - Metadata for display
 */
export const PageRecordSchema = z.object({
  // Identity
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase with hyphens'),
  name: z.string().min(1),
  aliases: z.array(z.string()).default([]),

  // Evidence
  evidenceGrade: EvidenceGradeSchema,

  // Content
  summaryHtml: z
    .string()
    .min(1)
    .describe('Brief overview paragraph with key findings'),
  sections: z.array(SectionSchema).min(1),

  // Studies
  studies: z.array(StudySchema),
  humanRctCount: z.number().int().nonnegative(),
  animalCount: z.number().int().nonnegative(),

  // Legal
  legalNotes: z
    .array(z.string())
    .default([
      'This content is for educational purposes only.',
      'Not intended as medical advice.',
      'Consult a healthcare provider before use.',
    ]),

  // Metadata
  lastUpdated: z
    .string()
    .datetime()
    .default(() => new Date().toISOString()),
  version: z.number().int().positive().default(1),
})

export type PageRecord = z.infer<typeof PageRecordSchema>

/**
 * Extract study counts from studies array.
 */
export function calculateStudyCounts(studies: PageRecord['studies']) {
  const humanRctCount = studies.filter((s) => s.studyType === 'human_rct').length
  const animalCount = studies.filter((s) => s.studyType.startsWith('animal_')).length

  return { humanRctCount, animalCount }
}

/**
 * Create excerpt from summary HTML (plain text, first 200 chars).
 */
export function createExcerpt(summaryHtml: string, maxLength = 200): string {
  // Strip HTML tags
  const plainText = summaryHtml.replace(/<[^>]+>/g, '')

  // Trim to maxLength
  if (plainText.length <= maxLength) return plainText

  // Find last space before maxLength
  const truncated = plainText.slice(0, maxLength)
  const lastSpace = truncated.lastIndexOf(' ')

  if (lastSpace > 0) {
    return truncated.slice(0, lastSpace) + '...'
  }

  return truncated + '...'
}

/**
 * Validate page record has all required studies referenced in content.
 */
export function validateCitations(pageRecord: PageRecord): {
  valid: boolean
  missingCitations: string[]
} {
  const contentText = [
    pageRecord.summaryHtml,
    ...pageRecord.sections.map((s) => s.contentHtml),
  ].join(' ')

  const citedIds = new Set<string>()

  // Extract PMID:xxx citations
  const pmidMatches = contentText.matchAll(/PMID:(\d+)/g)
  for (const match of pmidMatches) {
    citedIds.add(`PMID:${match[1]}`)
  }

  // Extract NCT:xxx citations
  const nctMatches = contentText.matchAll(/NCT:(NCT\d{8})/g)
  for (const match of nctMatches) {
    citedIds.add(`NCT:${match[1]}`)
  }

  // Check all studies are cited
  const missingCitations = pageRecord.studies
    .filter((study) => !citedIds.has(study.id))
    .map((study) => study.id)

  return {
    valid: missingCitations.length === 0,
    missingCitations,
  }
}
