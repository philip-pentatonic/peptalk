'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { marked } from 'marked'

export const runtime = 'edge'

interface Section {
  title: string
  contentHtml: string
  plainLanguageSummary?: string
  order: number
}

interface Study {
  type: 'pubmed' | 'clinicaltrials'
  title: string
  studyType: string
  pmid?: string
  nctId?: string
  abstract?: string
  year?: number
}

interface Category {
  slug: string
  name: string
  icon: string
  confidence: string
}

interface PeptideDetail {
  slug: string
  name: string
  aliases: string[]
  evidenceGrade: string
  summaryHtml: string
  sections: Section[]
  studies: Study[]
  categories: Category[]
  humanRctCount: number
  animalCount: number
  legalNotes: string[]
  lastUpdated: string
  version: number
}

export default function ImprovedPeptideDetailPage() {
  const params = useParams()
  const slug = params.slug as string

  const [peptide, setPeptide] = useState<PeptideDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [studyFilter, setStudyFilter] = useState<'all' | 'human' | 'animal'>('all')

  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (slug) {
      fetchPeptide()
    }
  }, [slug])

  useEffect(() => {
    // Configure marked options for mixed markdown/HTML content
    marked.setOptions({
      breaks: true,
      gfm: true,
    })

    // Parse content and make PMID/NCT citations clickable
    if (peptide && contentRef.current) {
      makeCitationsClickable()
    }
  }, [peptide])

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

  function makeCitationsClickable() {
    if (!contentRef.current) return

    const content = contentRef.current
    const walker = document.createTreeWalker(
      content,
      NodeFilter.SHOW_TEXT,
      null
    )

    const nodesToReplace: { node: Text; matches: RegExpMatchArray[] }[] = []

    let node
    while ((node = walker.nextNode())) {
      const text = node.textContent || ''
      const pmidMatches = Array.from(text.matchAll(/\[PMID:(\d+)\]/g))
      const nctMatches = Array.from(text.matchAll(/\[NCT:(\w+)\]/g))

      if (pmidMatches.length > 0 || nctMatches.length > 0) {
        nodesToReplace.push({
          node: node as Text,
          matches: [...pmidMatches, ...nctMatches]
        })
      }
    }

    nodesToReplace.forEach(({ node, matches }) => {
      const parent = node.parentElement
      if (!parent) return

      const text = node.textContent || ''
      const fragment = document.createDocumentFragment()
      let lastIndex = 0

      // Sort matches by index
      const sortedMatches = matches.sort((a, b) => (a.index || 0) - (b.index || 0))

      sortedMatches.forEach((match) => {
        const matchIndex = match.index || 0
        const matchText = match[0]

        // Add text before match
        if (matchIndex > lastIndex) {
          fragment.appendChild(
            document.createTextNode(text.substring(lastIndex, matchIndex))
          )
        }

        // Create clickable link
        const link = document.createElement('a')
        link.textContent = matchText
        link.className = 'citation-link text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-mono text-sm'

        if (matchText.startsWith('[PMID:')) {
          const pmid = match[1]
          link.href = `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`
          link.target = '_blank'
          link.rel = 'noopener noreferrer'
          link.title = `View study on PubMed (PMID:${pmid})`
        } else if (matchText.startsWith('[NCT:')) {
          const nctId = match[1]
          link.href = `https://clinicaltrials.gov/study/${nctId}`
          link.target = '_blank'
          link.rel = 'noopener noreferrer'
          link.title = `View trial on ClinicalTrials.gov (${nctId})`
        }

        fragment.appendChild(link)
        lastIndex = matchIndex + matchText.length
      })

      // Add remaining text
      if (lastIndex < text.length) {
        fragment.appendChild(document.createTextNode(text.substring(lastIndex)))
      }

      parent.replaceChild(fragment, node)
    })
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

  function getEvidenceBadgeColor(grade: string) {
    const colors = {
      'high': 'bg-green-100 text-green-800 border-green-200',
      'moderate': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'low': 'bg-orange-100 text-orange-800 border-orange-200',
      'very_low': 'bg-gray-100 text-gray-800 border-gray-200',
    }
    return colors[grade as keyof typeof colors] || colors.very_low
  }

  const filteredStudies = peptide?.studies.filter(study => {
    if (studyFilter === 'all') return true
    if (studyFilter === 'human') {
      return study.studyType.includes('human')
    }
    return study.studyType.includes('animal')
  }) || []

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading research data...</p>
        </div>
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
    <div className="bg-gray-50 min-h-screen">
      {/* Header Bar */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <a href="/peptides" className="text-gray-600 hover:text-gray-900">
                ← Back to Peptides
              </a>
              <span className="text-gray-300">|</span>
              <h1 className="text-xl font-bold text-gray-900">{peptide.name}</h1>
            </div>
            <button
              onClick={downloadPdf}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center space-x-2 text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Download PDF</span>
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-8">
            {/* Title & Meta */}
            <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
              <h1 className="text-4xl font-bold text-gray-900 mb-3">
                {peptide.name}
              </h1>
              {peptide.aliases.length > 0 && (
                <p className="text-lg text-gray-600 mb-4">
                  Also known as: <span className="font-medium">{peptide.aliases.join(', ')}</span>
                </p>
              )}

              <div className="flex flex-wrap items-center gap-4 pt-4 border-t">
                <div className={`px-4 py-2 rounded-lg border font-semibold ${getEvidenceBadgeColor(peptide.evidenceGrade)}`}>
                  {peptide.evidenceGrade.replace('_', ' ').toUpperCase()} EVIDENCE
                </div>
                <div className="flex items-center space-x-2 text-gray-700">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="font-semibold">{peptide.humanRctCount}</span>
                  <span className="text-sm">Human RCTs</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-700">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                  <span className="font-semibold">{peptide.animalCount}</span>
                  <span className="text-sm">Animal Studies</span>
                </div>
              </div>

              {/* Categories */}
              {peptide.categories && peptide.categories.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Potential Use Cases:</h3>
                  <div className="flex flex-wrap gap-2">
                    {peptide.categories.map((category) => (
                      <a
                        key={category.slug}
                        href={`/categories/${category.slug}`}
                        className={`inline-flex items-center space-x-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                          ${
                            category.confidence === 'high'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-200'
                              : category.confidence === 'medium'
                              ? 'bg-purple-100 text-purple-800 border border-purple-200 hover:bg-purple-200'
                              : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                          }`}
                      >
                        <span>{category.icon}</span>
                        <span>{category.name}</span>
                        {category.confidence !== 'high' && (
                          <span className="text-xs opacity-70">({category.confidence})</span>
                        )}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 text-sm text-gray-500">
                Last updated: {new Date(peptide.lastUpdated).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </div>

            {/* At a Glance Box */}
            <div className="bg-blue-50 border-l-4 border-blue-600 rounded-lg p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                At a Glance
              </h2>

              <div className="space-y-3">
                <div>
                  <span className="font-semibold text-gray-900">Evidence Quality:</span>{' '}
                  <span className="text-gray-700">
                    {peptide.evidenceGrade === 'high' && 'Multiple high-quality human RCTs with consistent findings'}
                    {peptide.evidenceGrade === 'moderate' && 'Some human RCTs or observational studies'}
                    {peptide.evidenceGrade === 'low' && 'Primarily animal studies, limited human data'}
                    {peptide.evidenceGrade === 'very_low' && 'Minimal evidence available'}
                  </span>
                </div>

                <div>
                  <span className="font-semibold text-gray-900">Research Base:</span>{' '}
                  <span className="text-gray-700">
                    {peptide.humanRctCount} human randomized controlled trials and {peptide.animalCount} animal studies indexed in PubMed and ClinicalTrials.gov
                  </span>
                </div>

                {peptide.humanRctCount < 3 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mt-3">
                    <p className="text-sm text-yellow-900 font-medium">
                      ⚠️ Limited Human Evidence: Claims are primarily based on animal research. Human safety and efficacy not fully established.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Content Sections */}
            <div ref={contentRef} className="space-y-6">
              {peptide.sections
                .sort((a, b) => a.order - b.order)
                .map((section, index) => (
                  <div
                    key={index}
                    id={`section-${section.title.toLowerCase().replace(/\s+/g, '-')}`}
                    className="bg-white rounded-lg shadow-sm p-8"
                  >
                    <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-3 border-b">
                      {section.title}
                    </h2>

                    {section.plainLanguageSummary && (
                      <div className="bg-green-50 border-l-4 border-green-500 rounded-r-lg p-4 mb-6">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="ml-3 flex-1">
                            <h3 className="text-sm font-semibold text-green-900 mb-1">
                              In Plain English
                            </h3>
                            <p className="text-sm text-green-800 leading-relaxed">
                              {section.plainLanguageSummary}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div
                      className="prose max-w-none
                        prose-headings:text-gray-900
                        prose-h1:text-2xl prose-h1:font-bold prose-h1:mt-6 prose-h1:mb-4 prose-h1:pb-2 prose-h1:border-b prose-h1:border-gray-200
                        prose-h2:text-xl prose-h2:font-bold prose-h2:mt-5 prose-h2:mb-3
                        prose-h3:text-lg prose-h3:font-semibold prose-h3:mt-4 prose-h3:mb-2
                        prose-p:text-base prose-p:text-gray-700 prose-p:leading-7 prose-p:mb-4
                        prose-strong:text-gray-900 prose-strong:font-semibold
                        prose-ul:my-3 prose-ul:space-y-1 prose-li:text-gray-700
                        prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline"
                      dangerouslySetInnerHTML={{
                        __html: marked.parse(
                          // Add newlines before markdown headers for proper parsing
                          section.contentHtml
                            .replace(/\s+##\s+/g, '\n\n## ')
                            .replace(/\s+###\s+/g, '\n\n### ')
                            .replace(/^#\s+/g, '# ')
                        ) as string
                      }}
                    />
                  </div>
                ))}
            </div>

            {/* Legal Disclaimer */}
            {peptide.legalNotes.length > 0 && (
              <div className="bg-gray-100 border border-gray-300 rounded-lg p-6 mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Legal Disclaimer
                </h3>
                <div className="space-y-2 text-sm text-gray-700">
                  {peptide.legalNotes.map((note, index) => (
                    <p key={index}>{note}</p>
                  ))}
                  <p className="mt-4 text-xs text-gray-600">
                    This content is for educational purposes only and does not constitute medical advice.
                    Always consult with a qualified healthcare provider before using any peptide.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4">
            <div className="sticky top-24 space-y-6">
              {/* Table of Contents */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 mb-4">On This Page</h3>
                <nav className="space-y-2">
                  {peptide.sections.map((section, index) => (
                    <a
                      key={index}
                      href={`#section-${section.title.toLowerCase().replace(/\s+/g, '-')}`}
                      className="block text-sm text-gray-600 hover:text-blue-600 hover:pl-2 transition-all"
                    >
                      {section.title}
                    </a>
                  ))}
                  {filteredStudies.length > 0 && (
                    <a
                      href="#studies"
                      className="block text-sm text-gray-600 hover:text-blue-600 hover:pl-2 transition-all"
                    >
                      References ({filteredStudies.length})
                    </a>
                  )}
                </nav>
              </div>

              {/* Quick Stats */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Research Summary</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-gray-600">Total Studies:</span>
                    <span className="font-semibold text-gray-900">
                      {peptide.humanRctCount + peptide.animalCount}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-gray-600">Human RCTs:</span>
                    <span className="font-semibold text-gray-900">{peptide.humanRctCount}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-gray-600">Animal Studies:</span>
                    <span className="font-semibold text-gray-900">{peptide.animalCount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Evidence Grade:</span>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${getEvidenceBadgeColor(peptide.evidenceGrade)}`}>
                      {peptide.evidenceGrade.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Data Sources */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Data Sources</h3>
                <div className="space-y-3">
                  <a
                    href="https://pubmed.ncbi.nlm.nih.gov/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-sm text-gray-600 hover:text-blue-600"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    PubMed / MEDLINE
                  </a>
                  <a
                    href="https://clinicaltrials.gov/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-sm text-gray-600 hover:text-blue-600"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    ClinicalTrials.gov
                  </a>
                </div>
                <p className="text-xs text-gray-500 mt-4">
                  Content synthesized from peer-reviewed scientific literature using Claude AI.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Studies Section */}
        {filteredStudies.length > 0 && (
          <div id="studies" className="mt-12 bg-white rounded-lg shadow-sm p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                References ({filteredStudies.length} {studyFilter !== 'all' ? studyFilter : ''} studies)
              </h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => setStudyFilter('all')}
                  className={`px-3 py-1 rounded text-sm font-medium transition ${
                    studyFilter === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setStudyFilter('human')}
                  className={`px-3 py-1 rounded text-sm font-medium transition ${
                    studyFilter === 'human'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Human
                </button>
                <button
                  onClick={() => setStudyFilter('animal')}
                  className={`px-3 py-1 rounded text-sm font-medium transition ${
                    studyFilter === 'animal'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Animal
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {filteredStudies.map((study, index) => (
                <div
                  key={index}
                  className="border rounded-lg p-4 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-gray-900 flex-1 pr-4">
                      {study.title}
                    </h3>
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium whitespace-nowrap">
                      {study.studyType.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>

                  {study.abstract && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {study.abstract}
                    </p>
                  )}

                  <div className="flex items-center space-x-4">
                    {study.type === 'pubmed' && study.pmid && (
                      <a
                        href={`https://pubmed.ncbi.nlm.nih.gov/${study.pmid}/`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        PMID:{study.pmid}
                      </a>
                    )}
                    {study.type === 'clinicaltrials' && study.nctId && (
                      <a
                        href={`https://clinicaltrials.gov/study/${study.nctId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        {study.nctId}
                      </a>
                    )}
                    {study.year && (
                      <span className="text-sm text-gray-500">
                        📅 {study.year}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
