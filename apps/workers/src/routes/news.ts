/**
 * News Feed API Routes
 *
 * Endpoints for peptide news, updates, and trending information
 */

import { Hono } from 'hono'
import type { AppContext } from '../types'

const news = new Hono<AppContext>()

// ============================================================================
// News Feed
// ============================================================================

/**
 * Get news feed
 * GET /api/news?type=new_study&peptideSlug=bpc-157&limit=20&offset=0
 */
news.get('/', async (c) => {
  const type = c.req.query('type')
  const peptideSlug = c.req.query('peptideSlug')
  const userId = c.req.query('userId') // Optional: for filtering unread news
  const limit = parseInt(c.req.query('limit') || '20')
  const offset = parseInt(c.req.query('offset') || '0')

  try {
    const db = c.env.DB

    let query = 'SELECT * FROM peptide_news WHERE 1=1'
    const params: any[] = []

    if (type) {
      query += ' AND type = ?'
      params.push(type)
    }

    if (peptideSlug) {
      query += ' AND peptide_slug = ?'
      params.push(peptideSlug)
    }

    query += ' ORDER BY published_at DESC, created_at DESC LIMIT ? OFFSET ?'
    params.push(limit, offset)

    const result = await db.prepare(query).bind(...params).all()

    const newsItems = result.results || []

    // If userId provided, check which items have been read
    if (userId && newsItems.length > 0) {
      const newsIds = newsItems.map((item: any) => item.id)
      const readStatus = await db
        .prepare(
          `SELECT news_id FROM user_news_read
           WHERE user_id = ? AND news_id IN (${newsIds.map(() => '?').join(',')})`
        )
        .bind(userId, ...newsIds)
        .all()

      const readNewsIds = new Set(readStatus.results?.map((r: any) => r.news_id) || [])

      // Add 'read' flag to each news item
      return c.json({
        data: newsItems.map((item: any) => ({
          ...item,
          read: readNewsIds.has(item.id),
        })),
        pagination: {
          limit,
          offset,
          total: newsItems.length,
        },
      })
    }

    return c.json({
      data: newsItems,
      pagination: {
        limit,
        offset,
        total: newsItems.length,
      },
    })
  } catch (error) {
    console.error('Error fetching news:', error)
    return c.json({ error: 'Failed to fetch news' }, 500)
  }
})

/**
 * Get single news item
 * GET /api/news/:id
 */
news.get('/:id', async (c) => {
  const newsId = c.req.param('id')
  const userId = c.req.query('userId')

  try {
    const db = c.env.DB

    const newsItem = await db
      .prepare('SELECT * FROM peptide_news WHERE id = ?')
      .bind(newsId)
      .first()

    if (!newsItem) {
      return c.json({ error: 'News item not found' }, 404)
    }

    // Check if read by user
    let read = false
    if (userId) {
      const readRecord = await db
        .prepare('SELECT 1 FROM user_news_read WHERE user_id = ? AND news_id = ?')
        .bind(userId, newsId)
        .first()

      read = !!readRecord
    }

    return c.json({
      ...newsItem,
      read,
    })
  } catch (error) {
    console.error('Error fetching news item:', error)
    return c.json({ error: 'Failed to fetch news item' }, 500)
  }
})

/**
 * Mark news item as read
 * POST /api/news/:id/read
 */
news.post('/:id/read', async (c) => {
  const newsId = c.req.param('id')
  const userId = c.req.query('userId')

  if (!userId) {
    return c.json({ error: 'userId is required' }, 400)
  }

  try {
    const db = c.env.DB

    await db
      .prepare(
        `INSERT INTO user_news_read (user_id, news_id)
         VALUES (?, ?)
         ON CONFLICT(user_id, news_id) DO NOTHING`
      )
      .bind(userId, newsId)
      .run()

    return c.json({ success: true })
  } catch (error) {
    console.error('Error marking news as read:', error)
    return c.json({ error: 'Failed to mark news as read' }, 500)
  }
})

/**
 * Get news for user's saved peptides
 * GET /api/news/my-peptides?userId=xxx&limit=20&offset=0
 */
