/**
 * Complete authentication routes with Lucia
 * Magic link authentication and session management
 */

import { Hono } from 'hono'
import { setCookie, deleteCookie, getCookie } from 'hono/cookie'
import { initLucia, createMagicLinkToken, verifyMagicLinkToken, getOrCreateUser } from '@peptalk/auth'
import { initResend, sendMagicLink } from '@peptalk/auth/email'
import type { Bindings } from '../types'

export const auth = new Hono<{ Bindings: Bindings }>()

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
    const resend = initResend(c.env.RESEND_API_KEY)

    // Generate magic link token
    const token = await createMagicLinkToken(db, email)

    // Send email
    const baseUrl = new URL(c.req.url).origin
    await sendMagicLink(
      resend,
      {
        to: email,
        token,
        baseUrl,
      },
      'PepTalk <noreply@peptalk.com>'
    )

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
    const lucia = initLucia(db)

    // Verify token
    const email = await verifyMagicLinkToken(db, token)

    if (!email) {
      return c.json({ error: 'Invalid or expired token' }, 401)
    }

    // Get or create user
    const user = await getOrCreateUser(db, email)

    // Create session
    const session = await lucia.createSession(user.id, {})
    const sessionCookie = lucia.createSessionCookie(session.id)

    setCookie(c, sessionCookie.name, sessionCookie.value, sessionCookie.attributes)

    return c.json({
      message: 'Authentication successful',
      redirectTo: '/account',
      user: {
        id: user.id,
        email: user.email,
      },
    })
  } catch (error) {
    console.error('Verification failed:', error)
    return c.json({ error: 'Authentication failed' }, 500)
  }
})

/**
 * POST /api/auth/logout
 * End user session
 */
auth.post('/logout', async (c) => {
  try {
    const db = c.env.DB
    const lucia = initLucia(db)

    const sessionId = getCookie(c, lucia.sessionCookieName)

    if (sessionId) {
      await lucia.invalidateSession(sessionId)
    }

    const sessionCookie = lucia.createBlankSessionCookie()
    deleteCookie(c, sessionCookie.name)

    return c.json({ message: 'Logged out successfully' })
  } catch (error) {
    console.error('Logout failed:', error)
    return c.json({ error: 'Failed to log out' }, 500)
  }
})

/**
 * GET /api/auth/session
 * Get current user session
 */
auth.get('/session', async (c) => {
  try {
    const db = c.env.DB
    const lucia = initLucia(db)

    const sessionId = getCookie(c, lucia.sessionCookieName)

    if (!sessionId) {
      return c.json({
        user: null,
        authenticated: false,
      })
    }

    const { session, user } = await lucia.validateSession(sessionId)

    if (!session) {
      return c.json({
        user: null,
        authenticated: false,
      })
    }

    // Check subscription status
    const subscription = await db
      .prepare(
        `SELECT status, current_period_end FROM subscriptions
         WHERE user_id = ? AND status IN ('active', 'trialing')
         ORDER BY created_at DESC LIMIT 1`
      )
      .bind(user.id)
      .first<{ status: string; current_period_end: string }>()

    return c.json({
      user: {
        id: user.id,
        email: user.email,
      },
      subscription: subscription
        ? {
            status: subscription.status,
            currentPeriodEnd: subscription.current_period_end,
          }
        : null,
      authenticated: true,
    })
  } catch (error) {
    console.error('Session check failed:', error)
    return c.json({ error: 'Failed to check session' }, 500)
  }
})
