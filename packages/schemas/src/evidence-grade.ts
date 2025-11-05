import { z } from 'zod'

/**
 * Evidence quality grades based on study type and count.
 *
 * Grading criteria:
 * - high: 3+ human RCTs
 * - moderate: 1-2 human RCTs or 3+ observational studies
 * - low: Only animal studies (5+)
 * - very_low: Minimal evidence (<5 animal studies)
 */
export const EvidenceGradeSchema = z.enum(['very_low', 'low', 'moderate', 'high'])

export type EvidenceGrade = z.infer<typeof EvidenceGradeSchema>

/**
 * Check if evidence grade is at least moderate quality.
 */
export function isHighQuality(grade: EvidenceGrade): boolean {
  return grade === 'high' || grade === 'moderate'
}

/**
 * Compare evidence grades (higher is better).
 * Returns: -1 if a < b, 0 if a === b, 1 if a > b
 */
export function compareGrades(a: EvidenceGrade, b: EvidenceGrade): number {
  const order: Record<EvidenceGrade, number> = {
    very_low: 0,
    low: 1,
    moderate: 2,
    high: 3,
  }
  return order[a] - order[b]
}
