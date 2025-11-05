/**
 * PubMed ingest module.
 * Main entry point for fetching PubMed studies.
 */

export * from './client'
export * from './mapper'

import type { PubMedStudy } from '@peptalk/schemas'
import { searchAndFetch, type PubMedConfig } from './client'
import { mapArticlesToStudies, filterValidArticles } from './mapper'

/**
 * Ingest PubMed studies for a peptide.
 * Combines search, fetch, filter, and mapping.
 */
export async function ingestPubMed(
  peptideName: string,
  aliases: string[],
  peptideId: string,
  config: PubMedConfig
): Promise<PubMedStudy[]> {
  // Search and fetch articles
  const articles = await searchAndFetch(peptideName, aliases, config)

  // Filter out invalid articles
  const validArticles = filterValidArticles(articles)

  // Map to Study schema
  const studies = mapArticlesToStudies(validArticles, peptideId)

  return studies
}
