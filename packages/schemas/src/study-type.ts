import { z } from 'zod'

/**
 * Study design classification for evidence grading.
 *
 * Human studies (highest value):
 * - human_rct: Randomized Controlled Trial
 * - human_observational: Cohort, case-control, cross-sectional
 * - human_case_report: Case report or case series
 *
 * Animal studies (lower value):
 * - animal_invivo: In vivo animal experiments
 * - animal_invitro: In vitro / cell culture studies
 */
export const StudyTypeSchema = z.enum([
  'human_rct',
  'human_observational',
  'human_case_report',
  'animal_invivo',
  'animal_invitro',
])

export type StudyType = z.infer<typeof StudyTypeSchema>

/**
 * Check if study type is human research.
 */
export function isHumanStudy(type: StudyType): boolean {
  return type.startsWith('human_')
}

/**
 * Check if study type is animal research.
 */
export function isAnimalStudy(type: StudyType): boolean {
  return type.startsWith('animal_')
}

/**
 * Get relative weight for evidence grading.
 * Higher weight = stronger evidence.
 */
export function getStudyWeight(type: StudyType): number {
  const weights: Record<StudyType, number> = {
    human_rct: 10,
    human_observational: 5,
    human_case_report: 2,
    animal_invivo: 1,
    animal_invitro: 0.5,
  }
  return weights[type]
}
