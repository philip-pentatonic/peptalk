/**
 * ClinicalTrials.gov API client.
 * Fetches clinical trial data from ClinicalTrials.gov API v2.
 *
 * API Docs: https://clinicaltrials.gov/data-api/api
 */

export interface ClinicalTrialsConfig {
  maxResults?: number
}

export interface ClinicalTrial {
  nctId: string
  title: string
  status: string
  phase?: string
  conditions: string[]
  interventions: string[]
  enrollment?: number
  startDate?: string
  completionDate?: string
}

const CT_BASE_URL = 'https://clinicaltrials.gov/api/v2/studies'

/**
 * Search ClinicalTrials.gov for studies matching a query.
 */
export async function searchClinicalTrials(
  query: string,
  config: ClinicalTrialsConfig = {}
): Promise<ClinicalTrial[]> {
  const params = new URLSearchParams({
    'query.term': query,
    'pageSize': String(config.maxResults || 100),
    format: 'json',
  })

  const url = `${CT_BASE_URL}?${params}`

  try {
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`ClinicalTrials search failed: ${response.statusText}`)
    }

    const data = await response.json()

    // Parse studies from response
    const studies: ClinicalTrial[] = []

    if (data.studies && Array.isArray(data.studies)) {
      for (const study of data.studies) {
        try {
          const trial = parseStudy(study)
          if (trial) studies.push(trial)
        } catch (error) {
          console.error('Failed to parse trial:', error)
        }
      }
    }

    return studies
  } catch (error) {
    throw new Error(`ClinicalTrials search error: ${error}`)
  }
}

/**
 * Parse study from API response.
 */
function parseStudy(study: any): ClinicalTrial | null {
  // Extract protocol section
  const protocol = study.protocolSection

  if (!protocol) return null

  // NCT ID
  const nctId = protocol.identificationModule?.nctId
  if (!nctId) return null

  // Title
  const title =
    protocol.identificationModule?.officialTitle ||
    protocol.identificationModule?.briefTitle ||
    ''

  // Status
  const status = protocol.statusModule?.overallStatus || 'Unknown'

  // Phase
  const phase = protocol.designModule?.phases?.[0]

  // Conditions
  const conditions =
    protocol.conditionsModule?.conditions || []

  // Interventions
  const interventions =
    protocol.armsInterventionsModule?.interventions?.map(
      (i: any) => i.name || ''
    ) || []

  // Enrollment
  const enrollment = protocol.designModule?.enrollmentInfo?.count

  // Dates
  const startDate = protocol.statusModule?.startDateStruct?.date
  const completionDate = protocol.statusModule?.completionDateStruct?.date

  return {
    nctId,
    title,
    status,
    phase,
    conditions,
    interventions,
    enrollment,
    startDate,
    completionDate,
  }
}

/**
 * Build search query for peptide research.
 */
export function buildPeptideQuery(peptideName: string, aliases: string[]): string {
  const terms = [peptideName, ...aliases]
  // ClinicalTrials.gov uses simple term search
  return terms.join(' OR ')
}

/**
 * Search for trials related to a peptide.
 */
export async function searchPeptideTrials(
  peptideName: string,
  aliases: string[],
  config: ClinicalTrialsConfig = {}
): Promise<ClinicalTrial[]> {
  const query = buildPeptideQuery(peptideName, aliases)

  return await searchClinicalTrials(query, config)
}
