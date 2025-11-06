/**
 * Database writer for publishing PageRecords via HTTP API.
 * Calls internal Cloudflare Workers endpoints to write to D1.
 */

import type { PageRecord } from '@peptalk/schemas'

export interface DatabaseWriteConfig {
  apiUrl: string
  apiSecret: string
}

export interface DatabaseWriteResult {
  peptideId: string
  studiesInserted: number
  sectionsInserted: number
  success: boolean
}

/**
 * Write PageRecord to D1 database via HTTP API.
 * Inserts peptide, studies, and sections through internal endpoints.
 */
export async function writeToDatabase(
  pageRecord: PageRecord,
  config: DatabaseWriteConfig
): Promise<DatabaseWriteResult> {
  try {
    // 1. Insert or update peptide
    const peptideId = await upsertPeptide(pageRecord, config)

    // 2. Insert studies (deduplicated)
    // Note: Foreign key uses slug, not UUID
    const studiesInserted = await insertStudies(pageRecord.slug, pageRecord.studies, config)

    // 3. Insert sections
    // Note: Also uses slug for foreign key
    const sectionsInserted = await insertSections(pageRecord.slug, pageRecord.sections, config)

    // 4. Log to changelog
    await logChange(peptideId, pageRecord.version, config)

    return {
      peptideId,
      studiesInserted,
      sectionsInserted,
      success: true,
    }
  } catch (error) {
    console.error('Database write failed:', error)
    throw new Error(`Failed to write to database: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Insert or update peptide record via HTTP.
 */
async function upsertPeptide(pageRecord: PageRecord, config: DatabaseWriteConfig): Promise<string> {
  const response = await fetch(`${config.apiUrl}/api/internal/peptide`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Secret': config.apiSecret,
    },
    body: JSON.stringify({
      slug: pageRecord.slug,
      name: pageRecord.name,
      aliases: pageRecord.aliases,
      evidenceGrade: pageRecord.evidenceGrade,
      humanRctCount: pageRecord.humanRctCount,
      animalCount: pageRecord.animalCount,
      summaryHtml: pageRecord.summaryHtml,
      version: pageRecord.version,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to upsert peptide: ${response.status} ${error}`)
  }

  const result = await response.json() as { peptideId: string; action: string }
  return result.peptideId
}

/**
 * Insert studies for peptide via HTTP.
 * Handles deduplication by study ID.
 */
async function insertStudies(
  peptideSlug: string,
  studyList: PageRecord['studies'],
  config: DatabaseWriteConfig
): Promise<number> {
  if (studyList.length === 0) return 0

  // Map to database format (snake_case for D1)
  // Note: peptide_id is actually the slug because of FK constraint
  const studyRecords = studyList.map((study) => ({
    id: getStudyId(study),
    peptide_id: peptideSlug,
    type: study.type,
    title: study.title,
    study_type: study.studyType,
    abstract: 'abstract' in study ? study.abstract : null,
    year: 'year' in study ? study.year : null,
    authors: 'authors' in study ? study.authors : null,
    journal: 'journal' in study ? study.journal : null,
    doi: 'doi' in study ? study.doi : null,
    pmid: study.type === 'pubmed' ? study.pmid : null,
    nct_id: study.type === 'clinicaltrials' ? study.nctId : null,
    status: study.type === 'clinicaltrials' ? study.status : null,
    phase: study.type === 'clinicaltrials' ? study.phase : null,
    conditions: study.type === 'clinicaltrials' ? study.conditions : null,
    interventions: study.type === 'clinicaltrials' ? study.interventions : null,
    enrollment: null,
    start_date: null,
    completion_date: null,
    url: null,
  }))

  const response = await fetch(`${config.apiUrl}/api/internal/studies`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Secret': config.apiSecret,
    },
    body: JSON.stringify({ studies: studyRecords }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to insert studies: ${response.status} ${error}`)
  }

  const result = await response.json() as { success: boolean; count: number }
  return result.count
}

/**
 * Get unique study ID.
 */
function getStudyId(study: PageRecord['studies'][number]): string {
  if (study.type === 'pubmed') {
    return `PMID:${study.pmid}`
  } else {
    return study.nctId
  }
}

/**
 * Insert page sections via HTTP.
 */
async function insertSections(
  peptideSlug: string,
  sections: PageRecord['sections'],
  config: DatabaseWriteConfig
): Promise<number> {
  if (sections.length === 0) return 0

  const response = await fetch(`${config.apiUrl}/api/internal/sections`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Secret': config.apiSecret,
    },
    body: JSON.stringify({
      peptideSlug,
      sections: sections.map((section) => ({
        title: section.title,
        contentHtml: section.contentHtml,
        plainLanguageSummary: section.plainLanguageSummary,
        order: section.order,
      })),
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to insert sections: ${response.status} ${error}`)
  }

  return sections.length
}

/**
 * Log change to audit trail via HTTP.
 */
async function logChange(
  peptideId: string,
  version: number,
  config: DatabaseWriteConfig
): Promise<void> {
  const response = await fetch(`${config.apiUrl}/api/internal/changelog`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Secret': config.apiSecret,
    },
    body: JSON.stringify({
      peptideId,
      version,
      changeType: 'publish',
      changeSummary: `Published version ${version} via research pipeline`,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to log change: ${response.status} ${error}`)
  }
}

/**
 * Rollback database changes via HTTP.
 * Used when PDF upload or other steps fail.
 */
export async function rollbackDatabase(
  peptideId: string,
  config: DatabaseWriteConfig
): Promise<void> {
  try {
    const response = await fetch(`${config.apiUrl}/api/internal/peptide/${peptideId}`, {
      method: 'DELETE',
      headers: {
        'X-Internal-Secret': config.apiSecret,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Rollback failed: ${response.status} ${error}`)
    }
  } catch (error) {
    console.error('Rollback failed:', error)
    // Don't throw - rollback is best-effort
  }
}
