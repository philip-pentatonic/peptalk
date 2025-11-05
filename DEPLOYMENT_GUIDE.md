# PepTalk - Complete Deployment Guide

**Last Updated:** 2025-11-04
**Status:** Production Deployment Checklist

---

## 🔑 Required API Keys & Services

### 1. Cloudflare Account (FREE to start)

**Sign up:** https://dash.cloudflare.com/sign-up

**Required Services:**
- ✅ Cloudflare Pages (Frontend hosting) - FREE
- ✅ Cloudflare Workers (API hosting) - FREE tier: 100k requests/day
- ✅ D1 Database (SQLite) - FREE tier: 5GB storage, 5M reads/day
- ✅ R2 Storage (PDFs) - FREE tier: 10GB storage
- ✅ KV Namespace (Rate limiting) - FREE tier: 100k reads/day

**Cost:** $0/month for MVP, scales to ~$5-10/month with usage

**Setup Steps:**
```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# This will open a browser for OAuth authentication
```

---

### 2. Anthropic (Claude 4.5) - REQUIRED for Research Pipeline

**Sign up:** https://console.anthropic.com/

**Get API Key:**
1. Go to https://console.anthropic.com/settings/keys
2. Click "Create Key"
3. Copy the key (starts with `sk-ant-`)

**Pricing:**
- Claude Sonnet 4.5: $3 per million input tokens, $15 per million output tokens
- **Estimated cost per peptide:** $3-4
- **Initial 20 peptides:** ~$80

**Environment Variable:**
```bash
ANTHROPIC_API_KEY=sk-ant-api03-xxx
```

---

### 3. OpenAI (GPT-5) - REQUIRED for Compliance Validation

**Sign up:** https://platform.openai.com/signup

**Get API Key:**
1. Go to https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Copy the key (starts with `sk-`)

**Pricing:**
- GPT-5: Check latest pricing at https://openai.com/pricing
- **Estimated cost per peptide:** $1-2
- **Initial 20 peptides:** ~$40

**Environment Variable:**
```bash
OPENAI_API_KEY=sk-xxx
```

---

### 4. Resend (Email Service) - REQUIRED for Magic Links

**Sign up:** https://resend.com/signup

**Get API Key:**
1. Go to https://resend.com/api-keys
2. Click "Create API Key"
3. Copy the key (starts with `re_`)

**Pricing:**
- FREE tier: 3,000 emails/month
- Paid: $20/month for 50,000 emails

