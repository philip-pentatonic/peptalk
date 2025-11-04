# @peptalk/payments

Stripe integration for subscription management in PepTalk.

## Purpose

This package handles:
- Stripe Checkout session creation
- Subscription lifecycle management
- Webhook event processing
- Customer Portal integration
- Payment method updates

## Features

- **Annual Subscriptions** - $99/year pricing
- **Checkout Flow** - One-click subscription purchase
- **Customer Portal** - Self-service billing management
- **Webhook Handling** - Automatic sync with database
- **Type Safety** - Full TypeScript support

## Quick Start

### Create Checkout Session

```typescript
import { createCheckoutSession } from '@peptalk/payments'

const session = await createCheckoutSession(stripe, {
  customerEmail: 'user@example.com',
  priceId: env.STRIPE_PRICE_ID,
  successUrl: 'https://peptalk.com/account?success=true',
  cancelUrl: 'https://peptalk.com/pricing'
})

// Redirect user to session.url
```

### Handle Webhook

```typescript
import { handleWebhook } from '@peptalk/payments'

const event = stripe.webhooks.constructEvent(
  await request.text(),
  request.headers.get('stripe-signature'),
  env.STRIPE_WEBHOOK_SECRET
)

await handleWebhook(event, env.DB)
```

### Create Portal Session

```typescript
import { createPortalSession } from '@peptalk/payments'

const session = await createPortalSession(stripe, {
  customerId: 'cus_...',
  returnUrl: 'https://peptalk.com/account'
})

// Redirect user to session.url
```

## API Reference

### Checkout

#### `createCheckoutSession(stripe, options)`

Creates a Stripe Checkout session for subscription purchase.

**Parameters:**
- `stripe` (Stripe) - Stripe client instance
- `options` (CheckoutOptions)
  - `customerEmail` (string) - User's email address
  - `priceId` (string) - Stripe Price ID (annual subscription)
  - `successUrl` (string) - Redirect after successful payment
  - `cancelUrl` (string) - Redirect if user cancels
  - `metadata` (object, optional) - Custom metadata

**Returns:** `Promise<Stripe.Checkout.Session>`

**Example:**

```typescript
const session = await createCheckoutSession(stripe, {
  customerEmail: user.email,
  priceId: env.STRIPE_PRICE_ID,
  successUrl: `${env.NEXT_PUBLIC_URL}/account?success=true`,
  cancelUrl: `${env.NEXT_PUBLIC_URL}/pricing`,
  metadata: {
    userId: user.id,
    plan: 'annual'
  }
})

return Response.redirect(session.url, 303)
```

### Customer Portal

#### `createPortalSession(stripe, options)`

Creates a Stripe Customer Portal session for subscription management.

**Parameters:**
- `stripe` (Stripe) - Stripe client instance
- `options` (PortalOptions)
  - `customerId` (string) - Stripe Customer ID
  - `returnUrl` (string) - Return URL after portal interaction

**Returns:** `Promise<Stripe.BillingPortal.Session>`

**Example:**

```typescript
const subscription = await db.subscriptions.getByUserId(env.DB, user.id)

const session = await createPortalSession(stripe, {
  customerId: subscription.stripeCustomerId,
  returnUrl: `${env.NEXT_PUBLIC_URL}/account`
})

return Response.redirect(session.url, 303)
```

### Webhooks

#### `handleWebhook(event, db)`

Processes Stripe webhook events and syncs with database.

**Parameters:**
- `event` (Stripe.Event) - Verified webhook event
- `db` (D1Database) - D1 database instance

**Returns:** `Promise<void>`

**Supported Events:**

- `checkout.session.completed` - Create subscription record
- `customer.subscription.updated` - Update subscription status
- `customer.subscription.deleted` - Cancel subscription
- `invoice.payment_succeeded` - Extend subscription period
- `invoice.payment_failed` - Mark subscription as past_due

**Example:**

```typescript
export async function POST(request: Request, env: Env) {
  const signature = request.headers.get('stripe-signature')
  const body = await request.text()

  const event = stripe.webhooks.constructEvent(
    body,
    signature,
    env.STRIPE_WEBHOOK_SECRET
  )

  await handleWebhook(event, env.DB)

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' }
  })
}
```

#### `verifyWebhook(request, secret)`

Verifies Stripe webhook signature.

**Parameters:**
- `request` (Request) - Incoming webhook request
- `secret` (string) - Webhook signing secret

**Returns:** `Promise<Stripe.Event>`

**Throws:** `Error` if signature is invalid

### Subscription Management

#### `getSubscriptionStatus(stripe, subscriptionId)`

Retrieves current subscription status from Stripe.

**Parameters:**
- `stripe` (Stripe) - Stripe client instance
- `subscriptionId` (string) - Stripe Subscription ID

**Returns:** `Promise<SubscriptionStatus>`

**Example:**

```typescript
const status = await getSubscriptionStatus(stripe, 'sub_...')

if (status === 'active' || status === 'trialing') {
  // User has access
} else {
  // User needs to renew
}
```

