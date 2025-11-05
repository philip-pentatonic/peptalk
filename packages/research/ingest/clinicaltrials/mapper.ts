/**
 * Maps ClinicalTrials.gov trials to Study schema.
 */

import type { ClinicalTrialStudy, StudyType } from '@peptalk/schemas'
import { ClinicalTrialStudySchema } from '@peptalk/schemas'
import type { ClinicalTrial } from './client'

/**
 * Convert ClinicalTrial to Study schema.
 */
export function mapToStudy(
  trial: ClinicalTrial,
  peptideId: string
): ClinicalTrialStudy {
  const studyType = inferStudyType(trial)

  const study: ClinicalTrialStudy = {
    id: `NCT:${trial.nctId}`,
    type: 'clinicaltrials',
    nctId: trial.nctId,
    title: trial.title,
    studyType,
    status: trial.status,
    phase: trial.phase,
    conditions: trial.conditions,
    interventions: trial.interventions,
    enrollment: trial.enrollment,
    startDate: trial.startDate,
    completionDate: trial.completionDate,
    url: `https://clinicaltrials.gov/study/${trial.nctId}`,
  }

  // Validate with Zod schema
  return ClinicalTrialStudySchema.parse(study)
}

/**
 * Infer study type from trial metadata.
 *
 * ClinicalTrials.gov studies are always human research.
 * Determine if RCT or observational based on phase and design.
 */
export function inferStudyType(trial: ClinicalTrial): StudyType {
  const title = trial.title.toLowerCase()
  const status = trial.status.toLowerCase()

  // Check if observational study
  if (
    title.includes('observational') ||
    title.includes('registry') ||
    title.includes('cohort') ||
    status.includes('observational')
  ) {
    return 'human_observational'
  }

  // Check if case series/report
  if (
    title.includes('case series') ||
    title.includes('case report') ||
    title.includes('case study')
  ) {
    return 'human_case_report'
  }

  // Check for RCT indicators
  const rctKeywords = [
    'randomized',
    'randomised',
    'controlled',
    'double-blind',
    'placebo',
  ]

  if (rctKeywords.some((kw) => title.includes(kw))) {
    return 'human_rct'
  }

  // Phase 1-4 trials are typically RCTs
  if (trial.phase) {
    const phase = trial.phase.toLowerCase()
    if (
      phase.includes('phase 1') ||
      phase.includes('phase 2') ||
      phase.includes('phase 3') ||
      phase.includes('phase 4')
    ) {
      return 'human_rct'
    }
  }

  // Default to RCT for interventional trials
  return 'human_rct'
}

/**
 * Map multiple trials to studies.
 */
export function mapTrialsToStudies(
  trials: ClinicalTrial[],
  peptideId: string
): ClinicalTrialStudy[] {
  return trials.map((trial) => mapToStudy(trial, peptideId))
}

/**
 * Filter out trials with insufficient data.
 */
export function filterValidTrials(trials: ClinicalTrial[]): ClinicalTrial[] {
  return trials.filter((trial) => {
    // Must have NCT ID and title
    if (!trial.nctId || !trial.title) return false

    // Must have conditions (what's being studied)
    if (!trial.conditions || trial.conditions.length === 0) return false

    // Must have interventions (what's being tested)
    if (!trial.interventions || trial.interventions.length === 0) return false

    return true
  })
}
