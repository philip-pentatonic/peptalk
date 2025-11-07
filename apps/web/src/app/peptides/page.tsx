'use client'

import { useState, useEffect } from 'react'

interface Category {
  slug: string
  name: string
  confidence: string
}

interface Peptide {
  slug: string
  name: string
  aliases: string[]
  evidenceGrade: string
  humanRctCount: number
  animalCount: number
  summaryHtml: string
  categories?: Category[]
}

const CATEGORIES = [
  { slug: 'weight-loss', name: 'Weight Loss', icon: '⚖️' },
  { slug: 'muscle-growth', name: 'Muscle Growth', icon: '💪' },
  { slug: 'skin-health', name: 'Skin & Anti-Aging', icon: '✨' },
  { slug: 'healing', name: 'Healing & Recovery', icon: '🩹' },
  { slug: 'immune', name: 'Immune Support', icon: '🛡️' },
  { slug: 'cognitive', name: 'Cognitive Function', icon: '🧠' },
  { slug: 'longevity', name: 'Longevity & Aging', icon: '⏳' },
  { slug: 'joint-bone', name: 'Joint & Bone Health', icon: '🦴' },
  { slug: 'gut-health', name: 'Gut Health', icon: '🫃' },
  { slug: 'hormone', name: 'Hormone Support', icon: '⚗️' },
]

export default function PeptidesPage() {
  const [peptides, setPeptides] = useState<Peptide[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterGrade, setFilterGrade] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')

  useEffect(() => {
    fetchPeptides()
  }, [search, filterGrade, selectedCategory])

  async function fetchPeptides() {
    try {
      setLoading(true)
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (filterGrade) params.append('evidenceGrade', filterGrade)
      if (selectedCategory) params.append('category', selectedCategory)

      const response = await fetch(`${apiUrl}/api/peptides?${params}`)
      const data = await response.json()

      setPeptides(data.data || [])
    } catch (error) {
      console.error('Failed to fetch peptides:', error)
      setPeptides([])
    } finally {
      setLoading(false)
    }
  }

  function getEvidenceBadgeColor(grade: string) {
    switch (grade) {
      case 'high':
        return 'bg-green-100 text-green-800 border border-green-200'
      case 'moderate':
        return 'bg-blue-100 text-blue-800 border border-blue-200'
      case 'low':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200'
      case 'very_low':
        return 'bg-gray-100 text-gray-800 border border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200'
    }
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Browse Peptides
          </h1>
          <p className="text-lg text-gray-600">
            Evidence-based research on peptides from PubMed and ClinicalTrials.gov
          </p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search peptides by name or alias..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-6 py-4 text-lg border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-sm"
          />
        </div>

        {/* Category Pills */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-semibold text-gray-700">Filter by Category:</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedCategory === ''
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-300 hover:shadow-sm'
              }`}
            >
              All Categories
            </button>
            {CATEGORIES.map((category) => (
              <button
                key={category.slug}
                onClick={() => setSelectedCategory(category.slug)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedCategory === category.slug
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-300 hover:shadow-sm'
                }`}
              >
                <span className="mr-1">{category.icon}</span>
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Evidence Grade Filter */}
        <div className="mb-8">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Evidence Quality:
          </label>
          <select
            value={filterGrade}
            onChange={(e) => setFilterGrade(e.target.value)}
            className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <option value="">All Evidence Grades</option>
            <option value="high">High Evidence</option>
            <option value="moderate">Moderate Evidence</option>
            <option value="low">Low Evidence</option>
            <option value="very_low">Very Low Evidence</option>
          </select>
        </div>

        {/* Results */}
        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
            <p className="mt-4 text-lg text-gray-600">Loading peptides...</p>
          </div>
        ) : peptides.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed rounded-xl bg-white">
            <p className="text-xl text-gray-600">No peptides found matching your criteria.</p>
            <p className="text-sm text-gray-500 mt-2">Try adjusting your filters or search terms.</p>
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-gray-600">
              Found {peptides.length} peptide{peptides.length !== 1 ? 's' : ''}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {peptides.map((peptide) => (
                <a
                  key={peptide.slug}
                  href={`/peptides/${peptide.slug}`}
                  className="group block bg-white rounded-xl border-2 border-gray-200 hover:border-blue-400 hover:shadow-xl transition-all overflow-hidden"
                >
                  {/* Card Header */}
                  <div className="p-6 pb-4">
                    <div className="flex items-start justify-between mb-3">
                      <h2 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition line-clamp-2">
                        {peptide.name}
                      </h2>
                      {peptide.evidenceGrade && (
                        <div className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ml-2 ${getEvidenceBadgeColor(peptide.evidenceGrade)}`}>
                          {peptide.evidenceGrade.replace('_', ' ').toUpperCase()}
                        </div>
                      )}
                    </div>

                    {peptide.aliases && peptide.aliases.length > 0 && (
                      <p className="text-sm text-gray-500 mb-4 line-clamp-1">
                        {peptide.aliases.join(', ')}
                      </p>
                    )}

                    {/* Categories */}
                    {peptide.categories && peptide.categories.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {peptide.categories.slice(0, 3).map((cat) => (
                          <span
                            key={cat.slug}
                            className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100"
                          >
                            {CATEGORIES.find(c => c.slug === cat.slug)?.icon} {cat.name}
                          </span>
                        ))}
                        {peptide.categories.length > 3 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-50 text-gray-600 border border-gray-100">
                            +{peptide.categories.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-4 pb-4 border-b border-gray-100">
                      <div className="flex items-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="font-semibold">{peptide.humanRctCount || 0}</span>
                        <span className="text-xs">RCTs</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                        </svg>
                        <span className="font-semibold">{peptide.animalCount || 0}</span>
                        <span className="text-xs">Animal</span>
                      </div>
                    </div>

                    {/* Summary */}
                    <div
                      className="text-sm text-gray-700 line-clamp-3 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: peptide.summaryHtml }}
                    />
                  </div>

                  {/* Card Footer */}
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                    <div className="flex items-center text-blue-600 font-semibold text-sm group-hover:text-blue-700">
                      <span>View Research</span>
                      <svg className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
