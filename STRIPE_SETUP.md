# Stripe Setup Guide for PepTalk

## ✅ Completed Setup

### 1. Stripe API Keys Configured
All Stripe keys are configured in Workers secrets:
- `STRIPE_API_KEY` - Your live secret key
- `STRIPE_WEBHOOK_SECRET` - For webhook signature verification
- `STRIPE_PRICE_ID_MONTHLY` - £10/month price
- `STRIPE_PRICE_ID_ANNUAL` - £90/year price

### 2. Stripe Routes Live
The following endpoints are now available:

**Checkout Endpoint:**
```
POST https://peptalk-api.polished-glitter-23bb.workers.dev/api/stripe/checkout
```

**Request body:**
```json
{
  "priceId": "monthly"  // or "annual"
}
```

**Response:**
```json
{
  "url": "https://checkout.stripe.com/c/pay/..."
}
```

**Webhook Endpoint:**
```
POST https://peptalk-api.polished-glitter-23bb.workers.dev/api/stripe/webhook
```

---

## 🔧 Required: Configure Webhook in Stripe Dashboard

### Step 1: Add Webhook Endpoint

1. Go to: https://dashboard.stripe.com/webhooks
2. Click "+ Add endpoint"
3. Enter endpoint URL:
   ```
   https://peptalk-api.polished-glitter-23bb.workers.dev/api/stripe/webhook
   ```

### Step 2: Select Events

Select these events to listen for:
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

### Step 3: Get Signing Secret

After creating the webhook:
1. Click on the webhook
2. Click "Reveal" under "Signing secret"
3. **Verify it matches your STRIPE_WEBHOOK_SECRET** in Workers secrets

If it doesn't match, update the secret:
```bash
cd apps/workers
echo "whsec_..." | wrangler secret put STRIPE_WEBHOOK_SECRET --env=""
```

---

## 💳 Price Configuration

Your Stripe products are configured with these prices:

### Monthly Plan
- **Price ID:** `price_1SPweFBxzeU29W9ts2YD3fPW`
- **Amount:** £10.00 GBP
- **Interval:** Monthly

### Annual Plan
- **Price ID:** `price_1SPweFBxzeU29W9tMOpXYGhU`
- **Amount:** £90.00 GBP
- **Interval:** Yearly
- **Savings:** £30/year (25% discount)

---

## 🧪 Testing Payment Flow

### Test with Stripe Test Mode

1. **Create a test checkout session:**
```bash
curl -X POST https://peptalk-api.polished-glitter-23bb.workers.dev/api/stripe/checkout \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{"priceId":"monthly"}'
```

2. **Use Stripe test cards:**
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3D Secure: `4000 0025 0000 3155`

3. **Verify webhook events:**
- Check Stripe Dashboard → Developers → Webhooks
- View event logs and delivery status

---

## 🔄 Payment Flow

### 1. User Initiates Checkout
```
Frontend → POST /api/stripe/checkout → Stripe Checkout Session Created
```

### 2. User Completes Payment
```
User → Stripe Checkout Page → Payment Processed
```

### 3. Webhook Confirms Subscription
```
Stripe → POST /api/stripe/webhook → Subscription Created in Database
```

### 4. User Gets Access
```
Database → Subscription Active → User Can Access Premium Features
```

---

## 📊 Database Schema

Subscriptions are stored in the `subscriptions` table:

```sql
CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  status TEXT NOT NULL, -- active, canceled, past_due, etc.
  price_id TEXT NOT NULL,
  current_period_start INTEGER NOT NULL,
  current_period_end INTEGER NOT NULL,
  cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

---

## 🚀 Frontend Integration

### Example Checkout Button

```typescript
'use client'

import { useState } from 'react'

export function SubscribeButton({ plan }: { plan: 'monthly' | 'annual' }) {
  const [loading, setLoading] = useState(false)

  async function handleCheckout() {
    setLoading(true)

    try {
      const response = await fetch(
        'https://peptalk-api.polished-glitter-23bb.workers.dev/api/stripe/checkout',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include', // Send session cookie
          body: JSON.stringify({ priceId: plan }),
        }
      )

      const { url } = await response.json()

      if (url) {
        window.location.href = url // Redirect to Stripe
      }
    } catch (error) {
      console.error('Checkout failed:', error)
      alert('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button onClick={handleCheckout} disabled={loading}>
      {loading ? 'Loading...' : `Subscribe ${plan}`}
    </button>
  )
}
```

---

## ⚠️ Important Notes

### Authentication Required
- Users must be logged in to create checkout sessions
- Session cookie is checked on `/api/stripe/checkout`
- Magic link auth must be implemented first

### Webhook Signature Verification
- All webhook requests are verified with Stripe signature
- Invalid signatures are rejected automatically
- Protects against webhook spoofing

### Error Handling
- Failed payments trigger `customer.subscription.updated` with status
- Webhook failures are logged to Cloudflare logs
- Use `wrangler tail` to monitor webhook processing

---

## 📝 Next Steps

1. ✅ Stripe routes deployed
2. ⏳ Configure webhook in Stripe Dashboard
3. ⏳ Test checkout flow with test card
4. ⏳ Implement frontend subscribe page
5. ⏳ Add customer portal for subscription management

---

## 🔗 Quick Links

- **Stripe Dashboard:** https://dashboard.stripe.com
- **Webhooks:** https://dashboard.stripe.com/webhooks
- **API Keys:** https://dashboard.stripe.com/apikeys
- **Test Cards:** https://stripe.com/docs/testing#cards

---

**Questions?** Check Stripe docs or test the endpoints with cURL!
