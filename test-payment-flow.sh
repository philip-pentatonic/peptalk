#!/bin/bash
# Test PepTalk Payment Flow
# This script tests the complete Stripe checkout flow

API_URL="https://peptalk-api.polished-glitter-23bb.workers.dev"

echo "=== PepTalk Payment Flow Test ==="
echo ""

# Step 1: Health check
echo "=== 1. Root Endpoint ==="
curl -s "$API_URL/" | python3 -m json.tool
echo ""
echo ""

# Step 2: List peptides
echo "=== 2. Available Peptides ==="
curl -s "$API_URL/api/peptides?limit=3" | python3 -m json.tool | head -30
echo ""
echo ""

# Step 3: Try to create checkout session (will fail - needs auth)
echo "=== 3. Test Stripe Checkout (without auth - should fail) ==="
curl -s -X POST "$API_URL/api/stripe/checkout" \
  -H "Content-Type: application/json" \
  -d '{"priceId":"monthly"}' | python3 -m json.tool
echo ""
echo ""

echo "=== Test Complete ==="
echo ""
echo "Next steps to test full payment flow:"
echo "1. You need to be logged in (have a session cookie)"
echo "2. Then create a checkout session via POST /api/stripe/checkout"
echo "3. Complete the payment on Stripe Checkout page"
echo "4. Stripe will send webhook to your endpoint"
echo "5. Subscription will be created in database"
echo ""
echo "For now, let's test the webhook can receive events from Stripe..."
