'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  email: string
  subscriptionStatus: 'active' | 'inactive' | 'canceled' | null
  subscriptionPlan: 'monthly' | 'annual' | null
  createdAt: string
}

export default function AccountPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchUser()
  }, [])

  async function fetchUser() {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'
      const response = await fetch(`${apiUrl}/api/auth/me`, {
        credentials: 'include', // Important: Send session cookie
      })

      if (response.status === 401) {
        // Not authenticated, redirect to login
        router.push('/login')
        return
      }

      if (!response.ok) {
        throw new Error('Failed to fetch user')
      }

      const data = await response.json()
      setUser(data.user)
    } catch (err) {
      console.error('Error fetching user:', err)
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'
      await fetch(`${apiUrl}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      })

      router.push('/')
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg
            className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4"
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
          <p className="text-gray-600">Loading your account...</p>
        </div>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Error</h1>
          <p className="text-gray-600 mb-6">{error || 'Failed to load account'}</p>
          <a
            href="/login"
            className="inline-block bg-blue-600 text-white py-2 px-6 rounded-lg font-semibold hover:bg-blue-700"
          >
            Sign in again
          </a>
        </div>
      </div>
    )
  }

  const hasActiveSubscription = user.subscriptionStatus === 'active'

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6 text-white">
            <h1 className="text-3xl font-bold mb-2">Account Settings</h1>
            <p className="text-blue-100">{user.email}</p>
          </div>

          {/* Content */}
          <div className="p-8 space-y-8">
            {/* Subscription Status */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Subscription
              </h2>
              <div className="border rounded-lg p-6">
                {hasActiveSubscription ? (
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="font-semibold text-gray-900">Active</span>
                      </div>
                      <p className="text-gray-600 text-sm mb-1">
                        Plan: <strong className="capitalize">{user.subscriptionPlan}</strong>
                      </p>
                      <p className="text-gray-600 text-sm">
                        You have full access to all peptide research
                      </p>
                    </div>
                    <a
                      href="/pricing"
                      className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
                    >
                      Manage subscription
                    </a>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                      <span className="font-semibold text-gray-900">No active subscription</span>
                    </div>
                    <p className="text-gray-600 text-sm mb-4">
                      Subscribe to access full peptide research and PDF downloads
                    </p>
                    <a
                      href="/pricing"
                      className="inline-block bg-blue-600 text-white py-2 px-6 rounded-lg font-semibold hover:bg-blue-700 transition"
                    >
                      View plans
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Account Info */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Account Information
              </h2>
              <div className="border rounded-lg p-6 space-y-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700">Email</label>
                  <p className="text-gray-900">{user.email}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Member since</label>
                  <p className="text-gray-900">
                    {new Date(user.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-6 border-t">
              <button
                onClick={handleLogout}
                className="text-red-600 hover:text-red-700 font-semibold text-sm"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
