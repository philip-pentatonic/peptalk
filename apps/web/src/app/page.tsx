'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://peptalk-api.polished-glitter-23bb.workers.dev'

interface TrendingPeptide {
  peptide_slug: string
  name: string
  view_count: number
  save_count: number
  search_count: number
  trending_score: number
}

interface NewsItem {
  id: string
  title: string
  type: string
  peptide_slug: string | null
  summary: string | null
  published_at: string
}

export default function HomePage() {
  const [trending, setTrending] = useState<TrendingPeptide[]>([])
  const [latestNews, setLatestNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/api/news/trending?period=7d&limit=5`)
        .then(res => res.json())
        .then(data => setTrending(data.data || [])),
      fetch(`${API_URL}/api/news/latest?limit=3`)
        .then(res => res.json())
        .then(data => setLatestNews(data.data || []))
    ]).finally(() => setLoading(false))
  }, [])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="container mx-auto px-4">
      {/* Hero Section */}
      <section className="py-20 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Evidence-Based Peptide Reference
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
          Citation-first research platform synthesizing evidence from PubMed and ClinicalTrials.gov.
          Every claim backed by peer-reviewed studies.
        </p>
        <div className="flex justify-center space-x-4">
          <a
            href="/peptides"
            className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Browse Peptides
          </a>
          <a
            href="/about"
            className="px-8 py-3 bg-gray-100 text-gray-900 rounded-lg font-semibold hover:bg-gray-200 transition"
          >
            Learn More
          </a>
        </div>
      </section>

      {/* Trending Peptides */}
      <section className="py-16 border-t">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold">
              🔥 Trending Peptides
            </h2>
            <Link href="/peptides" className="text-blue-600 hover:text-blue-800 font-medium">
              View all →
            </Link>
          </div>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {trending.map((peptide, index) => (
                <Link
                  key={peptide.peptide_slug}
                  href={`/peptides/${peptide.peptide_slug}`}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl font-bold text-gray-400">#{index + 1}</span>
                    <span className="text-sm text-gray-500">↑ {peptide.save_count} saves</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {peptide.name}
                  </h3>
                  <div className="text-xs text-gray-500">
                    {peptide.view_count.toLocaleString()} views
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Latest Research */}
      <section className="py-16 border-t">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold">
              📰 Latest Research
            </h2>
            <Link href="/news" className="text-blue-600 hover:text-blue-800 font-medium">
              View all →
            </Link>
          </div>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {latestNews.map((item) => (
                <Link
                  key={item.id}
                  href="/news"
                  className="block border rounded-lg p-6 hover:shadow-md transition-shadow bg-white"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-gray-500">{formatDate(item.published_at)}</span>
                        {item.peptide_slug && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                            {item.peptide_slug.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {item.title}
                      </h3>
                      {item.summary && (
                        <p className="text-sm text-gray-600">{item.summary}</p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Evidence Quality */}
      <section className="py-16 border-t">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Evidence Grading System
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="border rounded-lg p-6 bg-green-50">
              <div className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold mb-3">
                HIGH
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">High Quality</h3>
              <p className="text-sm text-gray-600">
                3+ human RCTs with consistent findings
              </p>
            </div>
            <div className="border rounded-lg p-6 bg-yellow-50">
              <div className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold mb-3">
                MODERATE
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Moderate Quality</h3>
              <p className="text-sm text-gray-600">
                1-2 human RCTs or 3+ observational studies
              </p>
            </div>
            <div className="border rounded-lg p-6 bg-orange-50">
              <div className="inline-block px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-semibold mb-3">
                LOW
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Low Quality</h3>
              <p className="text-sm text-gray-600">
                5+ animal studies only
              </p>
            </div>
            <div className="border rounded-lg p-6 bg-gray-50">
              <div className="inline-block px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-semibold mb-3">
                VERY LOW
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Very Low Quality</h3>
              <p className="text-sm text-gray-600">
                Minimal evidence available
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 border-t">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Why PepTalk?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Citation-First</h3>
              <p className="text-sm text-gray-600">
                Every empirical claim includes inline citations to PMID or NCT identifiers
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Educational Only</h3>
              <p className="text-sm text-gray-600">
                No medical advice, dosing recommendations, or vendor mentions
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Regularly Updated</h3>
              <p className="text-sm text-gray-600">
                New studies monitored and pages updated to reflect latest evidence
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 border-t bg-gray-50 -mx-4">
        <div className="max-w-3xl mx-auto text-center px-4">
          <h2 className="text-3xl font-bold mb-4">
            Access Full Research
          </h2>
          <p className="text-gray-600 mb-8">
            Subscribe for unlimited access to complete peptide pages with PDF downloads, detailed studies, and regular updates.
          </p>
          <a
            href="/pricing"
            className="inline-block px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            View Pricing
          </a>
          <p className="text-sm text-gray-500 mt-4">
            7-day money-back guarantee • Cancel anytime
          </p>
        </div>
      </section>
    </div>
  )
}
