'use client'

import { SubscribeButton } from '../../components/SubscribeButton'

export default function PricingPage() {
  const plans = [
    {
      name: 'Monthly',
      priceId: 'monthly' as const,
      price: '£10',
      interval: 'month',
      features: [
        'Access to all peptide research summaries',
        'Evidence-graded clinical studies',
        'Legal compliance disclaimers',
        'Regular content updates',
        'Mobile-friendly access',
        'PDF downloads',
      ],
      recommended: false,
    },
    {
      name: 'Annual',
      priceId: 'annual' as const,
      price: '£90',
      interval: 'year',
      savings: 'Save £30/year',
      features: [
        'Everything in Monthly',
        '25% discount (2 months free)',
        'Priority access to new content',
        'Annual payment convenience',
        'Best value for regular users',
        'PDF downloads',
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
            <div
              key={plan.priceId}
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
                    <svg
                      className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5"
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
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Trust Badges */}
        <div className="mt-16 text-center">
          <div className="flex items-center justify-center gap-8 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <svg
                className="h-5 w-5 text-green-500"
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
              <span>Secure Payment via Stripe</span>
            </div>
            <div className="flex items-center gap-2">
              <svg
                className="h-5 w-5 text-green-500"
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
              <span>Cancel Anytime</span>
            </div>
            <div className="flex items-center gap-2">
              <svg
                className="h-5 w-5 text-green-500"
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
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Do I need an account to subscribe?
              </h3>
              <p className="text-gray-600">
                Yes, you'll need to create a free account using your email address.
                We'll send you a magic link to log in - no password required.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
