# Stripe Webhook Configuration - Quick Setup

## 🚀 5-Minute Setup

### Your Webhook URL
```
https://peptalk-api.polished-glitter-23bb.workers.dev/api/stripe/webhook
```

### Step-by-Step Instructions

1. **Go to Stripe Webhooks**
   - Direct link: https://dashboard.stripe.com/webhooks
   - Or: Dashboard → Developers → Webhooks

2. **Click "+ Add endpoint"**

3. **Enter endpoint URL:**
   ```
   https://peptalk-api.polished-glitter-23bb.workers.dev/api/stripe/webhook
   ```

4. **Select events to listen to:**
   ```
   ✓ customer.subscription.created
   ✓ customer.subscription.updated
   ✓ customer.subscription.deleted
   ```

5. **Click "Add endpoint"**

6. **Verify signing secret:**
   - Click on the newly created webhook
   - Click "Reveal" under "Signing secret"
   - It should match: `whsec_qJwjYeIDn5YyWwoVetkhhr2cgC0pWRT1`
   - If different, update your Workers secret

### If You Need to Update the Signing Secret

```bash
cd apps/workers
source ../../.env
export CLOUDFLARE_API_TOKEN

# Replace with your actual signing secret from Stripe
echo "whsec_YOUR_ACTUAL_SECRET" | wrangler secret put STRIPE_WEBHOOK_SECRET --env=""
```

---

## ✅ Verification

After setup, test the webhook:

1. Go to your webhook in Stripe Dashboard
2. Click "Send test webhook"
3. Select event: `customer.subscription.created`
4. Click "Send test webhook"
5. Check the response - should be 200 OK

---

## 📊 Monitoring Webhooks

### View Webhook Logs in Stripe
- Go to: https://dashboard.stripe.com/webhooks
- Click on your webhook endpoint
- View "Recent events" tab

### View Webhook Logs in Cloudflare
```bash
cd apps/workers
wrangler tail --env=""
```

Then trigger a webhook event in Stripe to see live logs.

---

## 🧪 Test Events

Once configured, you can test by:

1. Creating a test subscription in Stripe Dashboard
2. Using Stripe CLI (optional):
   ```bash
   stripe listen --forward-to https://peptalk-api.polished-glitter-23bb.workers.dev/api/stripe/webhook
   stripe trigger customer.subscription.created
   ```

---

## ⚠️ Important

- Webhook is **already deployed** and ready
- Webhook handles signature verification automatically
- Invalid signatures are rejected (security)
- Events are processed and saved to D1 database

---

**That's it!** Once configured, your payment flow is complete. 🎉
