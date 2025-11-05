'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

interface Section {
  title: string
  contentHtml: string
  order: number
}

interface Study {
  type: 'pubmed' | 'clinicaltrials'
  title: string
  studyType: string
  pmid?: string
  nctId?: string
}

interface PeptideDetail {
  slug: string
  name: string
  aliases: string[]
  evidenceGrade: string
  summaryHtml: string
  sections: Section[]
  studies: Study[]
  humanRctCount: number
  animalCount: number
  legalNotes: string[]
  lastUpdated: string
  version: number
}

export default function PeptideDetailPage() {
  const params = useParams()
  const slug = params.slug as string

  const [peptide, setPeptide] = useState<PeptideDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (slug) {
      fetchPeptide()
    }
  }, [slug])

  async function fetchPeptide() {
    try {
      setLoading(true)
      setError(null)

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'
      const response = await fetch(`${apiUrl}/api/peptides/${slug}`)

      if (!response.ok) {
        throw new Error('Peptide not found')
      }

      const data = await response.json()
      setPeptide(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load peptide')
    } finally {
      setLoading(false)
    }
  }

  async function downloadPdf() {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'
      const response = await fetch(`${apiUrl}/api/pdf/${slug}`)

      if (!response.ok) {
        throw new Error('Failed to download PDF')
      }

      const data = await response.json()
      window.open(data.url, '_blank')
    } catch (err) {
      alert('Failed to download PDF. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">Loading peptide details...</p>
      </div>
    )
  }

  if (error || !peptide) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto text-center border rounded-lg p-8 bg-red-50">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Peptide Not Found</h1>
          <p className="text-gray-600 mb-6">{error || 'The requested peptide could not be found.'}</p>
          <a
            href="/peptides"
            className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Browse All Peptides
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              {peptide.name}
            </h1>
            {peptide.aliases.length > 0 && (
              <p className="text-gray-600">
                Also known as: {peptide.aliases.join(', ')}
              </p>
            )}
          </div>
          <button
            onClick={downloadPdf}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Download PDF</span>
          </button>
        </div>

        <div className="flex items-center space-x-6">
          <div className={`px-3 py-1 rounded-full text-sm font-semibold inline-block badge-${peptide.evidenceGrade.replace('_', '-')}`}>
            {peptide.evidenceGrade.replace('_', ' ').toUpperCase()} Evidence
          </div>
          <span className="text-sm text-gray-600">
            {peptide.humanRctCount} Human RCTs
          </span>
          <span className="text-gray-400">•</span>
          <span className="text-sm text-gray-600">
            {peptide.animalCount} Animal Studies
          </span>
          <span className="text-gray-400">•</span>
          <span className="text-sm text-gray-600">
            Updated {new Date(peptide.lastUpdated).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Summary */}
      <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Summary</h2>
        <div
          className="text-gray-800"
          dangerouslySetInnerHTML={{ __html: peptide.summaryHtml }}
        />
      </div>

      {/* Content Sections */}
      <div className="mb-8 space-y-8">
        {peptide.sections
          .sort((a, b) => a.order - b.order)
          .map((section, index) => (
            <div key={index} className="border-t pt-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {section.title}
              </h2>
              <div
                className="peptide-content"
                dangerouslySetInnerHTML={{ __html: section.contentHtml }}
              />
            </div>
          ))}
      </div>

      {/* Legal Notes */}
      <div className="border-t pt-8 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Legal Disclaimer</h3>
        <div className="bg-gray-50 border rounded-lg p-4 space-y-2">
          {peptide.legalNotes.map((note, index) => (
            <p key={index} className="text-sm text-gray-600">
              {note}
            </p>
          ))}
        </div>
      </div>

      {/* References */}
      <div className="border-t pt-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          References ({peptide.studies.length} studies)
        </h3>
        <div className="space-y-2">
          {peptide.studies.slice(0, 10).map((study, index) => (
            <div key={index} className="text-sm border-b pb-2">
              <p className="font-medium text-gray-900">{study.title}</p>
              <div className="flex items-center space-x-4 mt-1 text-gray-600">
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                  {study.studyType.replace('_', ' ').toUpperCase()}
                </span>
                {study.type === 'pubmed' && study.pmid && (
                  <a
                    href={`https://pubmed.ncbi.nlm.nih.gov/${study.pmid}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-xs"
                  >
                    PMID:{study.pmid}
                  </a>
                )}
                {study.type === 'clinicaltrials' && study.nctId && (
                  <a
                    href={`https://clinicaltrials.gov/study/${study.nctId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-xs"
                  >
                    {study.nctId}
                  </a>
                )}
              </div>
            </div>
          ))}
          {peptide.studies.length > 10 && (
            <p className="text-sm text-gray-500 pt-2">
              + {peptide.studies.length - 10} more studies (see PDF for complete list)
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
