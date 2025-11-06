# Frontend Pricing Page Example

Complete implementation example for integrating PepTalk's Stripe subscription flow into your Next.js frontend.

## 📍 File Structure

```
app/
├── pricing/
│   └── page.tsx          # Pricing page component
├── api/
│   └── checkout/
│       └── route.ts      # Client-side checkout handler
└── components/
    ├── PricingCard.tsx   # Individual pricing tier
    └── SubscribeButton.tsx  # Checkout button component
```

---

## 🎯 Pricing Page Component

**File:** `app/pricing/page.tsx`

```typescript
import { PricingCard } from '@/components/PricingCard'
import { CheckIcon } from '@heroicons/react/24/outline'

export default function PricingPage() {
  const plans = [
    {
      name: 'Monthly',
      priceId: 'monthly',
      price: '£10',
      interval: 'month',
      features: [
        'Access to all peptide research summaries',
        'Evidence-graded clinical studies',
        'Legal compliance disclaimers',
        'Regular content updates',
        'Mobile-friendly access',
      ],
      recommended: false,
    },
    {
      name: 'Annual',
      priceId: 'annual',
      price: '£90',
      interval: 'year',
      savings: 'Save £30/year',
      features: [
        'Everything in Monthly',
        '25% discount (2 months free)',
        'Priority access to new content',
        'Annual payment convenience',
        'Best value for regular users',
      ],
      recommended: true,
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Get access to evidence-based peptide research. Cancel anytime.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <PricingCard key={plan.priceId} plan={plan} />
          ))}
        </div>

        {/* Trust Badges */}
        <div className="mt-16 text-center">
          <div className="flex items-center justify-center gap-8 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <CheckIcon className="h-5 w-5 text-green-500" />
              <span>Secure Payment via Stripe</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckIcon className="h-5 w-5 text-green-500" />
              <span>Cancel Anytime</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckIcon className="h-5 w-5 text-green-500" />
              <span>No Hidden Fees</span>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Can I cancel my subscription?
              </h3>
              <p className="text-gray-600">
                Yes, you can cancel at any time. Your access will continue until
                the end of your billing period.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-gray-600">
                We accept all major credit cards, debit cards, and digital wallets
                via Stripe's secure payment platform.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Is my payment information secure?
              </h3>
              <p className="text-gray-600">
                Yes, we use Stripe for payment processing. We never store your
                card details on our servers.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

---

## 🎴 Pricing Card Component

**File:** `components/PricingCard.tsx`

```typescript
'use client'

import { SubscribeButton } from './SubscribeButton'
import { CheckIcon } from '@heroicons/react/24/solid'

interface PricingCardProps {
  plan: {
    name: string
    priceId: 'monthly' | 'annual'
    price: string
    interval: string
    savings?: string
    features: string[]
    recommended?: boolean
  }
}

