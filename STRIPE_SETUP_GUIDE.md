# Stripe Setup Guide for PepTalk

**Complete step-by-step guide to setting up Stripe for PepTalk subscriptions**

---

## 🔗 Sign Up for Stripe

**Sign up here:** https://dashboard.stripe.com/register

1. **Create Account:**
   - Enter your email address
   - Create a password
   - Click "Create account"

2. **Verify Email:**
   - Check your email for verification link
   - Click to verify your account

3. **Business Information:**
   - You can skip this for now (test mode works without it)
   - Or fill in basic info: business name, country, etc.

---

## 🔑 Step 1: Get Your API Keys

### Test Mode Keys (Start Here)

1. Go to: https://dashboard.stripe.com/test/apikeys

2. You'll see two keys:
   - **Publishable key** (starts with `pk_test_`)
   - **Secret key** (starts with `sk_test_`)

3. Click "Reveal test key" on the Secret key

4. Copy both keys:
   ```bash
   # Add to your .env file
   STRIPE_SECRET_KEY=sk_test_51xxxxxxxxxxxxx
   STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
   ```

### Production Keys (For Launch)

1. **Activate your account** by completing business verification
2. Go to: https://dashboard.stripe.com/apikeys
3. Copy the live keys (start with `pk_live_` and `sk_live_`)
4. **Never commit these to git!**

---

## 💰 Step 2: Create Your Products

**You've already done this!** ✅

Your pricing structure:
- **£10/month** - Monthly subscription
- **£90/year** - Annual subscription (save £30/year!)

### Find Your Price IDs

1. **Go to Products:** https://dashboard.stripe.com/test/products

2. **Click on your PepTalk Premium product**

3. **You'll see two prices:**
   - Monthly: `price_xxxxxxxxxxxxx` (£10/month)
   - Annual: `price_xxxxxxxxxxxxx` (£90/year)

4. **Copy both Price IDs** - you'll need them in your code

### Pricing Strategy Benefits

**Monthly (£10):**
- Lower barrier to entry
- Good for trial users
- Recurring revenue: £120/year per user

**Annual (£90):**
- 25% discount (save £30)
- Better cash flow upfront
- Higher customer commitment
- £90 immediate revenue

**Most SaaS companies see 60-70% choose annual** when given a 20-25% discount!

---

## ⚙️ Step 3: Configure Your Code

### Update Stripe Routes for Dual Pricing

You need to update the code to handle both monthly and annual options.

**Option 1: Pass price ID from frontend (Recommended)**

Update `apps/workers/src/routes/stripe-routes.ts` line ~19:

```typescript
stripe.post('/checkout', async (c) => {
  try {
    const db = c.env.DB
    const lucia = initLucia(db)
    const stripeClient = initStripe(c.env.STRIPE_API_KEY)

    // Get price ID from request body
    const body = await c.req.json()
    const { priceId } = body  // 'monthly' or 'annual'

    // Map to actual Stripe price IDs
    const priceIds = {
      monthly: c.env.STRIPE_PRICE_ID_MONTHLY,  // £10/month
      annual: c.env.STRIPE_PRICE_ID_ANNUAL,    // £90/year
    }

    const selectedPriceId = priceIds[priceId] || priceIds.annual

    // ... rest of checkout logic
    const checkoutSession = await createCheckoutSession(stripeClient, {
      priceId: selectedPriceId,  // Use selected price
      // ... other config
    })
```

### Add to Environment Variables

```bash
# Add to your .env file
STRIPE_SECRET_KEY=sk_test_51xxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx

# Both price IDs
STRIPE_PRICE_ID_MONTHLY=price_xxxxxxxxxxxxx  # £10/month
STRIPE_PRICE_ID_ANNUAL=price_xxxxxxxxxxxxx   # £90/year
```

### Add to Cloudflare Workers Secrets

```bash
cd apps/workers

wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_PRICE_ID_MONTHLY
wrangler secret put STRIPE_PRICE_ID_ANNUAL
wrangler secret put STRIPE_WEBHOOK_SECRET
```

---

## 🔗 Step 4: Set Up Webhooks (After Deploying Workers)

Webhooks let Stripe notify your app about subscription events.

### Why Webhooks?

When a user:
- ✅ Completes checkout → You get notified
- ✅ Subscription renews → You get notified
- ✅ Payment fails → You get notified
- ✅ Cancels subscription → You get notified

### Deploy Workers First

