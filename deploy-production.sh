#!/bin/bash

# Production Deployment Script
# Applies migrations, deploys API, and cleans up duplicates

set -e  # Exit on error

# Unset any conflicting environment variables
unset CLOUDFLARE_API_TOKEN

echo "🚀 PepTalk Production Deployment"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# New internal API secret
INTERNAL_API_SECRET="WNLA8wuXsGxSmM01w/Y2Myjy0ledVlik4SYCFXISOxA="

echo -e "${YELLOW}⚠️  IMPORTANT: Before running this script:${NC}"
echo "1. Update INTERNAL_API_SECRET in Cloudflare Dashboard"
echo "   Go to: Workers & Pages → peptalk-api → Settings → Variables"
echo "   Set INTERNAL_API_SECRET to: $INTERNAL_API_SECRET"
echo ""
read -p "Have you updated the secret in Cloudflare? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo -e "${RED}❌ Please update the secret first, then run this script again.${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}📦 Step 1: Apply Database Migrations${NC}"
echo "======================================"

cd /Users/admin/cursor/peptalk/apps/workers

echo ""
echo "Applying categories migration..."
if wrangler d1 execute DB --remote --file=../../packages/database/migrations/0004-categories.sql; then
    echo -e "${GREEN}✅ Categories migration applied${NC}"
else
    echo -e "${RED}❌ Categories migration failed${NC}"
    exit 1
fi

echo ""
echo "Applying cleanup migration..."
if wrangler d1 execute DB --remote --file=../../packages/database/migrations/0005-cleanup-duplicates.sql; then
    echo -e "${GREEN}✅ Cleanup migration applied${NC}"
else
    echo -e "${RED}❌ Cleanup migration failed${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}🚢 Step 2: Deploy Workers API${NC}"
echo "=============================="
echo ""

if wrangler deploy; then
    echo ""
    echo -e "${GREEN}✅ Workers API deployed successfully${NC}"
else
    echo ""
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}🧹 Step 3: Run Cleanup Script${NC}"
echo "=============================="
echo ""

cd /Users/admin/cursor/peptalk

# Give the deployment a moment to propagate
echo "Waiting 3 seconds for deployment to propagate..."
sleep 3

if INTERNAL_API_SECRET="$INTERNAL_API_SECRET" node cleanup-duplicates.js; then
    echo ""
    echo -e "${GREEN}✅ Cleanup completed${NC}"
else
    echo ""
    echo -e "${YELLOW}⚠️  Cleanup script had some issues (check output above)${NC}"
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✨ DEPLOYMENT COMPLETE! ✨          ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo "Next steps:"
echo "1. Visit https://peptalk-api.polished-glitter-23bb.workers.dev/api/peptides"
echo "2. Verify only 5 peptides appear (no duplicates)"
echo "3. Check a peptide has categories: /api/peptides/bpc-157"
echo ""
echo -e "${BLUE}🎉 Your production site is now live with categories!${NC}"
