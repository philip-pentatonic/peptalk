'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://peptalk-api.polished-glitter-23bb.workers.dev'

interface NewsItem {
  id: string
  title: string
  type: 'new_study' | 'clinical_trial' | 'fda_news' | 'trending' | 'industry_news'
  peptide_slug: string | null
  content: string
  summary: string | null
  source: string
  source_url: string | null
  pmid: string | null
  nct_id: string | null
  published_at: string
  created_at: string
  read?: boolean
}

const NEWS_TYPES = [
  { value: '', label: 'All News', icon: '📰' },
  { value: 'new_study', label: 'New Studies', icon: '🔬' },
  { value: 'clinical_trial', label: 'Clinical Trials', icon: '🏥' },
  { value: 'fda_news', label: 'FDA News', icon: '⚖️' },
  { value: 'trending', label: 'Trending', icon: '🔥' },
  { value: 'industry_news', label: 'Industry', icon: '💼' },
]

export default function NewsPage() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedType, setSelectedType] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    fetchNews()
  }, [selectedType])

  const fetchNews = async () => {
    setLoading(true)
    try {
      const url = selectedType
        ? `${API_URL}/api/news?type=${selectedType}&limit=50`
        : `${API_URL}/api/news?limit=50`

      const response = await fetch(url)
      const data = await response.json()
      setNews(data.data || [])
    } catch (error) {
      console.error('Failed to fetch news:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getTypeColor = (type: string) => {
    const colors = {
      new_study: 'bg-blue-100 text-blue-800',
      clinical_trial: 'bg-green-100 text-green-800',
      fda_news: 'bg-purple-100 text-purple-800',
      trending: 'bg-orange-100 text-orange-800',
      industry_news: 'bg-gray-100 text-gray-800',
    }
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getTypeLabel = (type: string) => {
    const labels = {
      new_study: 'New Study',
      clinical_trial: 'Clinical Trial',
      fda_news: 'FDA News',
      trending: 'Trending',
      industry_news: 'Industry News',
    }
    return labels[type as keyof typeof labels] || type
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Latest Peptide News & Research
          </h1>
          <p className="text-gray-600">
            Stay updated with the latest studies, clinical trials, and industry developments
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {NEWS_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => setSelectedType(type.value)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                  selectedType === type.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {type.icon} {type.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* News List */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : news.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No news items found</p>
            <p className="text-gray-500 mt-2">Check back later for updates</p>
          </div>
        ) : (
          <div className="space-y-4">
            {news.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-lg border hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(item.type)}`}>
                          {getTypeLabel(item.type)}
                        </span>
                        {item.peptide_slug && (
                          <Link
                            href={`/peptides/${item.peptide_slug}`}
                            className="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-700 hover:bg-gray-200"
                          >
                            {item.peptide_slug.toUpperCase()}
                          </Link>
                        )}
                        <span className="text-sm text-gray-500">
                          {formatDate(item.published_at)}
                        </span>
                      </div>
                      <h2 className="text-xl font-semibold text-gray-900 mb-2">
                        {item.title}
                      </h2>
                      {item.summary && (
                        <p className="text-gray-600 mb-3">{item.summary}</p>
                      )}
                    </div>
                  </div>

                  {/* Expandable Content */}
                  {expandedId === item.id ? (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-gray-700 whitespace-pre-wrap mb-4">
                        {item.content}
                      </p>
                      <div className="flex items-center gap-4">
                        {item.source_url && (
                          <a
                            href={item.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline font-medium"
                          >
                            View Source →
                          </a>
                        )}
                        {item.pmid && (
                          <a
                            href={`https://pubmed.ncbi.nlm.nih.gov/${item.pmid}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            PubMed: {item.pmid}
                          </a>
                        )}
                        {item.nct_id && (
                          <a
                            href={`https://clinicaltrials.gov/study/${item.nct_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            ClinicalTrials.gov: {item.nct_id}
                          </a>
                        )}
                      </div>
                      <button
                        onClick={() => setExpandedId(null)}
                        className="mt-4 text-gray-600 hover:text-gray-800 font-medium"
                      >
                        Show less ↑
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setExpandedId(item.id)}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Read more →
                    </button>
                  )}

                  {/* Source */}
                  <div className="mt-3 text-sm text-gray-500">
                    Source: {item.source}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
