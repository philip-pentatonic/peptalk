/**
 * Subscription queries for Cloudflare D1.
 */

import type { Subscription } from '../types'

/**
 * Get subscription by user ID.
 */
export async function getByUserId(
  db: D1Database,
  userId: string
): Promise<Subscription | null> {
  return await db
    .prepare('SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1')
    .bind(userId)
    .first<Subscription>()
}

/**
 * Get subscription by Stripe subscription ID.
 */
export async function getByStripeId(
  db: D1Database,
  stripeSubscriptionId: string
): Promise<Subscription | null> {
  return await db
    .prepare('SELECT * FROM subscriptions WHERE stripe_subscription_id = ?')
    .bind(stripeSubscriptionId)
    .first<Subscription>()
}

/**
 * Create new subscription.
 */
export async function create(
  db: D1Database,
  subscription: Omit<Subscription, 'id' | 'created_at' | 'updated_at'>
): Promise<Subscription> {
  const result = await db
    .prepare(
      `INSERT INTO subscriptions (
        user_id, stripe_subscription_id, stripe_customer_id,
        status, current_period_end, cancel_at_period_end
      ) VALUES (?, ?, ?, ?, ?, ?)
      RETURNING id`
    )
    .bind(
      subscription.user_id,
      subscription.stripe_subscription_id,
      subscription.stripe_customer_id,
      subscription.status,
      subscription.current_period_end,
      subscription.cancel_at_period_end ? 1 : 0
    )
    .first<{ id: number }>()

  if (!result) throw new Error('Failed to create subscription')

  const created = await getByStripeId(db, subscription.stripe_subscription_id)
  if (!created) throw new Error('Subscription not found after creation')

  return created
}

/**
 * Update subscription status.
 */
export async function updateStatus(
  db: D1Database,
  stripeSubscriptionId: string,
  status: string,
  currentPeriodEnd?: string
): Promise<void> {
  const fields = ['status = ?', 'updated_at = datetime("now")']
  const bindings: unknown[] = [status]

  if (currentPeriodEnd) {
    fields.push('current_period_end = ?')
    bindings.push(currentPeriodEnd)
  }

  bindings.push(stripeSubscriptionId)

  await db
    .prepare(
      `UPDATE subscriptions SET ${fields.join(', ')} WHERE stripe_subscription_id = ?`
    )
    .bind(...bindings)
    .run()
}

/**
 * Check if user has active subscription.
 */
export async function hasActiveSubscription(
  db: D1Database,
  userId: string
): Promise<boolean> {
  const subscription = await getByUserId(db, userId)

  if (!subscription) return false

  return subscription.status === 'active' || subscription.status === 'trialing'
}
