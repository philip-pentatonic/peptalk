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
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'

      // First, check if user is authenticated
      const authResponse = await fetch(`${apiUrl}/api/auth/me`, {
        credentials: 'include',
      })

      if (authResponse.status === 401) {
        // Not authenticated, redirect to login
        window.location.href = '/login'
        return
      }

      if (!authResponse.ok) {
        throw new Error('Failed to verify authentication')
      }

      // User is authenticated, proceed with checkout
      const response = await fetch(`${apiUrl}/api/stripe/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important: Send session cookie
        body: JSON.stringify({ priceId }),
      })

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
