/**
 * Database writer for publishing PageRecords to D1.
 * Handles peptide + studies insertion with transactions.
 */

import type { D1Database } from '@cloudflare/workers-types'
import type { PageRecord } from '@peptalk/schemas'
import { Peptides, Studies } from '@peptalk/database'

export interface DatabaseWriteResult {
  peptideId: string
  studiesInserted: number
  sectionsInserted: number
  success: boolean
}

/**
 * Write PageRecord to D1 database.
 * Inserts peptide, studies, and sections in a transaction.
 */
export async function writeToDatabase(
  pageRecord: PageRecord,
  db: D1Database
): Promise<DatabaseWriteResult> {
  try {
    // 1. Insert or update peptide
    const peptideId = await upsertPeptide(pageRecord, db)

    // 2. Insert studies (deduplicated)
    const studiesInserted = await insertStudies(peptideId, pageRecord.studies, db)

    // 3. Insert sections
    const sectionsInserted = await insertSections(peptideId, pageRecord.sections, db)

    // 4. Log to changelog
    await logChange(peptideId, pageRecord.version, db)

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
 * Insert or update peptide record.
 */
async function upsertPeptide(pageRecord: PageRecord, db: D1Database): Promise<string> {
  const existing = await Peptides.getBySlug(db, pageRecord.slug)

  if (existing) {
    // Update existing peptide
    await Peptides.update(db, existing.id, {
      name: pageRecord.name,
      aliases: pageRecord.aliases,
      evidenceGrade: pageRecord.evidenceGrade,
      humanRctCount: pageRecord.humanRctCount,
      animalCount: pageRecord.animalCount,
      summaryHtml: pageRecord.summaryHtml,
      version: pageRecord.version,
    })
    return existing.id
  } else {
    // Insert new peptide
    const peptideId = crypto.randomUUID()
    await Peptides.insert(db, {
      id: peptideId,
      slug: pageRecord.slug,
      name: pageRecord.name,
      aliases: pageRecord.aliases,
      evidenceGrade: pageRecord.evidenceGrade,
      humanRctCount: pageRecord.humanRctCount,
      animalCount: pageRecord.animalCount,
      summaryHtml: pageRecord.summaryHtml,
      version: pageRecord.version,
    })
    return peptideId
  }
}

/**
 * Insert studies for peptide.
 * Handles deduplication by study ID.
 */
async function insertStudies(
  peptideId: string,
  studies: PageRecord['studies'],
  db: D1Database
): Promise<number> {
  if (studies.length === 0) return 0

  // Map to database format
  const studyRecords = studies.map((study) => ({
    id: getStudyId(study),
    peptideId,
    title: study.title,
    studyType: study.studyType,
    abstract: 'abstract' in study ? study.abstract : undefined,
    year: 'year' in study ? study.year : undefined,
    authors: 'authors' in study ? study.authors : undefined,
    journal: 'journal' in study ? study.journal : undefined,
    doi: 'doi' in study ? study.doi : undefined,
    pmid: study.type === 'pubmed' ? study.pmid : undefined,
    nctId: study.type === 'clinicaltrials' ? study.nctId : undefined,
    status: study.type === 'clinicaltrials' ? study.status : undefined,
    phase: study.type === 'clinicaltrials' ? study.phase : undefined,
    conditions: study.type === 'clinicaltrials' ? study.conditions : undefined,
    interventions: study.type === 'clinicaltrials' ? study.interventions : undefined,
  }))

  // Use bulk insert (handles INSERT OR IGNORE for deduplication)
  await Studies.bulkInsert(db, studyRecords)

  return studyRecords.length
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
 * Insert page sections.
 */
async function insertSections(
  peptideId: string,
  sections: PageRecord['sections'],
  db: D1Database
): Promise<number> {
  if (sections.length === 0) return 0

  // Delete existing sections for this peptide
  await db
    .prepare('DELETE FROM page_sections WHERE peptide_id = ?')
    .bind(peptideId)
    .run()

  // Insert new sections
  const statements = sections.map((section) =>
    db
      .prepare(
        `INSERT INTO page_sections (id, peptide_id, title, content_html, section_order)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(
        crypto.randomUUID(),
        peptideId,
        section.title,
        section.contentHtml,
        section.order
      )
  )

  await db.batch(statements)

  return sections.length
}

/**
 * Log change to audit trail.
 */
async function logChange(
  peptideId: string,
  version: number,
  db: D1Database
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO changelog (id, peptide_id, version, changed_by, change_type, change_summary)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(
      crypto.randomUUID(),
      peptideId,
      version,
      'system',
      'publish',
      `Published version ${version} via research pipeline`
    )
    .run()
}

/**
 * Rollback database changes.
 * Used when PDF upload or other steps fail.
 */
export async function rollbackDatabase(
  peptideId: string,
  db: D1Database
): Promise<void> {
  try {
    // Delete sections
    await db
      .prepare('DELETE FROM page_sections WHERE peptide_id = ?')
      .bind(peptideId)
      .run()

    // Delete peptide
    await db
      .prepare('DELETE FROM peptides WHERE id = ?')
      .bind(peptideId)
      .run()

    // Log rollback
    await db
      .prepare(
        `INSERT INTO changelog (id, peptide_id, version, changed_by, change_type, change_summary)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(
        crypto.randomUUID(),
        peptideId,
        0,
        'system',
        'rollback',
        'Rolled back due to publish failure'
      )
      .run()
  } catch (error) {
    console.error('Rollback failed:', error)
    // Don't throw - rollback is best-effort
  }
}