news.get('/my-peptides', async (c) => {
  const userId = c.req.query('userId')
  const limit = parseInt(c.req.query('limit') || '20')
  const offset = parseInt(c.req.query('offset') || '0')

  if (!userId) {
    return c.json({ error: 'userId is required' }, 400)
  }

  try {
    const db = c.env.DB

    // Get user's saved peptides
    const savedPeptides = await db
      .prepare('SELECT DISTINCT peptide_slug FROM user_peptides WHERE user_id = ?')
      .bind(userId)
      .all()

    const peptideSlugs = savedPeptides.results?.map((p: any) => p.peptide_slug) || []

    if (peptideSlugs.length === 0) {
      return c.json({
        data: [],
        pagination: { limit, offset, total: 0 },
      })
    }

    // Get news for these peptides
    const result = await db
      .prepare(
        `SELECT * FROM peptide_news
         WHERE peptide_slug IN (${peptideSlugs.map(() => '?').join(',')})
         ORDER BY published_at DESC, created_at DESC
         LIMIT ? OFFSET ?`
      )
      .bind(...peptideSlugs, limit, offset)
      .all()

    const newsItems = result.results || []

    // Check read status
    if (newsItems.length > 0) {
      const newsIds = newsItems.map((item: any) => item.id)
      const readStatus = await db
        .prepare(
          `SELECT news_id FROM user_news_read
           WHERE user_id = ? AND news_id IN (${newsIds.map(() => '?').join(',')})`
        )
        .bind(userId, ...newsIds)
        .all()

      const readNewsIds = new Set(readStatus.results?.map((r: any) => r.news_id) || [])

      return c.json({
        data: newsItems.map((item: any) => ({
          ...item,
          read: readNewsIds.has(item.id),
        })),
        pagination: {
          limit,
          offset,
          total: newsItems.length,
        },
      })
    }

    return c.json({
      data: newsItems,
      pagination: {
        limit,
        offset,
        total: newsItems.length,
      },
    })
  } catch (error) {
    console.error('Error fetching news for user peptides:', error)
    return c.json({ error: 'Failed to fetch news for user peptides' }, 500)
  }
})

// ============================================================================
// Trending Peptides
// ============================================================================

/**
 * Get trending peptides
 * GET /api/news/trending?period=7d&limit=10
 */
news.get('/trending', async (c) => {
  const period = c.req.query('period') || '7d' // 7d, 30d
  const limit = parseInt(c.req.query('limit') || '10')

  try {
    const db = c.env.DB

    // For now, use simple metrics-based trending
    // In production, you'd calculate trending score based on multiple factors
    const result = await db
      .prepare(
        `SELECT
           pm.peptide_slug,
           p.name,
           pm.view_count,
           pm.save_count,
           pm.search_count,
           (pm.save_count * 3 + pm.view_count + pm.search_count * 2) as trending_score
         FROM peptide_metrics pm
         JOIN peptides p ON pm.peptide_slug = p.slug
         ORDER BY trending_score DESC
         LIMIT ?`
      )
      .bind(limit)
      .all()

    return c.json({
      data: result.results || [],
      period,
    })
  } catch (error) {
    console.error('Error fetching trending peptides:', error)
    return c.json({ error: 'Failed to fetch trending peptides' }, 500)
  }
})

/**
 * Get latest news summary (for homepage/dashboard)
 * GET /api/news/latest?limit=5
 */
news.get('/latest', async (c) => {
  const limit = parseInt(c.req.query('limit') || '5')

  try {
    const db = c.env.DB

    const result = await db
      .prepare(
        `SELECT
           n.*,
           p.name as peptide_name
         FROM peptide_news n
         LEFT JOIN peptides p ON n.peptide_slug = p.slug
         ORDER BY n.published_at DESC
         LIMIT ?`
      )
      .bind(limit)
      .all()

    return c.json({
      data: result.results || [],
    })
  } catch (error) {
    console.error('Error fetching latest news:', error)
    return c.json({ error: 'Failed to fetch latest news' }, 500)
  }
})

/**
 * Track peptide view (for metrics)
 * POST /api/news/track/view/:slug
 */
news.post('/track/view/:slug', async (c) => {
  const peptideSlug = c.req.param('slug')

  try {
    const db = c.env.DB

    await db
      .prepare(
        `INSERT INTO peptide_metrics (peptide_slug, view_count, last_viewed, updated_at)
         VALUES (?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT(peptide_slug) DO UPDATE SET
           view_count = view_count + 1,
           last_viewed = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP`
      )
      .bind(peptideSlug)
      .run()

    return c.json({ success: true })
  } catch (error) {
    console.error('Error tracking peptide view:', error)
    return c.json({ error: 'Failed to track view' }, 500)
  }
})

/**
 * Track peptide search (for metrics)
 * POST /api/news/track/search/:slug
 */
news.post('/track/search/:slug', async (c) => {
  const peptideSlug = c.req.param('slug')

  try {
    const db = c.env.DB

    await db
      .prepare(
        `INSERT INTO peptide_metrics (peptide_slug, search_count, last_searched, updated_at)
         VALUES (?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT(peptide_slug) DO UPDATE SET
           search_count = search_count + 1,
           last_searched = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP`
      )
      .bind(peptideSlug)
      .run()

    return c.json({ success: true })
  } catch (error) {
    console.error('Error tracking peptide search:', error)
    return c.json({ error: 'Failed to track search' }, 500)
  }
})

export default news
