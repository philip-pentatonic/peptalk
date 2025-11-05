# Pricing Page Implementation for PepTalk

**Example code for your pricing/subscription page with monthly and annual options**

---

## 🎨 Pricing Page Component

Create `apps/web/src/app/subscribe/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SubscribePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('annual')

  async function handleCheckout(priceType: 'monthly' | 'annual') {
    setLoading(true)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'
      
      const response = await fetch(`${apiUrl}/api/stripe/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Include session cookie
        body: JSON.stringify({ priceId: priceType }),
      })

      const data = await response.json()

      if (response.ok && data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url
      } else {
        alert('Failed to create checkout session')
      }
    } catch (error) {
      console.error('Checkout error:', error)
      alert('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600">
            Get unlimited access to evidence-based peptide research
          </p>
        </div>

        {/* Toggle */}
        <div className="flex justify-center items-center gap-4 mb-8">
          <span className={`text-lg ${selectedPlan === 'monthly' ? 'font-bold' : 'text-gray-500'}`}>
            Monthly
          </span>
          <button
            onClick={() => setSelectedPlan(selectedPlan === 'monthly' ? 'annual' : 'monthly')}
            className="relative w-14 h-8 bg-indigo-600 rounded-full transition-colors"
          >
            <div
              className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                selectedPlan === 'annual' ? 'translate-x-6' : ''
              }`}
            />
          </button>
          <span className={`text-lg ${selectedPlan === 'annual' ? 'font-bold' : 'text-gray-500'}`}>
            Annual
            <span className="ml-2 text-sm text-green-600 font-semibold">Save 25%</span>
          </span>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Monthly Plan */}
          <div
            className={`bg-white rounded-2xl shadow-xl p-8 transition-all ${
              selectedPlan === 'monthly'
                ? 'ring-4 ring-indigo-500 transform scale-105'
                : 'opacity-70'
            }`}
          >
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Monthly</h3>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-5xl font-bold text-indigo-600">£10</span>
                <span className="text-gray-600">/month</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">£120 billed annually</p>
            </div>

            <ul className="space-y-4 mb-8">
              <Feature text="Unlimited peptide pages" />
              <Feature text="Full research citations" />
              <Feature text="Evidence-grade filtering" />
              <Feature text="PDF downloads" />
              <Feature text="New peptides added weekly" />
            </ul>

            <button
              onClick={() => handleCheckout('monthly')}
              disabled={loading}
              className={`w-full py-3 px-6 rounded-lg font-semibold transition-all ${
                selectedPlan === 'monthly'
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? 'Loading...' : 'Subscribe Monthly'}
            </button>
          </div>

          {/* Annual Plan */}
          <div
            className={`bg-white rounded-2xl shadow-xl p-8 transition-all relative ${
              selectedPlan === 'annual'
                ? 'ring-4 ring-indigo-500 transform scale-105'
                : 'opacity-70'
            }`}
          >
            {/* Best Value Badge */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <span className="bg-green-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                Best Value
              </span>
            </div>

            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Annual</h3>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-5xl font-bold text-indigo-600">£90</span>
                <span className="text-gray-600">/year</span>
              </div>
              <div className="mt-2">
                <p className="text-sm text-green-600 font-semibold">
                  Save £30 per year
                </p>
                <p className="text-sm text-gray-500">
                  (£7.50/month)
                </p>
              </div>
            </div>

            <ul className="space-y-4 mb-8">
              <Feature text="Unlimited peptide pages" />
              <Feature text="Full research citations" />
              <Feature text="Evidence-grade filtering" />
              <Feature text="PDF downloads" />
              <Feature text="New peptides added weekly" />
              <Feature text="25% discount vs monthly" highlighted />
            </ul>

            <button
              onClick={() => handleCheckout('annual')}
              disabled={loading}
              className={`w-full py-3 px-6 rounded-lg font-semibold transition-all ${
                selectedPlan === 'annual'
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? 'Loading...' : 'Subscribe Annually'}
            </button>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="mt-12 text-center">
          <div className="flex justify-center items-center gap-8 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Cancel anytime</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Secure payment via Stripe</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>No hidden fees</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Feature({ text, highlighted = false }: { text: string; highlighted?: boolean }) {
  return (
    <li className="flex items-start gap-3">
      <svg
        className={`w-5 h-5 mt-0.5 flex-shrink-0 ${highlighted ? 'text-green-500' : 'text-indigo-500'}`}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
      <span className={highlighted ? 'text-green-600 font-semibold' : 'text-gray-700'}>{text}</span>
    </li>
  )
}
```

---

## 🎨 Alternative: Simple Button Layout

If you prefer a simpler design:

```typescript
export default function SimpleSubscribePage() {
  const [loading, setLoading] = useState(false)

  async function handleCheckout(priceType: 'monthly' | 'annual') {
    // ... same checkout logic
  }

  return (
    <div className="container mx-auto py-16 px-4">
      <h1 className="text-4xl font-bold text-center mb-12">Subscribe to PepTalk</h1>

      <div className="max-w-md mx-auto space-y-4">
        {/* Annual Option (Highlighted) */}
        <div className="border-4 border-indigo-500 rounded-lg p-6 bg-indigo-50">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xl font-bold">Annual Plan</h3>
              <p className="text-3xl font-bold text-indigo-600 mt-2">£90/year</p>
              <p className="text-sm text-green-600 font-semibold">Save £30 (25% off)</p>
            </div>
            <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
              Best Value
            </span>
          </div>
          <button
            onClick={() => handleCheckout('annual')}
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
          >
            Subscribe Annually
          </button>
        </div>

        {/* Monthly Option */}
        <div className="border-2 border-gray-300 rounded-lg p-6">
          <div className="mb-4">
            <h3 className="text-xl font-bold">Monthly Plan</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">£10/month</p>
            <p className="text-sm text-gray-500">£120 billed annually</p>
          </div>
          <button
            onClick={() => handleCheckout('monthly')}
            disabled={loading}
            className="w-full bg-gray-600 text-white py-3 rounded-lg font-semibold hover:bg-gray-700 transition disabled:opacity-50"
          >
            Subscribe Monthly
          </button>
        </div>
      </div>

      <p className="text-center text-gray-600 mt-8">
        Cancel anytime. No questions asked.
      </p>
    </div>
  )
}
```

---

## 📱 Mobile-First Responsive

The pricing page automatically adjusts:
- **Desktop:** Side-by-side cards
- **Mobile:** Stacked cards
- **Toggle:** Switch between monthly/annual
- **Visual Feedback:** Selected plan highlighted

---

## 🎯 Key Features

1. **Plan Toggle:** Easy switching between monthly/annual
2. **Visual Highlighting:** Selected plan stands out
3. **Savings Badge:** Shows £30 savings on annual
4. **Trust Indicators:** Cancel anytime, secure payment, no fees
5. **Loading State:** Disabled button during checkout
6. **Error Handling:** User-friendly error messages

---

## 🔗 Integration Points

**Frontend** (`apps/web/src/app/subscribe/page.tsx`):
- Sends `priceId: 'monthly'` or `priceId: 'annual'`
- Includes session cookie for authentication
- Redirects to Stripe Checkout

**Backend** (`apps/workers/src/routes/stripe-routes.ts`):
- Receives price type from body
- Maps to environment variable price IDs
- Creates Stripe checkout session
- Returns checkout URL

---

## ✅ Testing

1. **Create subscribe page:**
   ```bash
   mkdir -p apps/web/src/app/subscribe
   # Copy code above to apps/web/src/app/subscribe/page.tsx
   ```

2. **Start dev server:**
   ```bash
   cd apps/web
   npm run dev
   ```

3. **Visit:** http://localhost:3000/subscribe

4. **Test both plans:**
   - Click "Subscribe Monthly" → Should redirect to Stripe
   - Use test card: `4242 4242 4242 4242`
   - Verify correct price (£10 or £90)

---

## 💡 Conversion Optimization Tips

**Best Practices:**
1. **Highlight Annual:** Most users choose recommended option
2. **Show Savings:** "Save £30" is more compelling than "25% off"
3. **Social Proof:** Add testimonials or user count
4. **Urgency:** Consider limited-time offers
5. **FAQ:** Add common questions below pricing

**Example FAQ:**
```
Q: Can I cancel anytime?
A: Yes! Cancel anytime from your account page.

Q: What payment methods do you accept?
A: All major credit/debit cards via Stripe.

Q: Is there a free trial?
A: We offer a 7-day money-back guarantee.
```

---

**Your pricing page is ready to convert visitors to subscribers!** 💰
