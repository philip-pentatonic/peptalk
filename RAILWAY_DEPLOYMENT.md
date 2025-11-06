# Railway Deployment Guide

## Overview
This guide will help you deploy the PepTalk research pipeline service to Railway.

## Prerequisites
- Railway CLI installed: `npm install -g @railway/cli`
- Logged in to Railway: `railway login` (already done ✅)

## Step 1: Create Railway Project

You have two options:

### Option A: Using Railway Dashboard (Recommended)
1. Go to https://railway.app/new
2. Select "Deploy from GitHub repo" or "Empty Project"
3. Name it: `peptalk-research-pipeline`
4. Note the project ID from the URL

### Option B: Using Railway CLI
```bash
# Create new project (requires interactive input)
railway init

# Or link to existing project
railway link [project-id]
```

## Step 2: Configure Environment Variables

Set the following environment variables in Railway Dashboard or via CLI:

```bash
# Required API Keys
railway variables set PUBMED_EMAIL=your@email.com
railway variables set PUBMED_API_KEY=your_pubmed_api_key
railway variables set ANTHROPIC_API_KEY=your_anthropic_api_key
railway variables set OPENAI_API_KEY=your_openai_api_key

# Cloudflare R2 public URL (get this from Cloudflare dashboard)
railway variables set R2_PUBLIC_URL=https://your-bucket-url.r2.dev

# Port (Railway will set this automatically, but you can override)
railway variables set PORT=3000
```

## Step 3: Deploy to Railway

```bash
# Deploy the service
railway up

# Or if you prefer to deploy from the current directory
railway up --detach
```

Railway will:
1. Detect the `railway.json` configuration
2. Use `Dockerfile.research` to build the container
3. Install all dependencies
4. Build the packages
5. Start the Express server on port 3000

## Step 4: Get Railway Service URL

After deployment completes:

```bash
# Get the service domain
railway domain
```

Or find it in the Railway Dashboard under your service settings.

The URL will look like: `https://peptalk-research-pipeline-production.up.railway.app`

## Step 5: Configure Cloudflare Workers

Add the Railway service URL to your Cloudflare Workers environment:

```bash
cd apps/workers
source ../../.env
export CLOUDFLARE_API_TOKEN

# Set the Railway service URL
wrangler secret put RAILWAY_SERVICE_URL
# Enter your Railway URL when prompted (e.g., https://peptalk-research-pipeline-production.up.railway.app)
```

## Step 6: Test the Deployment

### Test Railway Service Health
```bash
curl https://your-railway-url.railway.app/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "research-pipeline"
}
```

### Test Research Pipeline Endpoint
```bash
curl -X POST https://your-railway-url.railway.app/process \
  -H "Content-Type: application/json" \
  -d '{
    "peptideId": "bpc-157",
    "name": "BPC-157",
    "aliases": ["Body Protection Compound"],
    "force": false
  }'
```

### Test Queue Flow (End-to-End)
```bash
# Trigger the ingest endpoint to add job to queue
curl -X POST https://peptalk-api.polished-glitter-23bb.workers.dev/api/ingest/run \
  -H "Content-Type: application/json" \
  -H "X-Cron-Secret: your-cron-secret" \
  -d '{
    "peptideId": "bpc-157",
    "force": false
  }'

# Monitor Cloudflare Workers logs to see queue processing
wrangler tail
```

## Architecture Overview

```
┌─────────────────────┐
│  Cloudflare Cron    │
│  (Weekly @ Sunday)  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  /api/ingest/run    │
│  (Cloudflare Worker)│
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Cloudflare Queue   │
│  research-pipeline  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Queue Consumer    │
│  (Cloudflare Worker)│
└──────────┬──────────┘
           │
           ▼ HTTP POST
┌─────────────────────┐
│  Railway Service    │
│  /process endpoint  │
│  - Fetch studies    │
│  - AI synthesis     │
│  - Compliance check │
│  - Save to D1/R2    │
└─────────────────────┘
```

## Monitoring

### Railway Logs
```bash
railway logs
```

### Cloudflare Workers Logs
```bash
cd apps/workers
wrangler tail
```

## Troubleshooting

### Issue: Build fails
- Check that all dependencies are in `package.json`
- Verify the Dockerfile paths are correct
- Check Railway build logs for specific errors

### Issue: Service starts but returns 500 errors
- Check Railway logs: `railway logs`
- Verify all environment variables are set
- Test the health endpoint

### Issue: Puppeteer errors
- The Dockerfile includes Chromium installation
- If issues persist, set `PUPPETEER_SKIP_DOWNLOAD=true`
- Consider disabling PDF generation temporarily with `--skip-pdf`

### Issue: Queue messages not processing
- Verify RAILWAY_SERVICE_URL is set in Cloudflare Workers
- Check that the Railway service is running and accessible
- Monitor both Railway and Cloudflare logs

## Cost Estimation

Railway Pricing (as of 2024):
- Hobby Plan: $5/month for 500 execution hours
- Pro Plan: $20/month for 500 execution hours + more resources

Expected usage:
- Weekly cron job processing ~10 peptides
- ~2 minutes per peptide = ~20 minutes/week
- ~1.5 hours/month
- **Estimated cost: ~$5-10/month**

## Next Steps

1. Complete Railway deployment following this guide
2. Test the end-to-end queue flow
3. Fix Puppeteer PDF generation issue if it occurs
4. Review AI-generated content quality
5. Add more peptides to the processing list
6. Set up monitoring and alerting
