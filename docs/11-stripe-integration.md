# PepTalk — Stripe Integration

**Version:** 1.0
**Last Updated:** 2025-11-04

---

## Overview

Stripe powers PepTalk's subscription billing. This document covers implementation details for Checkout, Customer Portal, and webhook handling.

**Stripe Objects:**
- **Customer:** Represents a user
- **Product:** Annual subscription to PepTalk
- **Price:** $99/year (ID stored in env)
- **Subscription:** Active billing relationship
- **Invoice:** Payment receipt

---

## Setup

### Stripe Account

1. **Create account:** https://dashboard.stripe.com/register
2. **Activate account:** Provide business details
3. **Get API keys:**
   - Test keys: `pk_test_...` and `sk_test_...`
   - Live keys: `pk_live_...` and `sk_live_...`

### Product Configuration

**Create product:**
```bash
# Via Dashboard: Products → Add product
Name: PepTalk Annual Subscription
Description: Full access to peptide evidence pages and PDF downloads
```

**Create price:**
```bash
# Via Dashboard: Product → Add pricing
Price: $99 USD
Billing period: Yearly
```

**Save Price ID:** `price_...` (used in code)

---

## Checkout Flow

### Implementation

**Route:** `POST /api/checkout/create`

**Code:**
```typescript
// apps/workers/src/api/checkout-create.ts
import Stripe from 'stripe'

export async function createCheckoutSession(c: Context) {
  const user = c.get('user') // From auth middleware

  const stripe = new Stripe(c.env.STRIPE_SECRET_KEY)

  const session = await stripe.checkout.sessions.create({
    customer_email: user.email,
    line_items: [{
      price: c.env.STRIPE_PRICE_ID,
      quantity: 1
    }],
    mode: 'subscription',
    success_url: `${c.env.NEXT_PUBLIC_URL}/account?success=true`,
    cancel_url: `${c.env.NEXT_PUBLIC_URL}/account?canceled=true`,
    metadata: {
      user_id: user.id
    },
    subscription_data: {
      metadata: {
        user_id: user.id
      }
    }
  })

  return c.json({ checkout_url: session.url })
}
```

**Frontend:**
```typescript
// apps/web/app/account/page.tsx
async function handleSubscribe() {
  const res = await fetch('/api/checkout/create', {
    method: 'POST',
    credentials: 'include' // Send session cookie
  })

  const { checkout_url } = await res.json()
  window.location.href = checkout_url // Redirect to Stripe
}
```

### User Flow

1. User clicks "Subscribe" button
2. POST /api/checkout/create
3. Redirect to Stripe Checkout page
4. User enters payment details
5. Stripe processes payment
6. Redirect to success_url
7. Webhook creates subscription in D1

---

## Customer Portal

### Implementation

**Route:** `POST /api/billing/portal`

**Code:**
```typescript
// apps/workers/src/api/billing-portal.ts
export async function createPortalSession(c: Context) {
  const user = c.get('user')

  // Get Stripe customer ID
  const subscription = await db.prepare(
    'SELECT stripe_customer_id FROM subscriptions WHERE user_id = ?'
  ).bind(user.id).first()

  if (!subscription) {
    return c.json({ error: 'No subscription found' }, 404)
  }

  const stripe = new Stripe(c.env.STRIPE_SECRET_KEY)

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripe_customer_id,
    return_url: `${c.env.NEXT_PUBLIC_URL}/account`
  })

  return c.json({ portal_url: session.url })
}
```

**Frontend:**
```typescript
// apps/web/app/account/page.tsx
async function handleManageBilling() {
  const res = await fetch('/api/billing/portal', {
    method: 'POST',
    credentials: 'include'
  })

  const { portal_url } = await res.json()
  window.location.href = portal_url // Redirect to Stripe Portal
}
```

### Customer Portal Features

**Users can:**
- Update payment method
- View invoice history
- Cancel subscription
- Reactivate canceled subscription

**Settings:**
- Dashboard → Settings → Customer portal
- Enable: Payment method updates, subscription cancellation
- Disable: Plan changes (we only have one plan)

---

## Webhook Handling

### Setup

**Create webhook endpoint:**
1. Dashboard → Developers → Webhooks → Add endpoint
2. URL: `https://api.peptalk.com/api/webhooks/stripe`
3. Events to listen:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`

**Get signing secret:** `whsec_...` (for verification)

### Implementation

**Route:** `POST /api/webhooks/stripe`

**Code:**
```typescript
// apps/workers/src/webhooks/stripe.ts
import Stripe from 'stripe'

