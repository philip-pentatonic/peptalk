# Enable R2 and KV in Cloudflare Dashboard

You need to enable R2 Storage in your Cloudflare dashboard before creating buckets.

---

## 🗄️ Enable R2 Storage

**Why R2?** For storing generated PDF files.

### Steps:

1. **Go to R2:** https://dash.cloudflare.com/ec358c7d7cf76532fe1a4160b10a8247/r2/overview

2. **Click "Purchase R2 Plan"** (It's FREE!)
   - Free tier includes:
     - 10 GB storage
     - 1 million Class A operations/month
     - 10 million Class B operations/month
   - No credit card required for free tier

3. **Accept the terms**

4. **Done!** R2 is now enabled

---

## 🔑 Enable Workers KV

**Why KV?** For rate limiting API requests.

### Steps:

1. **Go to KV:** https://dash.cloudflare.com/ec358c7d7cf76532fe1a4160b10a8247/workers/kv/namespaces

2. **Should already be enabled** (comes with Workers)
   - If you see "Create namespace" button, it's ready
   - Free tier: 100,000 operations/day

---

## 📋 After Enabling

Once R2 is enabled, run these commands:

```bash
# Create R2 bucket
source .env && wrangler r2 bucket create peptalk-pdfs

# Create KV namespace
source .env && wrangler kv:namespace create RATE_LIMIT

# Get the KV namespace ID and update wrangler.toml
```

---

## ✅ Quick Links

- **Your R2 Dashboard:** https://dash.cloudflare.com/ec358c7d7cf76532fe1a4160b10a8247/r2
- **Your KV Dashboard:** https://dash.cloudflare.com/ec358c7d7cf76532fe1a4160b10a8247/workers/kv
- **Your D1 Dashboard:** https://dash.cloudflare.com/ec358c7d7cf76532fe1a4160b10a8247/d1

---

**After you enable R2, come back and I'll create the bucket and KV namespace!** 🚀
