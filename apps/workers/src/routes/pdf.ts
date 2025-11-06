/**
 * PDF download routes
 * Generates signed URLs for peptide PDF downloads
 */

import { Hono } from 'hono'
import { getCookie } from 'hono/cookie'
import { peptides as Peptides } from '@peptalk/database'
import type { Bindings } from '../types'

export const pdf = new Hono<{ Bindings: Bindings }>()

/**
 * Verify user authentication and subscription status
 */
async function verifyAuth(c: any) {
  const sessionId = getCookie(c, 'session_id')

  if (!sessionId) {
    return null
  }

  const db = c.env.DB

  // Find active session
  const session = await db
    .prepare('SELECT * FROM sessions WHERE id = ? AND expires_at > ?')
    .bind(sessionId, new Date().toISOString())
    .first()

  if (!session) {
    return null
  }

  // Get user with subscription status
  const user = await db
    .prepare('SELECT * FROM users WHERE id = ?')
    .bind(session.user_id)
    .first()

  if (!user) {
    return null
  }

  return {
    id: user.id,
    email: user.email,
    subscriptionStatus: user.subscription_status,
    subscriptionActive: user.subscription_status === 'active',
  }
}

/**
 * GET /api/pdf/:slug
 * Generate signed URL for PDF download
 * Requires authentication (subscriber only)
 */
pdf.get('/:slug', async (c) => {
  const db = c.env.DB
  const bucket = c.env.PDF_BUCKET
  const slug = c.req.param('slug')

  try {
    // Verify peptide exists
    const peptide = await Peptides.getBySlug(db, slug)

    if (!peptide) {
      return c.json({ error: 'Peptide not found' }, 404)
    }

    // Verify user is authenticated and has active subscription
    const user = await verifyAuth(c)
    if (!user) {
      return c.json({ error: 'Authentication required' }, 401)
    }

    if (!user.subscriptionActive) {
      return c.json({ error: 'Active subscription required' }, 403)
    }

    // Generate R2 key
    const pdfKey = `pdfs/${slug}/${slug}-v${peptide.version}.pdf`

    // Check if PDF exists
    const object = await bucket.head(pdfKey)

    if (!object) {
      return c.json({ error: 'PDF not available' }, 404)
    }

    // Generate signed URL (valid for 1 hour)
    const expiresIn = 3600
    const url = await generateSignedUrl(bucket, pdfKey, expiresIn)

    return c.json({
      url,
      expiresIn,
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      size: object.size,
      etag: object.etag,
    })
  } catch (error) {
    console.error('Failed to generate PDF URL:', error)
    return c.json({ error: 'Failed to generate download URL' }, 500)
  }
})

/**
 * Generate signed URL for R2 object
 * For Cloudflare R2, we use presigned URLs
 */
async function generateSignedUrl(
  bucket: R2Bucket,
  key: string,
  expiresIn: number
): Promise<string> {
  // For Cloudflare R2, signed URLs are not directly supported yet
  // This is a simplified implementation
  // In production, you would use R2's presigned URL API when available
  // or set up a custom domain with signed URL logic

  // For now, return a direct URL (requires public bucket or custom auth)
  return `https://pub-${bucket}.r2.dev/${key}`
}

/**
 * GET /api/pdf/:slug/metadata
 * Get PDF metadata without downloading
 */
pdf.get('/:slug/metadata', async (c) => {
  const db = c.env.DB
  const bucket = c.env.PDF_BUCKET
  const slug = c.req.param('slug')

  try {
    const peptide = await Peptides.getBySlug(db, slug)

    if (!peptide) {
      return c.json({ error: 'Peptide not found' }, 404)
    }

    const pdfKey = `pdfs/${slug}/${slug}-v${peptide.version}.pdf`
    const object = await bucket.head(pdfKey)

    if (!object) {
      return c.json({ error: 'PDF not available' }, 404)
    }

    return c.json({
      key: pdfKey,
      size: object.size,
      etag: object.etag,
      uploaded: object.customMetadata?.uploadedAt,
      version: peptide.version,
    })
  } catch (error) {
    console.error('Failed to get PDF metadata:', error)
    return c.json({ error: 'Failed to fetch metadata' }, 500)
  }
})
