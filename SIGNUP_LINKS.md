# 🔗 Complete Sign-Up Links for PepTalk

**All the services you need to sign up for to deploy PepTalk**

---

## ✅ Required Services

### 1. Cloudflare (Infrastructure)

**Sign up:** https://dash.cloudflare.com/sign-up

**What you need:**
- Cloudflare account (FREE)
- Already done! ✅ You're logged in with `wrangler login`

**Services used:**
- Workers (API hosting) - FREE: 100k requests/day
- Pages (Frontend hosting) - FREE
- D1 (Database) - FREE: 5GB storage
- R2 (PDF storage) - FREE: 10GB storage
- KV (Rate limiting) - FREE: 100k operations/day

**Cost:** $0/month on free tier

---

### 2. Anthropic (Claude 4.5)

**Sign up:** https://console.anthropic.com/

**Get API key:**
1. Go to: https://console.anthropic.com/settings/keys
2. Click "Create Key"
3. Name it: "PepTalk Research Pipeline"
4. Copy the key (starts with `sk-ant-`)

**Usage:**
- Content synthesis from research papers
- Cost: $3-4 per peptide

**Pricing:** https://www.anthropic.com/pricing

---

### 3. OpenAI (GPT-4/GPT-5)

**Sign up:** https://platform.openai.com/signup

**Get API key:**
1. Go to: https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Name it: "PepTalk Compliance"
4. Copy the key (starts with `sk-`)

**Usage:**
- Compliance validation
- Cost: $1-2 per peptide

**Pricing:** https://openai.com/pricing

---

### 4. Resend (Email Service)

**Sign up:** https://resend.com/signup

**Get API key:**
1. Go to: https://resend.com/api-keys
2. Click "Create API Key"
3. Name it: "PepTalk Production"
4. Copy the key (starts with `re_`)

**Usage:**
- Magic link emails for authentication
- FREE: 3,000 emails/month
- Paid: $20/month for 50,000 emails

**Domain setup:**
- Can use Resend's test domain for development
- Add your domain for production: https://resend.com/domains

---

### 5. Stripe (Payments)

**Sign up:** https://dashboard.stripe.com/register

**Get API keys:**
1. Go to: https://dashboard.stripe.com/test/apikeys
2. Copy "Publishable key" (starts with `pk_test_`)
3. Reveal and copy "Secret key" (starts with `sk_test_`)

**Create product:**
1. Go to: https://dashboard.stripe.com/test/products
2. Click "Add product"
3. Name: "PepTalk Premium Annual"
4. Price: $99/year
5. Copy the Price ID (starts with `price_`)

**Usage:**
- Subscription payments ($99/year)
- Fees: 2.9% + $0.30 per transaction

**Full guide:** See `STRIPE_SETUP_GUIDE.md`

---

### 6. PubMed E-utilities (Optional - Rate Limit)

**Sign up:** https://www.ncbi.nlm.nih.gov/account/

**Get API key:**
1. Go to: https://www.ncbi.nlm.nih.gov/account/settings/
2. Scroll to "API Key Management"
3. Click "Create an API Key"
4. Copy the key

**Already done!** ✅ Your key: `d0ea595e7682ffd69033c5ce732e17be1508`

**Usage:**
- Fetch research papers from PubMed
- Without key: 3 requests/second
- With key: 10 requests/second (3x faster!)

---

## 📋 Environment Variables Checklist

After signing up for all services, add these to your `.env` file:

```bash
# LLM APIs
ANTHROPIC_API_KEY=sk-ant-xxx
OPENAI_API_KEY=sk-xxx

# PubMed
PUBMED_EMAIL=your@email.com
PUBMED_API_KEY=d0ea595e7682ffd69033c5ce732e17be1508  # ✅ Done

# Cloudflare
CLOUDFLARE_ACCOUNT_ID=ec358c7d7cf76532fe1a4160b10a8247  # ✅ Done
CLOUDFLARE_API_TOKEN=xxx  # Not needed, using wrangler login

# Auth & Email
RESEND_API_KEY=re_xxx
LUCIA_SECRET=xxx  # Generate with: openssl rand -base64 32

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_PRICE_ID=price_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx  # After creating webhook

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8787  # Local dev
# NEXT_PUBLIC_API_URL=https://your-api.workers.dev  # Production
```

---

## 💰 Total Costs

### One-Time Setup
- **All services:** $0 (all have free tiers)
- **Initial content:** ~$100 (20 peptides × $5 each)

### Monthly Operating
- **Cloudflare:** $0-5
- **Resend:** $0 (free tier covers 3k emails)
- **Content updates:** $80-120 (depends on how many peptides)
- **Stripe fees:** 2.9% + $0.30 per transaction

**Total:** ~$80-125/month

### Break-Even
- **At $99/year per subscriber:**
- 15 subscribers = $123/month = Break-even
- 25 subscribers = $206/month = Profitable

---

## 🎯 Sign-Up Order (Recommended)

1. ✅ **Cloudflare** - Already done!
2. **Stripe** - Takes 5 minutes, start here
3. **Resend** - Quick sign-up, verify email
4. **Anthropic** - Create account, add billing
5. **OpenAI** - Create account, add billing
6. ✅ **PubMed** - Already done!

**Total time:** ~30 minutes

---

## 🔒 Security Best Practices

### DO:
- ✅ Store API keys in `.env` (already gitignored)
- ✅ Use test keys for development
- ✅ Rotate keys regularly
- ✅ Use different keys for dev/prod
- ✅ Enable 2FA on all services

### DON'T:
- ❌ Commit API keys to git
- ❌ Share keys in Slack/Discord
- ❌ Use production keys in development
- ❌ Hard-code keys in source code

---

## 📞 Support Links

- **Cloudflare:** https://discord.gg/cloudflaredev
- **Anthropic:** support@anthropic.com
- **OpenAI:** https://help.openai.com/
- **Resend:** support@resend.com
- **Stripe:** https://support.stripe.com/
- **PubMed:** https://support.nlm.nih.gov/

---

## ✅ Quick Status

| Service | Status | API Key |
|---------|--------|---------|
| Cloudflare | ✅ Logged in | Via wrangler |
| PubMed | ✅ Complete | `d0ea...1508` |
| Anthropic | ⏳ Sign up needed | - |
| OpenAI | ⏳ Sign up needed | - |
| Resend | ⏳ Sign up needed | - |
| Stripe | ⏳ Sign up needed | - |

---

**Next step:** Sign up for the remaining 4 services (takes ~30 minutes total)

**Then:** Follow `DEPLOYMENT_GUIDE.md` to deploy! 🚀