**Initial Setup:**
- Verify your domain (or use Resend's test domain)
- Configure SPF/DKIM records for deliverability

**Environment Variable:**
```bash
RESEND_API_KEY=re_xxx
```

---

### 5. Stripe (Payments) - REQUIRED for Subscriptions

**Sign up:** https://dashboard.stripe.com/register

**Get API Keys:**
1. Go to https://dashboard.stripe.com/test/apikeys
2. Copy "Publishable key" (starts with `pk_test_`)
3. Copy "Secret key" (starts with `sk_test_`)

**Create Product:**
1. Go to https://dashboard.stripe.com/test/products
2. Click "Add product"
3. Name: "PepTalk Premium"
4. Price: $99/year (or $8.25/month billed annually)
5. Copy the Price ID (starts with `price_`)

**Setup Webhook:**
1. Go to https://dashboard.stripe.com/test/webhooks
2. Click "Add endpoint"
3. Endpoint URL: `https://your-api.workers.dev/api/stripe/webhook`
4. Events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy the Signing Secret (starts with `whsec_`)

**Pricing:**
- 2.9% + $0.30 per successful charge
- No monthly fees

**Environment Variables:**
```bash
STRIPE_API_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_ID=price_xxx
```

---

### 6. PubMed E-utilities (Optional - Rate Limit Increase)

**Sign up:** https://www.ncbi.nlm.nih.gov/account/

**Get API Key:**
1. Go to https://www.ncbi.nlm.nih.gov/account/settings/
2. Scroll to "API Key Management"
3. Click "Create an API Key"

**Benefits:**
- WITHOUT key: 3 requests/second
- WITH key: 10 requests/second

**Required Information:**
```bash
PUBMED_EMAIL=your@email.com
PUBMED_API_KEY=xxx (optional but recommended)
```

---

## 📋 Complete Environment Variables

### For Cloudflare Workers (Production API)

Set these using Wrangler CLI:

```bash
# Navigate to workers directory
cd apps/workers

# Set secrets (interactive prompts)
wrangler secret put RESEND_API_KEY
wrangler secret put STRIPE_API_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET
wrangler secret put JWT_SECRET

# JWT_SECRET can be any random string, generate with:
openssl rand -base64 32
```

### For Research Pipeline CLI (Local/Server)

Create `.env` file in project root:

```bash
# PubMed API
PUBMED_EMAIL=your@email.com
PUBMED_API_KEY=your_ncbi_api_key_here

# Anthropic (Claude)
ANTHROPIC_API_KEY=sk-ant-api03-xxx

# OpenAI (GPT)
OPENAI_API_KEY=sk-xxx

# Cloudflare (for publisher module)
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_api_token
CLOUDFLARE_D1_DATABASE_ID=your_d1_id
CLOUDFLARE_R2_BUCKET=peptalk-pdfs

# R2 public URL (after setup)
R2_PUBLIC_URL=https://pub-xxx.r2.dev
```

### For Frontend (Next.js)

Create `apps/web/.env.local`:

```bash
# API endpoint
NEXT_PUBLIC_API_URL=https://your-api.workers.dev

# Or for local development:
NEXT_PUBLIC_API_URL=http://localhost:8787
```

---

## 🚀 Step-by-Step Deployment

### Phase 1: Cloudflare Setup (15 minutes)

**1. Create D1 Database:**
```bash
# Create database
wrangler d1 create peptalk-db

# Output will show database ID, save it
# Database created: peptalk-db (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)

# Update wrangler.toml with database ID
nano apps/workers/wrangler.toml
# Replace YOUR_D1_DATABASE_ID with actual ID
```

**2. Run Database Migration:**
```bash
# Run SQL migration
wrangler d1 execute peptalk-db --file=packages/database/migrations/0001-initial.sql

# Verify tables created
wrangler d1 execute peptalk-db --command="SELECT name FROM sqlite_master WHERE type='table'"
```

**3. Create R2 Bucket:**
```bash
# Create bucket for PDFs
wrangler r2 bucket create peptalk-pdfs

# Bucket created successfully
```

**4. Create KV Namespace:**
```bash
# Create KV for rate limiting
wrangler kv:namespace create RATE_LIMIT

# Output will show namespace ID, save it
# Created namespace with id "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# Update wrangler.toml with KV ID
nano apps/workers/wrangler.toml
# Replace YOUR_KV_NAMESPACE_ID with actual ID
```

---

### Phase 2: Configure Stripe (10 minutes)

**1. Create Product in Stripe Dashboard:**
- Go to https://dashboard.stripe.com/test/products
- Click "Add product"
- Name: "PepTalk Premium Annual"
- Description: "Unlimited access to peptide research pages with citations"
- Pricing model: Standard pricing
- Price: $99.00 USD
- Billing period: Yearly
- Click "Save product"
- **Copy the Price ID** (starts with `price_`)

**2. Update Code with Price ID:**
```bash
# Edit stripe routes
nano apps/workers/src/routes/stripe-routes.ts

# Find line: priceId: 'price_YOUR_STRIPE_PRICE_ID'
# Replace with your actual price ID: priceId: 'price_xxx'
```

**3. Setup Webhook (do this AFTER deploying Workers):**
```bash
# Deploy workers first, then get the URL
wrangler deploy

# Output shows: Published peptalk-api
#               https://peptalk-api.your-subdomain.workers.dev

# Go to Stripe Dashboard > Webhooks
# Add endpoint: https://peptalk-api.your-subdomain.workers.dev/api/stripe/webhook
# Select events, get webhook secret, update Workers secrets
```

---

### Phase 3: Deploy Workers API (5 minutes)

```bash
# Navigate to workers
cd apps/workers

# Install dependencies
pnpm install

# Build
pnpm build

# Set all secrets
wrangler secret put RESEND_API_KEY
# Paste your Resend API key

wrangler secret put STRIPE_API_KEY
# Paste your Stripe secret key

wrangler secret put STRIPE_WEBHOOK_SECRET
# Paste your Stripe webhook secret (after creating webhook)

wrangler secret put JWT_SECRET
# Generate and paste: openssl rand -base64 32

# Deploy!
wrangler deploy

# Output:
# Published peptalk-api
# https://peptalk-api.your-subdomain.workers.dev
```

**Test API:**
```bash
curl https://peptalk-api.your-subdomain.workers.dev/
# Should return: {"status":"ok","version":"1.0.0","timestamp":"..."}
```

---

### Phase 4: Deploy Frontend (10 minutes)

**Option A: Cloudflare Pages (Recommended)**

1. **Via Dashboard (Easiest):**
   - Go to https://dash.cloudflare.com/pages
   - Click "Create application" > "Pages" > "Connect to Git"
   - Select your GitHub repo
   - Build settings:
     - Framework: Next.js
     - Build command: `cd apps/web && pnpm install && pnpm build`
     - Build output: `apps/web/out`
   - Environment variables:
     - `NEXT_PUBLIC_API_URL`: Your Workers URL
   - Click "Save and Deploy"

2. **Via Wrangler CLI:**
```bash
cd apps/web

# Build static export
pnpm build

# Deploy to Pages
wrangler pages deploy out --project-name=peptalk-web
```

**Option B: Vercel (Alternative)**
```bash
cd apps/web
vercel --prod
```

---

### Phase 5: Process Initial Peptides (30-60 minutes)

**1. Create peptides YAML file:**
```bash
# Create peptides.yaml
cat > peptides.yaml << 'EOF'
peptides:
  - id: bpc-157
    name: BPC-157
    aliases:
      - Body Protection Compound
      - Pentadecapeptide BPC 157

  - id: tb-500
    name: TB-500
    aliases:
      - Thymosin Beta-4

  - id: ghk-cu
    name: GHK-Cu
    aliases:
      - Copper Peptide
      - GHK Copper
EOF
```

**2. Set up CLI environment:**
```bash
# Create .env file
cat > .env << 'EOF'
PUBMED_EMAIL=your@email.com
PUBMED_API_KEY=your_key_here
ANTHROPIC_API_KEY=sk-ant-xxx
OPENAI_API_KEY=sk-xxx
EOF

# Load environment
export $(cat .env | xargs)
```

**3. Run research pipeline:**
```bash
# Install dependencies
cd packages/research
pnpm install

# Process peptides
pnpm cli batch ../../peptides.yaml --report=report.md

# Monitor progress - this will:
# 1. Fetch studies from PubMed + ClinicalTrials
# 2. Synthesize content with Claude 4.5
# 3. Validate with GPT-5
# 4. Generate PDFs
# 5. Upload to D1 + R2

# Estimated time: 2-3 minutes per peptide
# Cost: ~$5 per peptide
```

---

## ✅ Verification Checklist

### Cloudflare Resources
- [ ] D1 database created and migrated
- [ ] R2 bucket created
- [ ] KV namespace created
- [ ] Workers deployed and accessible
- [ ] Pages deployed and accessible

### API Keys Set
- [ ] Anthropic API key (for Claude)
- [ ] OpenAI API key (for GPT)
- [ ] Resend API key (for emails)
- [ ] Stripe API keys (secret + publishable)
- [ ] Stripe webhook configured
- [ ] JWT secret generated
- [ ] PubMed email configured

### Functionality Tests
- [ ] API health check returns 200
- [ ] Frontend loads correctly
- [ ] Can search peptides (after processing)
- [ ] Can view peptide detail
- [ ] Magic link emails send
- [ ] Authentication works
- [ ] Stripe checkout opens
- [ ] Webhooks receive events

### Research Pipeline
- [ ] CLI can connect to PubMed
- [ ] Claude 4.5 synthesis works
- [ ] GPT-5 validation works
- [ ] PDFs generate correctly
- [ ] Data saves to D1
- [ ] PDFs upload to R2

---

## 💰 Cost Summary

### Initial Setup (One-Time)
- **Cloudflare:** $0 (free tier)
- **Stripe:** $0 (no monthly fee)
- **Resend:** $0 (free tier)
- **API Keys:** $0 to set up
- **Domain (optional):** $10-15/year

### First Content Generation (One-Time)
- **20 peptides × $5 each:** $100
- **Developer time:** $0 (you're doing it!)

### Monthly Operating Costs
- **Cloudflare:** $0-10 (depends on usage)
- **LLM updates:** $80-120 (5 peptides/week)
- **Resend:** $0 (free tier covers 3k emails)
- **Stripe fees:** 2.9% + $0.30 per transaction

**Total Monthly:** ~$80-130

### Revenue
- **15 subscribers @ $99/year:** $123.75/month → Break-even
- **25 subscribers @ $99/year:** $206.25/month → Profitable
- **50 subscribers @ $99/year:** $412.50/month → Very profitable

---

## 🆘 Troubleshooting

### "Database not found" error
```bash
# Verify D1 database exists
wrangler d1 list

# Check wrangler.toml has correct database_id
# Re-run migration if needed
wrangler d1 execute peptalk-db --file=packages/database/migrations/0001-initial.sql
```

### "Unauthorized" errors in API
```bash
# Verify secrets are set
wrangler secret list

# Re-set any missing secrets
wrangler secret put SECRET_NAME
```

### Magic link emails not sending
```bash
# Check Resend API key is set
wrangler secret list | grep RESEND

# Verify email domain is configured in Resend dashboard
# Check Resend logs: https://resend.com/logs
```

### Stripe webhook not working
```bash
# Verify webhook is configured with correct URL
# Check webhook signing secret matches
# Test webhook: stripe listen --forward-to localhost:8787/api/stripe/webhook
```

### PDFs not generating
```bash
# Verify R2 bucket exists
wrangler r2 bucket list

# Check bucket binding in wrangler.toml
# Verify Puppeteer dependencies are installed
```

---

## 📞 Support Resources

### Cloudflare
- Docs: https://developers.cloudflare.com/
- Discord: https://discord.gg/cloudflaredev

### Stripe
- Docs: https://stripe.com/docs
- Support: https://support.stripe.com/

### Anthropic (Claude)
- Docs: https://docs.anthropic.com/
- Support: support@anthropic.com

### OpenAI
- Docs: https://platform.openai.com/docs
- Support: https://help.openai.com/

### Resend
- Docs: https://resend.com/docs
- Support: support@resend.com

---

## 🎯 Next: Launch Checklist

After deployment is complete:

- [ ] Test all user flows end-to-end
- [ ] Set up monitoring (Sentry, LogTail)
- [ ] Configure custom domain
- [ ] Set up SSL/HTTPS (automatic with Cloudflare)
- [ ] Create Terms of Service page
- [ ] Create Privacy Policy page
- [ ] Set up Google Analytics (optional)
- [ ] Prepare launch announcement
- [ ] Create social media accounts
- [ ] Design marketing materials
- [ ] Plan first 100 users strategy

---

**You now have everything you need to deploy PepTalk to production!**

**Estimated total setup time:** 1-2 hours
**Total upfront cost:** ~$100 (mostly LLM for content)
**Monthly recurring:** ~$100-150

Good luck with your launch! 🚀
