/**
 * Lucia auth configuration for Cloudflare D1
 * Handles user sessions and magic link authentication
 */

import { Lucia } from 'lucia'
import { D1Adapter } from '@lucia-auth/adapter-sqlite'
import type { D1Database } from '@cloudflare/workers-types'

export interface DatabaseUser {
  id: string
  email: string
  createdAt: string
}

export interface MagicLinkToken {
  token: string
  email: string
  expiresAt: Date
}

/**
 * Initialize Lucia with D1 adapter
 */
export function initLucia(db: D1Database) {
  const adapter = new D1Adapter(db, {
    user: 'users',
    session: 'sessions',
  })

  return new Lucia(adapter, {
    sessionCookie: {
      attributes: {
        secure: true,
        sameSite: 'lax',
      },
    },
    getUserAttributes: (attributes) => {
      return {
        email: attributes.email,
      }
    },
  })
}

/**
 * Generate magic link token
 */
export async function createMagicLinkToken(
  db: D1Database,
  email: string
): Promise<string> {
  const token = generateToken()
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

  await db
    .prepare(
      `INSERT INTO magic_link_tokens (token, email, expires_at)
       VALUES (?, ?, ?)`
    )
    .bind(token, email, expiresAt.toISOString())
    .run()

  return token
}

/**
 * Verify magic link token
 */
export async function verifyMagicLinkToken(
  db: D1Database,
  token: string
): Promise<string | null> {
  const result = await db
    .prepare(
      `SELECT email, expires_at FROM magic_link_tokens
       WHERE token = ? AND expires_at > datetime('now')`
    )
    .bind(token)
    .first<{ email: string; expires_at: string }>()

  if (!result) {
    return null
  }

  // Delete used token
  await db
    .prepare('DELETE FROM magic_link_tokens WHERE token = ?')
    .bind(token)
    .run()

  return result.email
}

/**
 * Get or create user by email
 */
export async function getOrCreateUser(
  db: D1Database,
  email: string
): Promise<DatabaseUser> {
  // Check if user exists
  const existing = await db
    .prepare('SELECT id, email, created_at FROM users WHERE email = ?')
    .bind(email)
    .first<{ id: string; email: string; created_at: string }>()

  if (existing) {
    return {
      id: existing.id,
      email: existing.email,
      createdAt: existing.created_at,
    }
  }

  // Create new user
  const id = crypto.randomUUID()
  const createdAt = new Date().toISOString()

  await db
    .prepare(
      `INSERT INTO users (id, email, created_at)
       VALUES (?, ?, ?)`
    )
    .bind(id, email, createdAt)
    .run()

  return { id, email, createdAt }
}

/**
 * Generate secure random token
 */
function generateToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Clean up expired tokens
 */
export async function cleanupExpiredTokens(db: D1Database): Promise<void> {
  await db
    .prepare(`DELETE FROM magic_link_tokens WHERE expires_at < datetime('now')`)
    .run()
}

declare module 'lucia' {
  interface Register {
    Lucia: ReturnType<typeof initLucia>
    DatabaseUserAttributes: {
      email: string
    }
  }
}
