/**
 * Stripe subscription routes
 * Checkout, webhooks, and customer portal
 */

import { Hono } from 'hono'
import { getCookie } from 'hono/cookie'
import { initLucia } from '@peptalk/auth'
import { initStripe, createCheckoutSession, createPortalSession, verifyWebhook, parseSubscriptionCreated, parseSubscriptionDeleted } from '@peptalk/payments/stripe'
import { initResend, sendSubscriptionConfirmation } from '@peptalk/auth/email'
import type { Bindings } from '../types'

export const stripe = new Hono<{ Bindings: Bindings }>()

/**
 * POST /api/stripe/checkout
 * Create Stripe Checkout session for subscription
 */
stripe.post('/checkout', async (c) => {
  try {
    const db = c.env.DB
    const lucia = initLucia(db)
    const stripeClient = initStripe(c.env.STRIPE_API_KEY)

    // Verify user is authenticated
    const sessionId = getCookie(c, lucia.sessionCookieName)

    if (!sessionId) {
      return c.json({ error: 'Authentication required' }, 401)
    }

    const { session, user } = await lucia.validateSession(sessionId)

    if (!session || !user) {
      return c.json({ error: 'Invalid session' }, 401)
    }

    // Create Checkout session
    const baseUrl = new URL(c.req.url).origin
    const checkoutSession = await createCheckoutSession(stripeClient, {
      priceId: 'price_YOUR_STRIPE_PRICE_ID', // Replace with actual price ID
      customerEmail: user.email,
      userId: user.id,
      successUrl: `${baseUrl}/account?success=true`,
      cancelUrl: `${baseUrl}/subscribe?canceled=true`,
    })

    return c.json({
      url: checkoutSession.url,
      sessionId: checkoutSession.id,
    })
  } catch (error) {
    console.error('Checkout failed:', error)
    return c.json({ error: 'Failed to create checkout session' }, 500)
  }
})

/**
 * POST /api/stripe/portal
 * Create Stripe Customer Portal session
 */
stripe.post('/portal', async (c) => {
  try {
    const db = c.env.DB
    const lucia = initLucia(db)
    const stripeClient = initStripe(c.env.STRIPE_API_KEY)

    // Verify user is authenticated
    const sessionId = getCookie(c, lucia.sessionCookieName)

    if (!sessionId) {
      return c.json({ error: 'Authentication required' }, 401)
    }

    const { session, user } = await lucia.validateSession(sessionId)

    if (!session || !user) {
      return c.json({ error: 'Invalid session' }, 401)
    }

    // Get user's Stripe customer ID
    const subscription = await db
      .prepare('SELECT stripe_customer_id FROM subscriptions WHERE user_id = ? LIMIT 1')
      .bind(user.id)
      .first<{ stripe_customer_id: string }>()

    if (!subscription) {
      return c.json({ error: 'No subscription found' }, 404)
    }

    // Create portal session
    const baseUrl = new URL(c.req.url).origin
    const portalSession = await createPortalSession(
      stripeClient,
      subscription.stripe_customer_id,
      `${baseUrl}/account`
    )

    return c.json({
      url: portalSession.url,
    })
  } catch (error) {
    console.error('Portal creation failed:', error)
    return c.json({ error: 'Failed to create portal session' }, 500)
  }
})

/**
 * POST /api/stripe/webhook
 * Handle Stripe webhook events
 */
stripe.post('/webhook', async (c) => {
  try {
    const db = c.env.DB
    const stripeClient = initStripe(c.env.STRIPE_API_KEY)
    const resend = initResend(c.env.RESEND_API_KEY)

    // Get raw body and signature
    const body = await c.req.text()
    const signature = c.req.header('stripe-signature')

    if (!signature) {
      return c.json({ error: 'No signature' }, 400)
    }

    // Verify webhook
    const event = verifyWebhook(body, signature, c.env.STRIPE_WEBHOOK_SECRET, stripeClient)

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any
        console.log('Checkout completed:', session.id)
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as any
        const parsed = parseSubscriptionCreated(subscription)

        if (parsed) {
          // Upsert subscription
          await db
            .prepare(
              `INSERT INTO subscriptions (id, user_id, stripe_subscription_id, stripe_customer_id, status, current_period_start, current_period_end, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(stripe_subscription_id) DO UPDATE SET
                 status = excluded.status,
                 current_period_end = excluded.current_period_end`
            )
            .bind(
              crypto.randomUUID(),
              parsed.userId,
              parsed.subscriptionId,
              parsed.customerId,
              parsed.status,
              parsed.currentPeriodStart.toISOString(),
              parsed.currentPeriodEnd.toISOString(),
              new Date().toISOString()
            )
            .run()

          // Send confirmation email
          if (event.type === 'customer.subscription.created') {
            const user = await db
              .prepare('SELECT email FROM users WHERE id = ?')
              .bind(parsed.userId)
              .first<{ email: string }>()

            if (user) {
              await sendSubscriptionConfirmation(resend, user.email, 'PepTalk <noreply@peptalk.com>')
            }
          }
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any
        const parsed = parseSubscriptionDeleted(subscription)

        // Update subscription status
        await db
          .prepare(
            `UPDATE subscriptions
             SET status = 'canceled', canceled_at = ?
             WHERE stripe_subscription_id = ?`
          )
          .bind(parsed.canceledAt.toISOString(), parsed.subscriptionId)
          .run()

        break
      }

      default:
        console.log('Unhandled event type:', event.type)
    }

    return c.json({ received: true })
  } catch (error) {
    console.error('Webhook failed:', error)
    return c.json({ error: 'Webhook processing failed' }, 500)
  }
})
