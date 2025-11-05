/**
 * Peptides API routes
 * Handles listing, searching, and retrieving peptide data
 */

import { Hono } from 'hono'
import { Peptides, Studies } from '@peptalk/database'
import type { Bindings, SearchParams } from '../types'

export const peptides = new Hono<{ Bindings: Bindings }>()

/**
 * GET /api/peptides
 * List peptides with pagination, search, and filtering
 */
peptides.get('/', async (c) => {
  const db = c.env.DB

  // Parse query parameters
  const search = c.req.query('search')
  const evidenceGrade = c.req.query('evidenceGrade')
  const page = parseInt(c.req.query('page') || '1')
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100)
  const offset = (page - 1) * limit

  try {
    const result = await Peptides.list(db, {
      search,
      evidenceGrade: evidenceGrade as any,
      limit,
      offset,
    })

    return c.json({
      data: result.data,
      pagination: {
        page: result.page,
        pages: result.pages,
        total: result.total,
        limit,
      },
    })
  } catch (error) {
    console.error('Failed to list peptides:', error)
    return c.json({ error: 'Failed to fetch peptides' }, 500)
  }
})

/**
 * GET /api/peptides/:slug
 * Get detailed peptide information
 */
peptides.get('/:slug', async (c) => {
  const db = c.env.DB
  const slug = c.req.param('slug')

  try {
    // Get peptide
    const peptide = await Peptides.getBySlug(db, slug)

    if (!peptide) {
      return c.json({ error: 'Peptide not found' }, 404)
    }

    // Get sections
    const sections = await db
      .prepare('SELECT title, content_html, section_order FROM page_sections WHERE peptide_id = ? ORDER BY section_order ASC')
      .bind(peptide.id)
      .all()

    // Get studies
    const studies = await Studies.listByPeptide(db, peptide.id, { limit: 100 })

    // Get legal notes
    const legalNotesResult = await db
      .prepare('SELECT note FROM legal_notes WHERE peptide_id = ? ORDER BY id ASC')
      .bind(peptide.id)
      .all()

    const legalNotes = legalNotesResult.results.map((row: any) => row.note)

    return c.json({
      slug: peptide.slug,
      name: peptide.name,
      aliases: peptide.aliases,
      evidenceGrade: peptide.evidenceGrade,
      summaryHtml: peptide.summaryHtml,
      sections: sections.results.map((s: any) => ({
        title: s.title,
        contentHtml: s.content_html,
        order: s.section_order,
      })),
      studies: studies.map((s) => ({
        type: s.type,
        title: s.title,
        studyType: s.studyType,
        pmid: s.pmid,
        nctId: s.nctId,
      })),
      humanRctCount: peptide.humanRctCount,
      animalCount: peptide.animalCount,
      legalNotes,
      lastUpdated: peptide.lastUpdated,
      version: peptide.version,
    })
  } catch (error) {
    console.error('Failed to get peptide:', error)
    return c.json({ error: 'Failed to fetch peptide' }, 500)
  }
})

/**
 * GET /api/peptides/:slug/studies
 * Get all studies for a peptide
 */
peptides.get('/:slug/studies', async (c) => {
  const db = c.env.DB
  const slug = c.req.param('slug')

  try {
    const peptide = await Peptides.getBySlug(db, slug)

    if (!peptide) {
      return c.json({ error: 'Peptide not found' }, 404)
    }

    const studies = await Studies.listByPeptide(db, peptide.id, { limit: 1000 })

    return c.json({ studies })
  } catch (error) {
    console.error('Failed to get studies:', error)
    return c.json({ error: 'Failed to fetch studies' }, 500)
  }
})

/**
 * GET /api/peptides/search
 * Full-text search across peptides using FTS5
 */
peptides.get('/search', async (c) => {
  const db = c.env.DB
  const query = c.req.query('q')

  if (!query) {
    return c.json({ error: 'Query parameter "q" is required' }, 400)
  }

  try {
    const results = await Studies.search(db, {
      query,
      limit: 50,
    })

    // Get unique peptide IDs
    const peptideIds = [...new Set(results.map((s) => s.peptideId))]

    // Fetch peptide details
    const peptides = await Promise.all(
      peptideIds.slice(0, 20).map((id) => Peptides.getById(db, id))
    )

    return c.json({
      results: peptides.filter((p) => p !== null),
      total: peptideIds.length,
    })
  } catch (error) {
    console.error('Search failed:', error)
    return c.json({ error: 'Search failed' }, 500)
  }
})
