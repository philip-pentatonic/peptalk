/**
 * Study queries for Cloudflare D1.
 */

import type { Study, SearchOptions } from '../types'

/**
 * Get study by ID.
 */
export async function getById(db: D1Database, id: string): Promise<Study | null> {
  const result = await db
    .prepare('SELECT * FROM studies WHERE id = ?')
    .bind(id)
    .first<Study>()

  if (!result) return null

  return parseStudy(result)
}

/**
 * Get all studies for a peptide.
 */
export async function getByPeptide(
  db: D1Database,
  peptideId: string
): Promise<Study[]> {
  const { results } = await db
    .prepare('SELECT * FROM studies WHERE peptide_id = ? ORDER BY year DESC, title ASC')
    .bind(peptideId)
    .all<Study>()

  return results.map(parseStudy)
}

/**
 * Full-text search studies.
 */
export async function search(
  db: D1Database,
  options: SearchOptions
): Promise<Study[]> {
  const { query, limit = 10, peptideId } = options

  let sql = `
    SELECT s.* FROM studies s
    JOIN studies_fts fts ON s.rowid = fts.rowid
    WHERE fts MATCH ?
  `
  const bindings: unknown[] = [query]

  if (peptideId) {
    sql += ' AND s.peptide_id = ?'
    bindings.push(peptideId)
  }

  sql += ' ORDER BY rank LIMIT ?'
  bindings.push(limit)

  const { results } = await db.prepare(sql).bind(...bindings).all<Study>()

  return results.map(parseStudy)
}

/**
 * Create new study.
 */
export async function create(db: D1Database, study: Omit<Study, 'created_at'>): Promise<Study> {
  await db
    .prepare(
      `INSERT INTO studies (
        id, peptide_id, type, title, study_type,
        pmid, abstract, authors, journal, year, doi,
        nct_id, status, phase, conditions, interventions,
        enrollment, start_date, completion_date, url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      study.id,
      study.peptide_id,
      study.type,
      study.title,
      study.study_type,
      study.pmid || null,
      study.abstract || null,
      study.authors ? JSON.stringify(study.authors) : null,
      study.journal || null,
      study.year || null,
      study.doi || null,
      study.nct_id || null,
      study.status || null,
      study.phase || null,
      study.conditions ? JSON.stringify(study.conditions) : null,
      study.interventions ? JSON.stringify(study.interventions) : null,
      study.enrollment || null,
      study.start_date || null,
      study.completion_date || null,
      study.url || null
    )
    .run()

  const created = await getById(db, study.id)
  if (!created) throw new Error('Failed to create study')

  return created
}

/**
 * Bulk insert studies (more efficient for large batches).
 */
export async function bulkInsert(
  db: D1Database,
  studies: Omit<Study, 'created_at'>[]
): Promise<void> {
  const statements = studies.map((study) =>
    db
      .prepare(
        `INSERT OR IGNORE INTO studies (
          id, peptide_id, type, title, study_type,
          pmid, abstract, authors, journal, year, doi,
          nct_id, status, phase, conditions, interventions,
          enrollment, start_date, completion_date, url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        study.id,
        study.peptide_id,
        study.type,
        study.title,
        study.study_type,
        study.pmid || null,
        study.abstract || null,
        study.authors ? JSON.stringify(study.authors) : null,
        study.journal || null,
        study.year || null,
        study.doi || null,
        study.nct_id || null,
        study.status || null,
        study.phase || null,
        study.conditions ? JSON.stringify(study.conditions) : null,
        study.interventions ? JSON.stringify(study.interventions) : null,
        study.enrollment || null,
        study.start_date || null,
        study.completion_date || null,
        study.url || null
      )
  )

  await db.batch(statements)
}

/**
 * Delete all studies for a peptide.
 */
export async function deleteByPeptide(
  db: D1Database,
  peptideId: string
): Promise<void> {
  await db.prepare('DELETE FROM studies WHERE peptide_id = ?').bind(peptideId).run()
}

/**
 * Parse study from database (handle JSON fields).
 */
function parseStudy(study: Study): Study {
  return {
    ...study,
    authors: study.authors ? JSON.parse(study.authors as unknown as string) : undefined,
    conditions: study.conditions ? JSON.parse(study.conditions as unknown as string) : undefined,
    interventions: study.interventions ? JSON.parse(study.interventions as unknown as string) : undefined,
  }
}
