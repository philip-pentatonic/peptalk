/**
 * ClinicalTrials.gov ingest module.
 * Main entry point for fetching clinical trial data.
 */

export * from './client'
export * from './mapper'

import type { ClinicalTrialStudy } from '@peptalk/schemas'
import { searchPeptideTrials, type ClinicalTrialsConfig } from './client'
import { mapTrialsToStudies, filterValidTrials } from './mapper'

/**
 * Ingest ClinicalTrials.gov studies for a peptide.
 * Combines search, filter, and mapping.
 */
export async function ingestClinicalTrials(
  peptideName: string,
  aliases: string[],
  peptideId: string,
  config: ClinicalTrialsConfig = {}
): Promise<ClinicalTrialStudy[]> {
  // Search for trials
  const trials = await searchPeptideTrials(peptideName, aliases, config)

  // Filter out invalid trials
  const validTrials = filterValidTrials(trials)

  // Map to Study schema
  const studies = mapTrialsToStudies(validTrials, peptideId)

  return studies
}
