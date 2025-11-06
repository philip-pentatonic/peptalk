/**
 * Internal API routes for research pipeline.
 * These endpoints are called by the Docker service to write data to D1.
 * Protected by X-Internal-Secret header.
 */

import { Hono } from 'hono'
import type { HonoEnv } from '../types'
import { peptides, studies } from '@peptalk/database'

const internal = new Hono<HonoEnv>()

// Middleware: Verify internal secret
internal.use('/*', async (c, next) => {
  const secret = c.req.header('X-Internal-Secret')
  const expectedSecret = c.env.INTERNAL_API_SECRET

  if (!expectedSecret) {
    return c.json({ error: 'Internal API not configured' }, 500)
  }

  if (secret !== expectedSecret) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  await next()
})

/**
 * Upsert peptide record
 * POST /api/internal/peptide
 */
internal.post('/peptide', async (c) => {
  try {
    const body = await c.req.json()
    const { id, slug, name, aliases, evidenceGrade, humanRctCount, animalCount, summaryHtml, version } = body

    // Check if peptide exists
    const existing = await peptides.getBySlug(c.env.DB, slug)

    if (existing) {
      // Update existing peptide
      await peptides.update(c.env.DB, slug, {
        name,
        aliases,
        evidence_grade: evidenceGrade,
        human_rct_count: humanRctCount,
        animal_count: animalCount,
        summary_html: summaryHtml,
        version,
      })

      return c.json({
        success: true,
        peptideId: existing.id,
        action: 'updated'
      })
    } else {
      // Insert new peptide
      const created = await peptides.create(c.env.DB, {
        slug,
        name,
        aliases,
        evidence_grade: evidenceGrade,
        human_rct_count: humanRctCount,
        animal_count: animalCount,
        summary_html: summaryHtml,
        last_updated: new Date().toISOString(),
        version: version || 1,
      })

      return c.json({
        success: true,
        peptideId: created.id,
        action: 'created'
      })
    }
  } catch (error) {
    console.error('Peptide upsert failed:', error)
    return c.json({
      error: 'Failed to upsert peptide',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

/**
 * Bulk insert studies
 * POST /api/internal/studies
 */
internal.post('/studies', async (c) => {
  try {
    const body = await c.req.json()
    const { studies: studyRecords } = body

    if (!Array.isArray(studyRecords) || studyRecords.length === 0) {
      return c.json({ error: 'Invalid studies array' }, 400)
    }

    // Bulk insert with deduplication
    await studies.bulkInsert(c.env.DB, studyRecords)

    return c.json({
      success: true,
      count: studyRecords.length
    })
  } catch (error) {
    console.error('Studies insert failed:', error)
    return c.json({
      error: 'Failed to insert studies',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

/**
 * Insert page sections
 * POST /api/internal/sections
 */
internal.post('/sections', async (c) => {
  try {
    const body = await c.req.json()
    const { peptideSlug, sections } = body

    if (!Array.isArray(sections) || sections.length === 0) {
      return c.json({ error: 'Invalid sections array' }, 400)
    }

    // Delete existing sections for this peptide
    await c.env.DB
      .prepare('DELETE FROM page_sections WHERE peptide_id = ?')
      .bind(peptideSlug)
      .run()

    // Insert new sections (id is AUTOINCREMENT, don't specify it)
    const statements = sections.map((section: any) =>
      c.env.DB
        .prepare(
          `INSERT INTO page_sections (peptide_id, title, content_html, plain_language_summary, section_order)
           VALUES (?, ?, ?, ?, ?)`
        )
        .bind(
          peptideSlug,
          section.title,
          section.contentHtml,
          section.plainLanguageSummary || null,
          section.order
        )
    )

    await c.env.DB.batch(statements)

    return c.json({
      success: true,
      count: sections.length
    })
  } catch (error) {
    console.error('Sections insert failed:', error)
    return c.json({
      error: 'Failed to insert sections',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

/**
 * Log to changelog
 * POST /api/internal/changelog
 */
internal.post('/changelog', async (c) => {
  try {
    const body = await c.req.json()
    const { peptideId, version, changeType, changeSummary } = body

    await c.env.DB
      .prepare(
        `INSERT INTO changelog (entity_type, entity_id, action, changes)
         VALUES (?, ?, ?, ?)`
      )
      .bind(
        'peptide',
        peptideId,
        changeType || 'publish',
        JSON.stringify({
          version,
          summary: changeSummary || `Published version ${version} via research pipeline`,
          changed_by: 'system'
        })
      )
      .run()

    return c.json({ success: true })
  } catch (error) {
    console.error('Changelog insert failed:', error)
    return c.json({
      error: 'Failed to log change',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

/**
 * Rollback peptide (delete all data)
 * DELETE /api/internal/peptide/:peptideId
 */
internal.delete('/peptide/:peptideId', async (c) => {
  try {
    const peptideId = c.req.param('peptideId')

    // Delete sections
    await c.env.DB
      .prepare('DELETE FROM page_sections WHERE peptide_id = ?')
      .bind(peptideId)
      .run()

    // Delete peptide
    await c.env.DB
      .prepare('DELETE FROM peptides WHERE id = ?')
      .bind(peptideId)
      .run()

    // Log rollback
    await c.env.DB
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

    return c.json({ success: true })
  } catch (error) {
    console.error('Rollback failed:', error)
    return c.json({
      error: 'Failed to rollback',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

export default internal
