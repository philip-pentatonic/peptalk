import { z } from 'zod'
import { StudyTypeSchema } from './study-type'

/**
 * Base schema for all study types.
 */
const BaseStudySchema = z.object({
  id: z.string().describe('Unique identifier (e.g., PMID:12345678, NCT:NCT01234567)'),
  type: z.enum(['pubmed', 'clinicaltrials']),
  title: z.string().min(1),
  studyType: StudyTypeSchema,
})

/**
 * PubMed study from PubMed API.
 */
export const PubMedStudySchema = BaseStudySchema.extend({
  type: z.literal('pubmed'),
  pmid: z.string().regex(/^\d+$/, 'PMID must be numeric'),
  abstract: z.string(),
  authors: z.array(z.string()),
  journal: z.string(),
  year: z.number().int().min(1900).max(new Date().getFullYear() + 1),
  doi: z.string().optional(),
  url: z.string().url().optional(),
})

export type PubMedStudy = z.infer<typeof PubMedStudySchema>

/**
 * ClinicalTrials.gov study.
 */
export const ClinicalTrialStudySchema = BaseStudySchema.extend({
  type: z.literal('clinicaltrials'),
  nctId: z.string().regex(/^NCT\d{8}$/, 'NCT ID must be format NCT########'),
  status: z.string(),
  phase: z.string().optional(),
  conditions: z.array(z.string()),
  interventions: z.array(z.string()),
  enrollment: z.number().int().positive().optional(),
  startDate: z.string().optional(),
  completionDate: z.string().optional(),
  url: z.string().url().optional(),
})

export type ClinicalTrialStudy = z.infer<typeof ClinicalTrialStudySchema>

/**
 * Discriminated union of all study types.
 * Use type field to discriminate.
 */
export const StudySchema = z.discriminatedUnion('type', [
  PubMedStudySchema,
  ClinicalTrialStudySchema,
])

export type Study = z.infer<typeof StudySchema>

/**
 * Type guard for PubMed studies.
 */
export function isPubMedStudy(study: Study): study is PubMedStudy {
  return study.type === 'pubmed'
}

/**
 * Type guard for ClinicalTrials studies.
 */
export function isClinicalTrialStudy(study: Study): study is ClinicalTrialStudy {
  return study.type === 'clinicaltrials'
}

/**
 * Get display URL for study.
 */
export function getStudyUrl(study: Study): string {
  if (study.url) return study.url

  if (isPubMedStudy(study)) {
    return `https://pubmed.ncbi.nlm.nih.gov/${study.pmid}/`
  }

  if (isClinicalTrialStudy(study)) {
    return `https://clinicaltrials.gov/study/${study.nctId}`
  }

  return ''
}

/**
 * Get citation string for study.
 */
export function getCitation(study: Study): string {
  if (isPubMedStudy(study)) {
    const firstAuthor = study.authors[0] || 'Unknown'
    return `${firstAuthor} et al. ${study.journal}. ${study.year}. PMID:${study.pmid}`
  }

  if (isClinicalTrialStudy(study)) {
    return `ClinicalTrials.gov: ${study.nctId}`
  }

  return study.title
}
