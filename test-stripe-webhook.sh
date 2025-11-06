#!/bin/bash

echo "=== Test Stripe Checkout Session Creation ==="
echo ""
echo "Creating a test checkout session with Stripe API..."
echo ""

# Get your Stripe API key from .env
source .env

# Create a test checkout session directly with Stripe
CHECKOUT_URL=$(curl -s https://api.stripe.com/v1/checkout/sessions \
  -u "$STRIPE_API_KEY:" \
  -d "mode=subscription" \
  -d "line_items[0][price]=$STRIPE_PRICE_ID_MONTHLY" \
  -d "line_items[0][quantity]=1" \
  -d "success_url=https://peptalk.com/success" \
  -d "cancel_url=https://peptalk.com/cancel" \
  | python3 -c "import sys, json; print(json.load(sys.stdin)['url'])" 2>/dev/null)

if [ ! -z "$CHECKOUT_URL" ]; then
  echo "✅ Checkout session created successfully!"
  echo ""
  echo "Checkout URL: $CHECKOUT_URL"
  echo ""
  echo "To test the complete flow:"
  echo "1. Open this URL in your browser"
  echo "2. Use test card: 4242 4242 4242 4242"
  echo "3. Use any future expiry date and CVC"
  echo "4. Complete the payment"
  echo "5. Stripe will send webhook to your API"
  echo "6. Check webhook delivery in Stripe Dashboard"
else
  echo "❌ Failed to create checkout session"
  echo "Check your Stripe API key in .env"
fi
