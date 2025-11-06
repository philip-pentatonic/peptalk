import { z } from 'zod'

/**
 * Content section within a peptide page.
 *
 * Sections organize synthesized content into logical groups:
 * - "Human Research" - Clinical trials and human studies
 * - "Animal Research" - Preclinical studies
 * - "Mechanisms" - How it works
 * - "Safety & Side Effects" - Adverse events
 * - "Legal Status" - Regulatory information
 */
export const SectionSchema = z.object({
  title: z.string().min(1),
  contentHtml: z
    .string()
    .min(1)
    .describe('HTML content with inline citations (PMID:xxx, NCT:xxx)'),
  plainLanguageSummary: z
    .string()
    .optional()
    .describe('Plain-language summary for non-scientists (2-3 sentences)'),
  order: z.number().int().nonnegative().describe('Display order (0-indexed)'),
})

export type Section = z.infer<typeof SectionSchema>

/**
 * Standard section titles for consistency.
 */
export const SECTION_TITLES = {
  HUMAN_RESEARCH: 'Human Research',
  ANIMAL_RESEARCH: 'Animal Research',
  MECHANISMS: 'Mechanisms of Action',
  SAFETY: 'Safety & Side Effects',
  LEGAL: 'Legal Status',
} as const

/**
 * Create a section with proper ordering.
 */
export function createSection(
  title: string,
  contentHtml: string,
  order: number
): Section {
  return SectionSchema.parse({ title, contentHtml, order })
}

/**
 * Sort sections by order.
 */
export function sortSections(sections: Section[]): Section[] {
  return [...sections].sort((a, b) => a.order - b.order)
}
