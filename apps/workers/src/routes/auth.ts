/**
 * Authentication routes with magic link
 */

import { Hono } from 'hono'
import { setCookie, deleteCookie, getCookie } from 'hono/cookie'
import type { Bindings } from '../types'

export const auth = new Hono<{ Bindings: Bindings }>()

// Generate a random token
function generateToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * POST /api/auth/login
 * Send magic link to user's email
 */
auth.post('/login', async (c) => {
  const { email } = await c.req.json()

  if (!email || !email.includes('@')) {
    return c.json({ error: 'Valid email is required' }, 400)
  }

  try {
    const db = c.env.DB
    const resendApiKey = c.env.RESEND_API_KEY

    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured')
      return c.json({ error: 'Email service not configured' }, 500)
    }

    // Check if user exists, create if not
    let user = await db
      .prepare('SELECT * FROM users WHERE email = ?')
      .bind(email)
      .first()

    if (!user) {
      // Create new user
      const userId = crypto.randomUUID()
      await db
        .prepare(
          'INSERT INTO users (id, email, subscription_status, created_at) VALUES (?, ?, ?, ?)'
        )
        .bind(userId, email, 'inactive', new Date().toISOString())
        .run()

      user = { id: userId, email }
    }

    // Generate magic link token
    const token = generateToken()
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString() // 60 minutes

    // Store token in database
    await db
      .prepare(
        'INSERT INTO magic_links (token, user_id, email, expires_at, created_at) VALUES (?, ?, ?, ?, ?)'
      )
      .bind(token, user.id, email, expiresAt, new Date().toISOString())
      .run()

    // Build magic link URL
    const baseUrl = c.req.header('origin') || 'http://localhost:3003'
    const magicLink = `${baseUrl}/auth/verify?token=${token}`

    // Send email via Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'PepTalk <onboarding@resend.dev>',
        to: [email],
        subject: 'Sign in to PepTalk',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Sign in to PepTalk</h2>
            <p>Click the link below to sign in to your account:</p>
            <p style="margin: 30px 0;">
              <a href="${magicLink}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Sign in to PepTalk
              </a>
            </p>
            <p style="color: #666; font-size: 14px;">
              This link will expire in 60 minutes. If you didn't request this email, you can safely ignore it.
            </p>
            <p style="color: #666; font-size: 14px;">
              Or copy and paste this URL into your browser:<br>
              <a href="${magicLink}">${magicLink}</a>
            </p>
          </div>
        `,
      }),
    })

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json()
      console.error('Resend API error:', errorData)
      throw new Error('Failed to send email')
    }

    return c.json({
      message: 'Magic link sent to your email',
      email,
    })
  } catch (error) {
    console.error('Login failed:', error)
    return c.json({ error: 'Failed to send magic link' }, 500)
  }
})

/**
 * GET /api/auth/verify
 * Verify magic link token and create session
 */
auth.get('/verify', async (c) => {
  const token = c.req.query('token')

  if (!token) {
    return c.json({ error: 'Token is required' }, 400)
  }

  try {
    const db = c.env.DB

    // Find magic link
    const magicLink = await db
      .prepare('SELECT * FROM magic_links WHERE token = ? AND used_at IS NULL')
      .bind(token)
      .first()

    if (!magicLink) {
      return c.json({ error: 'Invalid or already used token' }, 401)
    }

    // Check if expired
    if (new Date(magicLink.expires_at) < new Date()) {
      return c.json({ error: 'Token has expired' }, 401)
    }

    // Mark token as used
    await db
      .prepare('UPDATE magic_links SET used_at = ? WHERE token = ?')
      .bind(new Date().toISOString(), token)
      .run()

    // Get user
    const user = await db
      .prepare('SELECT * FROM users WHERE id = ?')
      .bind(magicLink.user_id)
      .first()

    if (!user) {
      return c.json({ error: 'User not found' }, 404)
    }

    // Create session (simple cookie-based for now)
    const sessionId = crypto.randomUUID()
    const sessionExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    // Store session
    await db
      .prepare(
        'INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)'
      )
      .bind(sessionId, user.id, sessionExpiry.toISOString(), new Date().toISOString())
      .run()

    // Set session cookie
    // For cross-origin cookies to work (API on workers.dev, frontend on localhost),
    // we need secure: false and sameSite: 'None' in development
    const isDev = c.req.header('origin')?.includes('localhost')
    setCookie(c, 'session_id', sessionId, {
      httpOnly: true,
      secure: !isDev, // false for localhost, true for production
      sameSite: isDev ? 'None' : 'Lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    })

    return c.json({
      message: 'Authentication successful',
      user: {
        id: user.id,
        email: user.email,
        subscriptionStatus: user.subscription_status,
        subscriptionPlan: user.subscription_plan,
        createdAt: user.created_at,
      },
    })
  } catch (error) {
    console.error('Verification failed:', error)
    return c.json({ error: 'Invalid or expired token' }, 401)
  }
})

/**
 * GET /api/auth/me
 * Get current user session
 */
auth.get('/me', async (c) => {
  try {
    const sessionId = getCookie(c, 'session_id')

    if (!sessionId) {
      return c.json({ error: 'Not authenticated' }, 401)
    }

    const db = c.env.DB

    // Find session
    const session = await db
      .prepare('SELECT * FROM sessions WHERE id = ? AND expires_at > ?')
      .bind(sessionId, new Date().toISOString())
      .first()

    if (!session) {
      return c.json({ error: 'Session expired' }, 401)
    }

    // Get user
    const user = await db
      .prepare('SELECT * FROM users WHERE id = ?')
      .bind(session.user_id)
      .first()

    if (!user) {
      return c.json({ error: 'User not found' }, 404)
    }

    return c.json({
      user: {
        id: user.id,
        email: user.email,
        subscriptionStatus: user.subscription_status,
        subscriptionPlan: user.subscription_plan,
        createdAt: user.created_at,
      },
    })
  } catch (error) {
    console.error('Get user failed:', error)
    return c.json({ error: 'Failed to get user' }, 500)
  }
})

/**
 * POST /api/auth/logout
 * End user session
 */
auth.post('/logout', async (c) => {
  try {
    const sessionId = getCookie(c, 'session_id')

    if (sessionId) {
      const db = c.env.DB
      // Delete session
      await db.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run()
    }

    // Clear cookie
    deleteCookie(c, 'session_id')

    return c.json({ message: 'Logged out successfully' })
  } catch (error) {
    console.error('Logout failed:', error)
    return c.json({ error: 'Failed to logout' }, 500)
  }
})
