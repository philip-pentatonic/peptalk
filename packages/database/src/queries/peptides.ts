/**
 * Peptide queries for Cloudflare D1.
 */

import type { EvidenceGrade } from '@peptalk/schemas'
import type { Peptide, ListOptions, PaginatedResult } from '../types'

/**
 * Get peptide by slug.
 */
export async function getBySlug(
  db: D1Database,
  slug: string
): Promise<Peptide | null> {
  const result = await db
    .prepare('SELECT * FROM peptides WHERE slug = ?')
    .bind(slug)
    .first<Peptide>()

  if (!result) return null

  // Parse JSON fields
  return {
    ...result,
    aliases: JSON.parse(result.aliases as unknown as string),
  }
}

/**
 * List peptides with pagination and filtering.
 */
export async function list(
  db: D1Database,
  options: ListOptions = {}
): Promise<PaginatedResult<Peptide>> {
  const {
    limit = 20,
    offset = 0,
    search,
    evidenceGrade,
    orderBy = 'name ASC',
  } = options

  let query = 'SELECT * FROM peptides WHERE 1=1'
  const bindings: unknown[] = []

  // Apply filters
  if (search) {
    query += ' AND (name LIKE ? OR aliases LIKE ?)'
    const searchPattern = `%${search}%`
    bindings.push(searchPattern, searchPattern)
  }

  if (evidenceGrade) {
    query += ' AND evidence_grade = ?'
    bindings.push(evidenceGrade)
  }

  // Add ordering
  query += ` ORDER BY ${orderBy}`

  // Add pagination
  query += ' LIMIT ? OFFSET ?'
  bindings.push(limit, offset)

  // Execute query
  const { results } = await db.prepare(query).bind(...bindings).all<Peptide>()

  // Get total count
  let countQuery = 'SELECT COUNT(*) as count FROM peptides WHERE 1=1'
  const countBindings: unknown[] = []

  if (search) {
    countQuery += ' AND (name LIKE ? OR aliases LIKE ?)'
    const searchPattern = `%${search}%`
    countBindings.push(searchPattern, searchPattern)
  }

  if (evidenceGrade) {
    countQuery += ' AND evidence_grade = ?'
    countBindings.push(evidenceGrade)
  }

  const countResult = await db
    .prepare(countQuery)
    .bind(...countBindings)
    .first<{ count: number }>()

  const total = countResult?.count || 0

  // Parse JSON fields
  const data = results.map((p) => ({
    ...p,
    aliases: JSON.parse(p.aliases as unknown as string),
  }))

  return {
    data,
    total,
    page: Math.floor(offset / limit) + 1,
    pages: Math.ceil(total / limit),
  }
}

/**
 * Create new peptide.
 */
export async function create(
  db: D1Database,
  peptide: Omit<Peptide, 'id' | 'created_at'>
): Promise<Peptide> {
  const id = crypto.randomUUID()

  await db
    .prepare(
      `INSERT INTO peptides (
        id, slug, name, aliases, evidence_grade,
        human_rct_count, animal_count, summary_html,
        last_updated, version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      peptide.slug,
      peptide.name,
      JSON.stringify(peptide.aliases),
      peptide.evidence_grade,
      peptide.human_rct_count,
      peptide.animal_count,
      peptide.summary_html,
      peptide.last_updated,
      peptide.version
    )
    .run()

  const created = await getBySlug(db, peptide.slug)
  if (!created) throw new Error('Failed to create peptide')

  return created
}

/**
 * Update existing peptide.
 */
export async function update(
  db: D1Database,
  slug: string,
  updates: Partial<Omit<Peptide, 'id' | 'slug' | 'created_at'>>
): Promise<Peptide> {
  const fields: string[] = []
  const bindings: unknown[] = []

  if (updates.name !== undefined) {
    fields.push('name = ?')
    bindings.push(updates.name)
  }

  if (updates.aliases !== undefined) {
    fields.push('aliases = ?')
    bindings.push(JSON.stringify(updates.aliases))
  }

  if (updates.evidence_grade !== undefined) {
    fields.push('evidence_grade = ?')
    bindings.push(updates.evidence_grade)
  }

  if (updates.human_rct_count !== undefined) {
    fields.push('human_rct_count = ?')
    bindings.push(updates.human_rct_count)
  }

  if (updates.animal_count !== undefined) {
    fields.push('animal_count = ?')
    bindings.push(updates.animal_count)
  }

  if (updates.summary_html !== undefined) {
    fields.push('summary_html = ?')
    bindings.push(updates.summary_html)
  }

  if (updates.version !== undefined) {
    fields.push('version = ?')
    bindings.push(updates.version)
  }

  // Always update last_updated
  fields.push('last_updated = datetime("now")')

  if (fields.length === 1) {
    // Only last_updated, no other changes
    throw new Error('No fields to update')
  }

  bindings.push(slug) // For WHERE clause

  const query = `UPDATE peptides SET ${fields.join(', ')} WHERE slug = ?`

  await db.prepare(query).bind(...bindings).run()

  const updated = await getBySlug(db, slug)
  if (!updated) throw new Error('Peptide not found after update')

  return updated
}

/**
 * Delete peptide.
 */
export async function deletePeptide(db: D1Database, slug: string): Promise<void> {
  await db.prepare('DELETE FROM peptides WHERE slug = ?').bind(slug).run()
}

/**
 * Get peptide count by evidence grade.
 */
export async function countByGrade(
  db: D1Database
): Promise<Record<EvidenceGrade, number>> {
  const { results } = await db
    .prepare(
      'SELECT evidence_grade, COUNT(*) as count FROM peptides GROUP BY evidence_grade'
    )
    .all<{ evidence_grade: EvidenceGrade; count: number }>()

  const counts: Record<EvidenceGrade, number> = {
    very_low: 0,
    low: 0,
    moderate: 0,
    high: 0,
  }

  for (const row of results) {
    counts[row.evidence_grade] = row.count
  }

  return counts
}
