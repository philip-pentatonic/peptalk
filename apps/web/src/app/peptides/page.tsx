'use client'

import { useState, useEffect } from 'react'

interface Peptide {
  slug: string
  name: string
  aliases: string[]
  evidenceGrade: string
  humanRctCount: number
  animalCount: number
  summaryHtml: string
}

export default function PeptidesPage() {
  const [peptides, setPeptides] = useState<Peptide[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterGrade, setFilterGrade] = useState<string>('')

  useEffect(() => {
    fetchPeptides()
  }, [search, filterGrade])

  async function fetchPeptides() {
    try {
      setLoading(true)
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (filterGrade) params.append('evidenceGrade', filterGrade)

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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Browse Peptides
        </h1>
        <p className="text-gray-600">
          Evidence-based research on peptides from PubMed and ClinicalTrials.gov
        </p>
      </div>

      {/* Filters */}
      <div className="mb-8 flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search peptides..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <select
            value={filterGrade}
            onChange={(e) => setFilterGrade(e.target.value)}
            className="w-full md:w-48 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Evidence Grades</option>
            <option value="high">High</option>
            <option value="moderate">Moderate</option>
            <option value="low">Low</option>
            <option value="very_low">Very Low</option>
          </select>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading peptides...</p>
        </div>
      ) : peptides.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-gray-50">
          <p className="text-gray-600">No peptides found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {peptides.map((peptide) => (
            <a
              key={peptide.slug}
              href={`/peptides/${peptide.slug}`}
              className="block border rounded-lg p-6 hover:shadow-lg transition bg-white"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-1">
                    {peptide.name}
                  </h2>
                  {peptide.aliases && peptide.aliases.length > 0 && (
                    <p className="text-sm text-gray-500">
                      Also known as: {peptide.aliases.join(', ')}
                    </p>
                  )}
                </div>
                {peptide.evidenceGrade && (
                  <div className={`px-3 py-1 rounded-full text-sm font-semibold badge-${peptide.evidenceGrade.replace('_', '-')}`}>
                    {peptide.evidenceGrade.replace('_', ' ').toUpperCase()}
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-6 text-sm text-gray-600 mb-3">
                <span>{peptide.humanRctCount || 0} Human RCTs</span>
                <span>•</span>
                <span>{peptide.animalCount || 0} Animal Studies</span>
              </div>

              <div
                className="text-gray-700 line-clamp-3"
                dangerouslySetInnerHTML={{ __html: peptide.summaryHtml }}
              />

              <div className="mt-4 text-blue-600 font-semibold text-sm">
                View full research →
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
