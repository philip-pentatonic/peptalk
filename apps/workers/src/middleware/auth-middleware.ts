/**
 * Authentication middleware
 * Verifies user sessions and protects routes
 */

import type { Context, Next } from 'hono'
import { getCookie } from 'hono/cookie'
import { initLucia } from '@peptalk/auth'
import type { Bindings } from '../types'

export interface AuthUser {
  id: string
  email: string
  hasActiveSubscription: boolean
}

/**
 * Require authentication middleware
 * Returns 401 if not authenticated
 */
export function requireAuth() {
  return async (c: Context<{ Bindings: Bindings }>, next: Next) => {
    const user = await getAuthUser(c)

    if (!user) {
      return c.json({ error: 'Authentication required' }, 401)
    }

    // Add user to context
    c.set('user', user)

    return next()
  }
}

/**
 * Require active subscription middleware
 * Returns 403 if no active subscription
 */
export function requireSubscription() {
  return async (c: Context<{ Bindings: Bindings }>, next: Next) => {
    const user = await getAuthUser(c)

    if (!user) {
      return c.json({ error: 'Authentication required' }, 401)
    }

    if (!user.hasActiveSubscription) {
      return c.json({ error: 'Active subscription required' }, 403)
    }

    c.set('user', user)

    return next()
  }
}

/**
 * Optional authentication middleware
 * Adds user to context if authenticated, but doesn't require it
 */
export function optionalAuth() {
  return async (c: Context<{ Bindings: Bindings }>, next: Next) => {
    const user = await getAuthUser(c)

    if (user) {
      c.set('user', user)
    }

    return next()
  }
}

/**
 * Get authenticated user from session
 */
async function getAuthUser(
  c: Context<{ Bindings: Bindings }>
): Promise<AuthUser | null> {
  try {
    const db = c.env.DB
    const lucia = initLucia(db)

    const sessionId = getCookie(c, lucia.sessionCookieName)

    if (!sessionId) {
      return null
    }

    const { session, user } = await lucia.validateSession(sessionId)

    if (!session || !user) {
      return null
    }

    // Check subscription
    const subscription = await db
      .prepare(
        `SELECT status, current_period_end FROM subscriptions
         WHERE user_id = ? AND status IN ('active', 'trialing')
         ORDER BY created_at DESC LIMIT 1`
      )
      .bind(user.id)
      .first<{ status: string; current_period_end: string }>()

    const hasActiveSubscription = subscription !== null

    return {
      id: user.id,
      email: user.email,
      hasActiveSubscription,
    }
  } catch (error) {
    console.error('Auth check failed:', error)
    return null
  }
}
