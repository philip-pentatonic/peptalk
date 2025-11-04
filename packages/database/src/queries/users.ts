/**
 * User queries for Cloudflare D1.
 */

import type { User } from '../types'

/**
 * Get user by ID.
 */
export async function getById(db: D1Database, id: string): Promise<User | null> {
  return await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<User>()
}

/**
 * Get user by email.
 */
export async function getByEmail(db: D1Database, email: string): Promise<User | null> {
  return await db
    .prepare('SELECT * FROM users WHERE email = ?')
    .bind(email)
    .first<User>()
}

/**
 * Create new user.
 */
export async function create(
  db: D1Database,
  user: Omit<User, 'created_at' | 'updated_at'>
): Promise<User> {
  await db
    .prepare(
      'INSERT INTO users (id, email, email_verified) VALUES (?, ?, ?)'
    )
    .bind(user.id, user.email, user.email_verified ? 1 : 0)
    .run()

  const created = await getById(db, user.id)
  if (!created) throw new Error('Failed to create user')

  return created
}

/**
 * Update user.
 */
export async function update(
  db: D1Database,
  id: string,
  updates: Partial<Pick<User, 'email' | 'email_verified'>>
): Promise<User> {
  const fields: string[] = []
  const bindings: unknown[] = []

  if (updates.email !== undefined) {
    fields.push('email = ?')
    bindings.push(updates.email)
  }

  if (updates.email_verified !== undefined) {
    fields.push('email_verified = ?')
    bindings.push(updates.email_verified ? 1 : 0)
  }

  fields.push('updated_at = datetime("now")')
  bindings.push(id)

  await db
    .prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`)
    .bind(...bindings)
    .run()

  const updated = await getById(db, id)
  if (!updated) throw new Error('User not found')

  return updated
}