```bash
cd apps/workers
wrangler deploy
```

You'll get a URL like: `https://peptalk-api.your-subdomain.workers.dev`

### Create Webhook Endpoint

1. **Go to Webhooks:** https://dashboard.stripe.com/test/webhooks

2. **Click "Add endpoint"**

3. **Endpoint URL:**
   ```
   https://peptalk-api.your-subdomain.workers.dev/api/stripe/webhook
   ```

4. **Select events to listen to:**
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `customer.subscription.paused`
   - `customer.subscription.resumed`

5. **Click "Add endpoint"**

6. **Reveal webhook signing secret:**
   - Click on your webhook endpoint
   - Click "Reveal" under "Signing secret"
   - Copy the secret (starts with `whsec_`)

7. **Add to Cloudflare Workers secrets:**
   ```bash
   cd apps/workers
   wrangler secret put STRIPE_WEBHOOK_SECRET
   # Paste: whsec_xxxxxxxxxxxxx
   ```

---

## 🧪 Step 5: Test Your Integration

### Test Checkout Flow

1. **Start your frontend:**
   ```bash
   cd apps/web
   npm run dev
   ```

2. **Navigate to subscribe page:**
   ```
   http://localhost:3000/subscribe
   ```

3. **Click "Subscribe" button**

4. **Use Stripe test card:**
   ```
   Card number: 4242 4242 4242 4242
   Expiry: Any future date (e.g., 12/34)
   CVC: Any 3 digits (e.g., 123)
   ZIP: Any 5 digits (e.g., 12345)
   ```

5. **Complete checkout**

6. **Check your terminal** - you should see webhook events!

### Test Webhook Locally

Use Stripe CLI to forward webhooks to localhost:

```bash
# Install Stripe CLI
# macOS:
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local Workers
stripe listen --forward-to http://localhost:8787/api/stripe/webhook

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.created
```

---

## 📊 Step 6: Monitor Subscriptions

### View Subscriptions

**Test Mode:** https://dashboard.stripe.com/test/subscriptions
**Live Mode:** https://dashboard.stripe.com/subscriptions

You can see:
- Active subscriptions
- Revenue
- Churn rate
- Payment failures

### View Customers

**Test Mode:** https://dashboard.stripe.com/test/customers
**Live Mode:** https://dashboard.stripe.com/customers

Each customer shows:
- Email
- Subscription status
- Payment methods
- Billing history

### View Webhooks

**Test Mode:** https://dashboard.stripe.com/test/webhooks
**Live Mode:** https://dashboard.stripe.com/webhooks

Monitor:
- Successful deliveries
- Failed deliveries (with retry info)
- Event details and payloads

---

## 🎨 Step 7: Customize Checkout (Optional)

### Branded Checkout

1. **Go to Branding:** https://dashboard.stripe.com/settings/branding

2. **Upload your logo**

3. **Choose brand colors**

4. **Checkout automatically uses your branding!**

### Checkout Settings

1. **Go to Checkout:** https://dashboard.stripe.com/settings/checkout

2. **Configure:**
   - Allow promotion codes (discount codes)
   - Collect customer addresses
   - Collect phone numbers
   - Custom fields

---

## 🔐 Step 8: Customer Portal

The Customer Portal lets users manage their own subscriptions.

### Enable Customer Portal

1. **Go to:** https://dashboard.stripe.com/test/settings/billing/portal

2. **Enable portal**

3. **Configure features:**
   - ✅ Cancel subscriptions (immediate or at period end)
   - ✅ Update payment methods
   - ✅ View billing history
   - ✅ Update billing information

4. **Save changes**

### Portal Already Works in PepTalk!

Users can access it at: `https://your-app.com/account`

The code is in: `apps/workers/src/routes/stripe-routes.ts:62`

---

## 💳 Test Cards

### Successful Payments

```
4242 4242 4242 4242 - Visa (succeeds)
5555 5555 5555 4444 - Mastercard (succeeds)
3782 822463 10005   - American Express (succeeds)
```

### Failed Payments

```
4000 0000 0000 0002 - Decline (card declined)
4000 0000 0000 9995 - Decline (insufficient funds)
4000 0000 0000 0069 - Decline (expired card)
```

### 3D Secure (SCA)

```
4000 0027 6000 3184 - 3D Secure required (authenticate)
4000 0025 0000 3155 - 3D Secure required (fails auth)
```

### All test cards use:
- **Expiry:** Any future date
- **CVC:** Any 3 digits
- **ZIP:** Any valid postal code

