/**
 * User Dashboard API Routes
 *
 * Endpoints for personal peptide tracking, journal entries, and alerts
 */

import { Hono } from 'hono'
import type { AppContext } from '../types'
import { z } from 'zod'

const dashboard = new Hono<AppContext>()

// ============================================================================
// Validation Schemas
// ============================================================================

const SavePeptideSchema = z.object({
  peptideSlug: z.string(),
  status: z.enum(['saved', 'using', 'tried']),
  notes: z.string().optional(),
  dosage: z.string().optional(),
  frequency: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

const JournalEntrySchema = z.object({
  peptideSlug: z.string().optional(),
  title: z.string(),
  content: z.string(),
})

const AlertPreferenceSchema = z.object({
  peptideSlug: z.string(),
  alertType: z.enum(['new_study', 'clinical_trial', 'fda_news', 'all']),
  enabled: z.boolean(),
})

// ============================================================================
// User Peptides (Saved/Using/Tried)
// ============================================================================

/**
 * Get all peptides for a user
 * GET /api/dashboard/peptides?userId=xxx&status=saved
 */
dashboard.get('/peptides', async (c) => {
  const userId = c.req.query('userId')
  const status = c.req.query('status')

  if (!userId) {
    return c.json({ error: 'userId is required' }, 400)
  }

  try {
    const db = c.env.DB

    let query = 'SELECT * FROM user_peptides WHERE user_id = ?'
    const params: any[] = [userId]

    if (status) {
      query += ' AND status = ?'
      params.push(status)
    }

    query += ' ORDER BY updated_at DESC'

    const result = await db.prepare(query).bind(...params).all()

    return c.json({
      data: result.results || [],
      count: result.results?.length || 0,
    })
  } catch (error) {
    console.error('Error fetching user peptides:', error)
    return c.json({ error: 'Failed to fetch user peptides' }, 500)
  }
})

/**
 * Save/update a peptide for a user
 * POST /api/dashboard/peptides
 */
dashboard.post('/peptides', async (c) => {
  const userId = c.req.query('userId')

  if (!userId) {
    return c.json({ error: 'userId is required' }, 400)
  }

  try {
    const body = await c.req.json()
    const data = SavePeptideSchema.parse(body)

    const db = c.env.DB

    // Check if peptide exists
    const peptideExists = await db
      .prepare('SELECT slug FROM peptides WHERE slug = ?')
      .bind(data.peptideSlug)
      .first()

    if (!peptideExists) {
      return c.json({ error: 'Peptide not found' }, 404)
    }

    // Upsert user peptide
    await db
      .prepare(
        `INSERT INTO user_peptides (user_id, peptide_slug, status, notes, dosage, frequency, start_date, end_date, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(user_id, peptide_slug) DO UPDATE SET
           status = excluded.status,
           notes = excluded.notes,
           dosage = excluded.dosage,
           frequency = excluded.frequency,
           start_date = excluded.start_date,
           end_date = excluded.end_date,
           updated_at = CURRENT_TIMESTAMP`
      )
      .bind(
        userId,
        data.peptideSlug,
        data.status,
        data.notes || null,
        data.dosage || null,
        data.frequency || null,
        data.startDate || null,
        data.endDate || null
      )
      .run()

    // Update peptide metrics (save count)
    await db
      .prepare(
        `INSERT INTO peptide_metrics (peptide_slug, save_count, updated_at)
         VALUES (?, 1, CURRENT_TIMESTAMP)
         ON CONFLICT(peptide_slug) DO UPDATE SET
           save_count = save_count + 1,
           updated_at = CURRENT_TIMESTAMP`
      )
      .bind(data.peptideSlug)
      .run()

    return c.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid request data', details: error.errors }, 400)
    }
    console.error('Error saving user peptide:', error)
    return c.json({ error: 'Failed to save peptide' }, 500)
  }
})

/**
 * Remove a peptide from user's list
 * DELETE /api/dashboard/peptides/:slug
 */
dashboard.delete('/peptides/:slug', async (c) => {
  const userId = c.req.query('userId')
  const peptideSlug = c.req.param('slug')

  if (!userId) {
    return c.json({ error: 'userId is required' }, 400)
  }

  try {
    const db = c.env.DB

    await db
      .prepare('DELETE FROM user_peptides WHERE user_id = ? AND peptide_slug = ?')
      .bind(userId, peptideSlug)
      .run()

    return c.json({ success: true })
  } catch (error) {
    console.error('Error removing user peptide:', error)
    return c.json({ error: 'Failed to remove peptide' }, 500)
  }
})

// ============================================================================
// Journal Entries
// ============================================================================

/**
 * Get journal entries for a user
 * GET /api/dashboard/journal?userId=xxx&peptideSlug=yyy
 */
dashboard.get('/journal', async (c) => {
  const userId = c.req.query('userId')
  const peptideSlug = c.req.query('peptideSlug')
  const limit = parseInt(c.req.query('limit') || '50')
  const offset = parseInt(c.req.query('offset') || '0')

  if (!userId) {
    return c.json({ error: 'userId is required' }, 400)
  }

  try {
    const db = c.env.DB

    let query = 'SELECT * FROM user_journal WHERE user_id = ?'
    const params: any[] = [userId]

    if (peptideSlug) {
      query += ' AND peptide_slug = ?'
      params.push(peptideSlug)
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
    params.push(limit, offset)

    const result = await db.prepare(query).bind(...params).all()

    return c.json({
      data: result.results || [],
      count: result.results?.length || 0,
    })
  } catch (error) {
    console.error('Error fetching journal entries:', error)
    return c.json({ error: 'Failed to fetch journal entries' }, 500)
  }
})

/**
 * Create a journal entry
 * POST /api/dashboard/journal
 */
dashboard.post('/journal', async (c) => {
  const userId = c.req.query('userId')

  if (!userId) {
    return c.json({ error: 'userId is required' }, 400)
  }

  try {
    const body = await c.req.json()
    const data = JournalEntrySchema.parse(body)

    const db = c.env.DB

    // Generate a simple ID using timestamp + random
    const id = `journal-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`

    await db
      .prepare(
        `INSERT INTO user_journal (id, user_id, peptide_slug, title, content)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(id, userId, data.peptideSlug || null, data.title, data.content)
      .run()

    return c.json({ success: true, id })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid request data', details: error.errors }, 400)
    }
    console.error('Error creating journal entry:', error)
    return c.json({ error: 'Failed to create journal entry' }, 500)
  }
})

/**
 * Update a journal entry
 * PUT /api/dashboard/journal/:id
 */
dashboard.put('/journal/:id', async (c) => {
  const userId = c.req.query('userId')
  const entryId = c.req.param('id')

  if (!userId) {
    return c.json({ error: 'userId is required' }, 400)
  }

  try {
    const body = await c.req.json()
    const data = JournalEntrySchema.parse(body)

    const db = c.env.DB

    await db
      .prepare(
        `UPDATE user_journal
         SET title = ?, content = ?, peptide_slug = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND user_id = ?`
      )
      .bind(data.title, data.content, data.peptideSlug || null, entryId, userId)
      .run()

    return c.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid request data', details: error.errors }, 400)
    }
    console.error('Error updating journal entry:', error)
    return c.json({ error: 'Failed to update journal entry' }, 500)
  }
})

/**
 * Delete a journal entry
 * DELETE /api/dashboard/journal/:id
 */
dashboard.delete('/journal/:id', async (c) => {
  const userId = c.req.query('userId')
  const entryId = c.req.param('id')

  if (!userId) {
    return c.json({ error: 'userId is required' }, 400)
  }

  try {
    const db = c.env.DB

    await db
      .prepare('DELETE FROM user_journal WHERE id = ? AND user_id = ?')
      .bind(entryId, userId)
      .run()

    return c.json({ success: true })
  } catch (error) {
    console.error('Error deleting journal entry:', error)
    return c.json({ error: 'Failed to delete journal entry' }, 500)
  }
})

// ============================================================================
// Alert Preferences
// ============================================================================

/**
 * Get alert preferences for a user
 * GET /api/dashboard/alerts?userId=xxx
 */
dashboard.get('/alerts', async (c) => {
  const userId = c.req.query('userId')

  if (!userId) {
    return c.json({ error: 'userId is required' }, 400)
  }

  try {
    const db = c.env.DB

    const result = await db
      .prepare('SELECT * FROM user_alerts WHERE user_id = ? ORDER BY created_at DESC')
      .bind(userId)
      .all()

    return c.json({
      data: result.results || [],
      count: result.results?.length || 0,
    })
  } catch (error) {
    console.error('Error fetching alert preferences:', error)
    return c.json({ error: 'Failed to fetch alert preferences' }, 500)
  }
})

/**
 * Update alert preference
 * POST /api/dashboard/alerts
 */
dashboard.post('/alerts', async (c) => {
  const userId = c.req.query('userId')

  if (!userId) {
    return c.json({ error: 'userId is required' }, 400)
  }

  try {
    const body = await c.req.json()
    const data = AlertPreferenceSchema.parse(body)

    const db = c.env.DB

    // Upsert alert preference
    await db
      .prepare(
        `INSERT INTO user_alerts (user_id, peptide_slug, alert_type, enabled)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(user_id, peptide_slug, alert_type) DO UPDATE SET
           enabled = excluded.enabled`
      )
      .bind(userId, data.peptideSlug, data.alertType, data.enabled ? 1 : 0)
      .run()

    return c.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid request data', details: error.errors }, 400)
    }
    console.error('Error updating alert preference:', error)
    return c.json({ error: 'Failed to update alert preference' }, 500)
  }
})

// ============================================================================
// Dashboard Summary
// ============================================================================

/**
 * Get dashboard summary for a user
 * GET /api/dashboard/summary?userId=xxx
 */
dashboard.get('/summary', async (c) => {
  const userId = c.req.query('userId')

  if (!userId) {
    return c.json({ error: 'userId is required' }, 400)
  }

  try {
    const db = c.env.DB

    // Get counts for each status
    const savedCount = await db
      .prepare("SELECT COUNT(*) as count FROM user_peptides WHERE user_id = ? AND status = 'saved'")
      .bind(userId)
      .first<{ count: number }>()

    const usingCount = await db
      .prepare("SELECT COUNT(*) as count FROM user_peptides WHERE user_id = ? AND status = 'using'")
      .bind(userId)
      .first<{ count: number }>()

    const triedCount = await db
      .prepare("SELECT COUNT(*) as count FROM user_peptides WHERE user_id = ? AND status = 'tried'")
      .bind(userId)
      .first<{ count: number }>()

    const journalCount = await db
      .prepare('SELECT COUNT(*) as count FROM user_journal WHERE user_id = ?')
      .bind(userId)
      .first<{ count: number }>()

    const alertCount = await db
      .prepare('SELECT COUNT(*) as count FROM user_alerts WHERE user_id = ? AND enabled = 1')
      .bind(userId)
      .first<{ count: number }>()

    return c.json({
      saved: savedCount?.count || 0,
      using: usingCount?.count || 0,
      tried: triedCount?.count || 0,
      journalEntries: journalCount?.count || 0,
      activeAlerts: alertCount?.count || 0,
    })
  } catch (error) {
    console.error('Error fetching dashboard summary:', error)
    return c.json({ error: 'Failed to fetch dashboard summary' }, 500)
  }
})

export default dashboard