export function PricingCard({ plan }: PricingCardProps) {
  return (
    <div
      className={`relative rounded-2xl p-8 ${
        plan.recommended
          ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-500 shadow-xl'
          : 'bg-white border border-gray-200 shadow-lg'
      }`}
    >
      {/* Recommended Badge */}
      {plan.recommended && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
            Best Value
          </span>
        </div>
      )}

      {/* Plan Name */}
      <div className="text-center mb-4">
        <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
        {plan.savings && (
          <p className="text-sm text-green-600 font-semibold mt-1">
            {plan.savings}
          </p>
        )}
      </div>

      {/* Price */}
      <div className="text-center mb-6">
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-5xl font-bold text-gray-900">{plan.price}</span>
          <span className="text-gray-600">/{plan.interval}</span>
        </div>
      </div>

      {/* Subscribe Button */}
      <div className="mb-6">
        <SubscribeButton priceId={plan.priceId} recommended={plan.recommended} />
      </div>

      {/* Features */}
      <ul className="space-y-3">
        {plan.features.map((feature, index) => (
          <li key={index} className="flex items-start gap-3">
            <CheckIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            <span className="text-gray-700">{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

---

## 🔘 Subscribe Button Component

**File:** `components/SubscribeButton.tsx`

```typescript
'use client'

import { useState } from 'react'

interface SubscribeButtonProps {
  priceId: 'monthly' | 'annual'
  recommended?: boolean
}

export function SubscribeButton({ priceId, recommended }: SubscribeButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCheckout() {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        'https://peptalk-api.polished-glitter-23bb.workers.dev/api/stripe/checkout',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Important: Send session cookie
          body: JSON.stringify({ priceId }),
        }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Checkout failed')
      }

      const { url } = await response.json()

      if (url) {
        // Redirect to Stripe Checkout
        window.location.href = url
      } else {
        throw new Error('No checkout URL returned')
      }
    } catch (err) {
      console.error('Checkout error:', err)
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={handleCheckout}
        disabled={loading}
        className={`w-full py-3 px-6 rounded-lg font-semibold transition-all ${
          recommended
            ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg hover:shadow-xl'
            : 'bg-gray-900 hover:bg-gray-800 text-white'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {loading ? (
          <div className="flex items-center justify-center gap-2">
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Loading...</span>
          </div>
        ) : (
          'Subscribe Now'
        )}
      </button>

      {error && (
        <div className="mt-2 text-sm text-red-600 text-center">{error}</div>
      )}
    </div>
  )
}
```

---

## 🔐 Authentication Check (Optional Client-Side Route)

**File:** `app/api/checkout/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { priceId } = body

    // Forward request to Workers API
    const response = await fetch(
      'https://peptalk-api.polished-glitter-23bb.workers.dev/api/stripe/checkout',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: request.headers.get('cookie') || '',
        },
        body: JSON.stringify({ priceId }),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Checkout proxy error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

---

## 🎨 Tailwind Configuration

Make sure your `tailwind.config.ts` includes:

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}

export default config
```

---

## 🔄 Payment Flow

```
1. User clicks "Subscribe Now"
   ↓
2. SubscribeButton sends POST to /api/stripe/checkout
   ↓
3. Workers API checks authentication (session cookie)
   ↓
4. If authenticated: Create Stripe Checkout Session
   ↓
5. Return checkout URL
   ↓
6. Redirect user to Stripe Checkout page
   ↓
7. User completes payment
   ↓
8. Stripe sends webhook to /api/stripe/webhook
   ↓
9. Workers API creates subscription in database
   ↓
10. User redirected back to success page
```

---

## ✅ Success/Cancel Pages

**File:** `app/subscribe/success/page.tsx`

```typescript
export default function SubscribeSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Welcome to PepTalk!
        </h1>
        <p className="text-gray-600 mb-6">
          Your subscription is now active. You have full access to all peptide research.
        </p>
        <a
          href="/peptides"
          className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition"
        >
          Explore Peptides
        </a>
      </div>
    </div>
  )
}
```

**File:** `app/subscribe/cancel/page.tsx`

```typescript
export default function SubscribeCancelPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Subscription Cancelled
        </h1>
        <p className="text-gray-600 mb-6">
          No worries! You can subscribe anytime.
        </p>
        <a
          href="/pricing"
          className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition"
        >
          Back to Pricing
        </a>
      </div>
    </div>
  )
}
```

---

## 🔒 Authentication Required

**Important:** Users must be logged in before clicking "Subscribe Now". The Workers API checks for a valid session cookie.

If you haven't implemented authentication yet, add a check to the SubscribeButton:

```typescript
// In SubscribeButton.tsx
import { useSession } from 'next-auth/react' // or your auth solution

export function SubscribeButton({ priceId, recommended }: SubscribeButtonProps) {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return <div>Loading...</div>
  }

  if (!session) {
    return (
      <a
        href="/login?redirect=/pricing"
        className="w-full py-3 px-6 rounded-lg font-semibold bg-gray-900 text-white text-center block"
      >
        Sign In to Subscribe
      </a>
    )
  }

  // ... rest of component
}
```

---

## 📦 Required Dependencies

```bash
npm install @heroicons/react
# or
pnpm add @heroicons/react
```

---

## 🧪 Testing

1. **Test Mode:** Use Stripe test card: `4242 4242 4242 4242`
2. **Expiry:** Any future date
3. **CVC:** Any 3 digits
4. **ZIP:** Any 5 digits

---

## 🎯 Next Steps

1. Copy these components into your Next.js project
2. Update the API URL in SubscribeButton.tsx to your Workers URL
3. Style to match your design system
4. Add authentication check
5. Test the complete flow with Stripe test mode
6. Configure webhook in Stripe Dashboard (see STRIPE_WEBHOOK_SETUP.md)

---

**Questions?** Check the main STRIPE_SETUP.md for complete integration details.
