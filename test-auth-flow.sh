#!/bin/bash

API_URL="https://peptalk-api.polished-glitter-23bb.workers.dev"
TEST_EMAIL="test@example.com"

echo "=== Testing Authentication Flow ==="
echo ""

echo "1. Test /api/auth/me without authentication (should return 401)"
curl -s -w "\nHTTP Status: %{http_code}\n" \
  -H "Content-Type: application/json" \
  "$API_URL/api/auth/me"
echo ""
echo ""

echo "2. Test /api/auth/login with email"
LOGIN_RESPONSE=$(curl -s -w "\nHTTP Status: %{http_code}\n" \
  -X POST \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\"}" \
  "$API_URL/api/auth/login")
echo "$LOGIN_RESPONSE"
echo ""
echo ""

echo "3. Test /api/peptides (public endpoint - should work)"
curl -s -w "\nHTTP Status: %{http_code}\n" \
  "$API_URL/api/peptides?limit=2" | head -20
echo ""
echo ""

echo "4. Test /api/pdf/bpc-157 without authentication (should return 401)"
curl -s -w "\nHTTP Status: %{http_code}\n" \
  "$API_URL/api/pdf/bpc-157"
echo ""
echo ""

echo "=== Authentication Flow Test Complete ==="
echo ""
echo "NOTE: To test magic link verification, check the email sent to $TEST_EMAIL"
echo "and click the link or manually call /api/auth/verify?token=<token>"
