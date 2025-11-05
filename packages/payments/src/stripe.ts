/**
 * Stripe integration for subscription management
 * Handles checkout, webhooks, and customer portal
 */

import Stripe from 'stripe'

export interface StripeConfig {
  apiKey: string
  webhookSecret: string
  priceId: string
  successUrl: string
  cancelUrl: string
}

/**
 * Initialize Stripe client
 */
export function initStripe(apiKey: string): Stripe {
  return new Stripe(apiKey, {
    apiVersion: '2024-11-20.acacia',
    httpClient: Stripe.createFetchHttpClient(),
  })
}

/**
 * Create Checkout Session for subscription
 */
export async function createCheckoutSession(
  stripe: Stripe,
  config: {
    priceId: string
    customerEmail: string
    userId: string
    successUrl: string
    cancelUrl: string
  }
): Promise<Stripe.Checkout.Session> {
  return await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: config.priceId,
        quantity: 1,
      },
    ],
    customer_email: config.customerEmail,
    client_reference_id: config.userId,
    success_url: config.successUrl,
    cancel_url: config.cancelUrl,
    subscription_data: {
      metadata: {
        userId: config.userId,
      },
    },
  })
}

/**
 * Create Customer Portal session
 */
export async function createPortalSession(
  stripe: Stripe,
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  return await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })
}

/**
 * Verify webhook signature
 */
export function verifyWebhook(
  payload: string,
  signature: string,
  secret: string,
  stripe: Stripe
): Stripe.Event {
  return stripe.webhooks.constructEvent(payload, signature, secret)
}

/**
 * Handle subscription.created event
 */
export interface SubscriptionCreated {
  userId: string
  subscriptionId: string
  customerId: string
  priceId: string
  status: string
  currentPeriodStart: Date
  currentPeriodEnd: Date
}

export function parseSubscriptionCreated(
  subscription: Stripe.Subscription
): SubscriptionCreated | null {
  const userId = subscription.metadata?.userId

  if (!userId) {
    return null
  }

  return {
    userId,
    subscriptionId: subscription.id,
    customerId: subscription.customer as string,
    priceId: subscription.items.data[0].price.id,
    status: subscription.status,
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
  }
}

/**
 * Handle subscription.updated event
 */
export function parseSubscriptionUpdated(
  subscription: Stripe.Subscription
): SubscriptionCreated | null {
  return parseSubscriptionCreated(subscription)
}

/**
 * Handle subscription.deleted event
 */
export interface SubscriptionDeleted {
  subscriptionId: string
  customerId: string
  canceledAt: Date
}

export function parseSubscriptionDeleted(
  subscription: Stripe.Subscription
): SubscriptionDeleted {
  return {
    subscriptionId: subscription.id,
    customerId: subscription.customer as string,
    canceledAt: new Date(subscription.canceled_at ? subscription.canceled_at * 1000 : Date.now()),
  }
}

/**
 * Get subscription by customer ID
 */
export async function getSubscriptionByCustomer(
  stripe: Stripe,
  customerId: string
): Promise<Stripe.Subscription | null> {
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    limit: 1,
    status: 'active',
  })

  return subscriptions.data[0] || null
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(
  stripe: Stripe,
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return await stripe.subscriptions.cancel(subscriptionId)
}

/**
 * Check if subscription is active
 */
export function isSubscriptionActive(subscription: Stripe.Subscription): boolean {
  return (
    subscription.status === 'active' ||
    subscription.status === 'trialing'
  )
}