export async function handleStripeWebhook(c: Context) {
  const signature = c.req.header('stripe-signature')
  const body = await c.req.text()

  let event: Stripe.Event
  try {
    const stripe = new Stripe(c.env.STRIPE_SECRET_KEY)
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      c.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    console.error('Webhook signature verification failed', err)
    return c.json({ error: 'Invalid signature' }, 400)
  }

  // Route to handler
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object)
      break
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object)
      break
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object)
      break
    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object)
      break
  }

  return c.json({ received: true })
}
```

### Event Handlers

**checkout.session.completed:**
```typescript
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata.user_id
  const customerId = session.customer as string
  const subscriptionId = session.subscription as string

  // Create subscription record
  await db.prepare(`
    INSERT INTO subscriptions (
      id, user_id, stripe_subscription_id, stripe_customer_id,
      status, current_period_end, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    crypto.randomUUID(),
    userId,
    subscriptionId,
    customerId,
    'active',
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
    new Date().toISOString(),
    new Date().toISOString()
  ).run()
}
```

**customer.subscription.updated:**
```typescript
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  await db.prepare(`
    UPDATE subscriptions
    SET status = ?,
        current_period_end = ?,
        cancel_at_period_end = ?,
        updated_at = ?
    WHERE stripe_subscription_id = ?
  `).bind(
    subscription.status,
    new Date(subscription.current_period_end * 1000).toISOString(),
    subscription.cancel_at_period_end ? 1 : 0,
    new Date().toISOString(),
    subscription.id
  ).run()
}
```

**customer.subscription.deleted:**
```typescript
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  await db.prepare(`
    UPDATE subscriptions
    SET status = 'canceled', updated_at = ?
    WHERE stripe_subscription_id = ?
  `).bind(
    new Date().toISOString(),
    subscription.id
  ).run()
}
```

**invoice.payment_failed:**
```typescript
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string

  // Mark as past_due
  await db.prepare(`
    UPDATE subscriptions
    SET status = 'past_due', updated_at = ?
    WHERE stripe_subscription_id = ?
  `).bind(
    new Date().toISOString(),
    subscriptionId
  ).run()

  // Send email to user (via Resend)
  // "Your payment failed. Please update your payment method."
}
```

---

## Testing

### Test Mode

**Use test API keys:**
```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

**Test cards:**
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Requires auth: `4000 0025 0000 3155`

**Expiry:** Any future date (e.g., 12/34)
**CVC:** Any 3 digits (e.g., 123)

### Local Webhook Testing

**Use Stripe CLI:**
```bash
# Install
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to localhost
stripe listen --forward-to localhost:8787/api/webhooks/stripe

# Trigger test event
stripe trigger checkout.session.completed
```

---

## Error Handling

### Failed Payments

**Stripe retries automatically:**
- Day 1: Retry
- Day 3: Retry
- Day 5: Retry
- Day 7: Mark as past_due, send email

**Handling:**
1. `invoice.payment_failed` webhook
2. Update subscription status to `past_due`
3. Send email: "Payment failed, update method"
4. Restrict access after 7 days

### Webhook Failures

**Stripe retries for 3 days:**
- Exponential backoff
- After 3 days, marks as failed

**Handling:**
1. Monitor Stripe Dashboard → Webhooks
2. Check for failed deliveries
3. Manually resend event if needed
4. Fix webhook handler if bug

### Idempotency

**Use idempotency keys to prevent duplicates:**
```typescript
const idempotencyKey = `${event.id}-${event.type}`

// Check if already processed
const existing = await db.prepare(
  'SELECT 1 FROM webhook_events WHERE idempotency_key = ?'
).bind(idempotencyKey).first()

if (existing) {
  return // Already processed
}

// Process event...

// Mark as processed
await db.prepare(
  'INSERT INTO webhook_events (idempotency_key, processed_at) VALUES (?, ?)'
).bind(idempotencyKey, new Date().toISOString()).run()
```

---

## Refunds

### Full Refund

```bash
# Via Dashboard: Payment → Refund

# Via API:
stripe refunds create --payment-intent pi_... --amount 9900
```

**Effect:**
- Customer receives $99 back
- Subscription canceled immediately
- User loses access

### Partial Refund (Prorated)

**Not recommended for annual subscriptions.**

If needed:
```bash
stripe refunds create --payment-intent pi_... --amount 2475 # 3 months
```

---

## Analytics

### Key Metrics

**Monthly Recurring Revenue (MRR):**
```typescript
const mrr = (annualSubscriptions * 99) / 12
```

**Churn Rate:**
```typescript
const churnRate = (canceledThisMonth / totalSubscribers) * 100
```

**Lifetime Value (LTV):**
```typescript
const ltv = averageSubscriptionLength * 99
```

### Stripe Dashboard

**Reports → Overview:**
- Total revenue
- Active subscriptions
- Failed payments
- Churn rate

---

## Security

### Webhook Signature Verification

**Always verify signatures:**
```typescript
const event = stripe.webhooks.constructEvent(
  body,
  signature,
  webhookSecret
)
```

**Never process unverified webhooks** (replay attacks).

### PCI Compliance

**Stripe handles all card data.**

**We never:**
- Store card numbers
- Process payments directly
- See card details

**Stripe is PCI DSS Level 1 certified.**

---

## References

- [Stripe Docs](https://stripe.com/docs)
- [Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Stripe Customer Portal](https://stripe.com/docs/billing/subscriptions/customer-portal)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)

---

**Document Owner:** Engineering Team
**Lines:** 394 (within 400-line limit ✓)