---

## 🚀 Step 9: Go Live Checklist

Before activating live mode:

### Account Verification

1. **Complete business profile:** https://dashboard.stripe.com/settings/public
   - Business name
   - Business type
   - Business address
   - Phone number
   - Industry

2. **Verify your identity:**
   - Upload ID (driver's license, passport)
   - Provide tax information (EIN or SSN)
   - Add bank account for payouts

3. **Review and submit**

### Update Environment Variables

```bash
# Replace test keys with live keys
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx
STRIPE_PRICE_ID=price_xxxxxxxxxxxxx  # Live price ID
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx  # Live webhook secret
```

### Create Live Webhook

1. Go to: https://dashboard.stripe.com/webhooks
2. Add endpoint with your production URL
3. Select same events as test mode
4. Update webhook secret

### Test Live Integration

Use a real card (will charge $0.50 for verification)

---

## 💰 Pricing & Fees

### Stripe Pricing

**Standard Pricing:**
- 2.9% + $0.30 per successful charge
- No monthly fees
- No setup fees
- No hidden costs

**Example:**
- User pays $99/year
- Stripe fee: ($99 × 0.029) + $0.30 = $3.17
- You receive: $95.83

### Payout Schedule

**Default:** 2-day rolling basis
- Charge on Monday → Payout on Wednesday
- Charge on Friday → Payout on Tuesday

**Can be changed to:**
- Daily
- Weekly  
- Monthly

---

## 🔍 Important Stripe Dashboard Pages

### Test Mode
- **Dashboard:** https://dashboard.stripe.com/test
- **API Keys:** https://dashboard.stripe.com/test/apikeys
- **Products:** https://dashboard.stripe.com/test/products
- **Subscriptions:** https://dashboard.stripe.com/test/subscriptions
- **Customers:** https://dashboard.stripe.com/test/customers
- **Webhooks:** https://dashboard.stripe.com/test/webhooks
- **Logs:** https://dashboard.stripe.com/test/logs

### Live Mode
- **Dashboard:** https://dashboard.stripe.com
- **API Keys:** https://dashboard.stripe.com/apikeys
- **Products:** https://dashboard.stripe.com/products
- **Settings:** https://dashboard.stripe.com/settings

---

## 🆘 Troubleshooting

### "No such price" error

**Problem:** Price ID doesn't exist or wrong mode (test vs live)

**Solution:**
1. Check you're in test mode in Stripe Dashboard
2. Verify price ID copied correctly
3. Make sure using `price_` not `prod_` ID

### Webhook not receiving events

**Problem:** Webhook secret mismatch or endpoint unreachable

**Solution:**
1. Verify webhook URL is correct
2. Check Workers logs: `wrangler tail`
3. Verify webhook secret matches
4. Check Stripe webhook logs for errors

### "Invalid API Key" error

**Problem:** Using wrong key or test/live mode mismatch

**Solution:**
1. Verify using `sk_test_` for test mode
2. Check key not revoked in dashboard
3. Ensure Workers secret set correctly

### Payment fails immediately

**Problem:** Test card not recognized

**Solution:**
- Use official Stripe test cards only
- Don't use real card numbers in test mode
- Check test mode is enabled

---

## 📚 Useful Stripe Resources

- **Documentation:** https://stripe.com/docs
- **API Reference:** https://stripe.com/docs/api
- **Webhooks Guide:** https://stripe.com/docs/webhooks
- **Testing Guide:** https://stripe.com/docs/testing
- **Checkout Docs:** https://stripe.com/docs/payments/checkout
- **Support:** https://support.stripe.com

---

## ✅ Quick Setup Checklist

- [ ] Sign up for Stripe account
- [ ] Get test API keys (publishable + secret)
- [ ] Create annual product ($99/year)
- [ ] Copy price ID
- [ ] Update stripe-routes.ts with price ID
- [ ] Add API keys to .env file
- [ ] Deploy Workers to Cloudflare
- [ ] Create webhook endpoint in Stripe
- [ ] Add webhook secret to Workers
- [ ] Test checkout with test card
- [ ] Verify webhook events received
- [ ] Enable Customer Portal
- [ ] Complete account verification (for live mode)
- [ ] Get live API keys
- [ ] Create live product and webhook
- [ ] Go live! 🚀

---

**Total setup time:** ~30 minutes

**You're now ready to accept subscriptions!** 💳✨