#### `cancelSubscription(stripe, subscriptionId)`

Cancels subscription at period end.

**Parameters:**
- `stripe` (Stripe) - Stripe client instance
- `subscriptionId` (string) - Stripe Subscription ID

**Returns:** `Promise<Stripe.Subscription>`

**Example:**

```typescript
const subscription = await cancelSubscription(stripe, 'sub_...')
// subscription.cancel_at_period_end === true
```

#### `reactivateSubscription(stripe, subscriptionId)`

Reactivates a canceled subscription (before period end).

**Parameters:**
- `stripe` (Stripe) - Stripe client instance
- `subscriptionId` (string) - Stripe Subscription ID

**Returns:** `Promise<Stripe.Subscription>`

## Webhook Event Handlers

### checkout.session.completed

```typescript
async function handleCheckoutCompleted(event: Stripe.Event, db: D1Database) {
  const session = event.data.object as Stripe.Checkout.Session

  await db.subscriptions.create(db, {
    userId: session.metadata.userId,
    stripeSubscriptionId: session.subscription,
    stripeCustomerId: session.customer,
    status: 'active',
    currentPeriodEnd: new Date(session.expires_at * 1000)
  })
}
```

### customer.subscription.updated

```typescript
async function handleSubscriptionUpdated(event: Stripe.Event, db: D1Database) {
  const subscription = event.data.object as Stripe.Subscription

  await db.subscriptions.updateStatus(
    db,
    subscription.id,
    subscription.status
  )
}
```

### customer.subscription.deleted

```typescript
async function handleSubscriptionDeleted(event: Stripe.Event, db: D1Database) {
  const subscription = event.data.object as Stripe.Subscription

  await db.subscriptions.updateStatus(db, subscription.id, 'canceled')
}
```

## Configuration

### Environment Variables

Required environment variables:

```bash
STRIPE_SECRET_KEY=sk_test_...           # Stripe API secret key
STRIPE_PUBLISHABLE_KEY=pk_test_...      # Stripe publishable key (frontend)
STRIPE_WEBHOOK_SECRET=whsec_...         # Webhook signing secret
STRIPE_PRICE_ID=price_...               # Annual subscription price ID
```

### Stripe Dashboard Setup

1. **Create Product** - "PepTalk Annual Subscription"
2. **Create Price** - $99/year (recurring)
3. **Enable Customer Portal** - Manage subscriptions
4. **Create Webhook** - Point to `/api/webhooks/stripe`
5. **Configure Events:**
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

## Testing

### Test Mode

Use Stripe test mode credentials for development:

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Test Cards

- **Success:** `4242 4242 4242 4242`
- **Declined:** `4000 0000 0000 0002`
- **3D Secure:** `4000 0025 0000 3155`

Expiry: Any future date
CVC: Any 3 digits
ZIP: Any 5 digits

### Webhook Testing

Use Stripe CLI to forward webhooks locally:

```bash
stripe listen --forward-to http://localhost:8787/api/webhooks/stripe
```

Copy the webhook signing secret to `.env`:

```bash
STRIPE_WEBHOOK_SECRET=whsec_...
```

Trigger test events:

```bash
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
```

## Error Handling

### Payment Failures

```typescript
try {
  const session = await createCheckoutSession(stripe, options)
  return Response.redirect(session.url, 303)
} catch (error) {
  if (error.type === 'StripeCardError') {
    // Card was declined
    return new Response('Payment failed', { status: 400 })
  }
  throw error
}
```

### Webhook Failures

```typescript
try {
  await handleWebhook(event, env.DB)
  return new Response(JSON.stringify({ received: true }))
} catch (error) {
  console.error('Webhook error:', error)
  // Return 200 to prevent retries for invalid events
  return new Response(JSON.stringify({ error: error.message }), {
    status: 200
  })
}
```

## Security

### Webhook Verification

Always verify webhook signatures:

```typescript
const event = stripe.webhooks.constructEvent(
  body,
  signature,
  env.STRIPE_WEBHOOK_SECRET
)
// Event is now verified and safe to process
```

### Customer Validation

Verify user owns the subscription before allowing access:

```typescript
const subscription = await db.subscriptions.getByUserId(env.DB, user.id)

if (!subscription || subscription.status !== 'active') {
  return new Response('Unauthorized', { status: 401 })
}
```

## File Structure

```
packages/payments/
├── src/
│   ├── index.ts              # Main exports
│   ├── checkout.ts           # Checkout session creation
│   ├── portal.ts             # Customer Portal
│   ├── webhooks.ts           # Webhook handling
│   ├── subscription.ts       # Subscription management
│   └── types.ts              # TypeScript types
├── package.json
├── tsconfig.json
└── README.md
```

## Related Documentation

- [docs/11-stripe-integration.md](../../docs/11-stripe-integration.md) - Complete integration guide
- [docs/08-security.md](../../docs/08-security.md) - Security best practices
- [Stripe API Docs](https://stripe.com/docs/api)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
