# Update Cloudflare API Token Permissions

Your API token needs additional permissions to manage Workers secrets.

---

## 🔑 Update Token Permissions

**Go to your API tokens:** https://dash.cloudflare.com/ec358c7d7cf76532fe1a4160b10a8247/profile/api-tokens

### Find Your Token

Look for the token you created: `TNNJaf7mLQpYswSUH_yH2h1kSSzXdIIVh0IgCHQI`

### Click "Edit" and ensure these permissions:

**Account Permissions:**
- ✅ Account Settings: Read
- ✅ Workers R2 Storage: Edit
- ✅ Workers KV Storage: Edit
- ✅ D1: Edit
- ✅ **Workers Scripts: Edit** ← ADD THIS!

### Save Changes

---

## Alternative: Use Wrangler Login (Easier!)

Instead of managing API tokens, you can use OAuth:

```bash
# Remove API token from .env
# Comment out: CLOUDFLARE_API_TOKEN=...

# Login with OAuth
wrangler logout
wrangler login
```

This will open your browser and grant all permissions automatically.

---

## After Updating Permissions

Once your token has the correct permissions, set the Workers secrets:

```bash
cd apps/workers

# Set all secrets
source ../../.env && export CLOUDFLARE_API_TOKEN

echo "$RESEND_API_KEY" | wrangler secret put RESEND_API_KEY --env=""
echo "$STRIPE_SECRET_KEY" | wrangler secret put STRIPE_API_KEY --env=""
echo "$STRIPE_WEBHOOK_SECRET" | wrangler secret put STRIPE_WEBHOOK_SECRET --env=""
openssl rand -base64 32 | wrangler secret put JWT_SECRET --env=""
echo "$STRIPE_PRICE_ID_MONTHLY" | wrangler secret put STRIPE_PRICE_ID_MONTHLY --env=""
echo "$STRIPE_PRICE_ID_ANNUAL" | wrangler secret put STRIPE_PRICE_ID_ANNUAL --env=""
```

---

**I recommend using `wrangler login` for easier setup!** 🚀
