// @ts-nocheck
/**
 * Parse Claude's synthesis output into structured sections.
 */

import type { Section } from '@peptalk/schemas'
import { SECTION_TITLES } from '@peptalk/schemas'

/**
 * Parse synthesized HTML into summary + sections.
 */
export function parseSynthesis(html: string): {
  summaryHtml: string
  sections: Section[]
} {
  // Extract summary (first paragraph or before first heading)
  const summaryMatch = html.match(/^<p>(.*?)<\/p>/s)
  const summaryHtml = summaryMatch ? summaryMatch[0] : '<p>Summary not available.</p>'

  // Extract sections by splitting on headings
  const sections = extractSections(html)

  return {
    summaryHtml,
    sections,
  }
}

/**
 * Extract sections from HTML content.
 * Looks for the new format with ###SECTION, ###PLAIN_LANGUAGE, ###CONTENT markers.
 */
function extractSections(html: string): Section[] {
  const sections: Section[] = []

  // Try new format first (with ###SECTION markers)
  const sectionRegex = /###SECTION:\s*(.*?)\s*\n###PLAIN_LANGUAGE:\s*(.*?)\s*\n###CONTENT:\s*(.*?)(?=###SECTION:|$)/gs
  const matches = Array.from(html.matchAll(sectionRegex))

  if (matches.length > 0) {
    // New format found - parse sections with plain language summaries
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i]
      const title = match[1].trim()
      const plainLanguage = match[2].trim()
      const content = match[3].trim()

      if (content) {
        sections.push({
          title,
          plainLanguageSummary: plainLanguage,
          contentHtml: content,
          order: i,
        })
      }
    }

    return sections
  }

  // Fall back to old format (for backward compatibility)
  const headingRegex = /(?:<h[23]>(.*?)<\/h[23]>|\*\*(.*?)\*\*)/g
  const headingMatches = Array.from(html.matchAll(headingRegex))

  if (headingMatches.length === 0) {
    // No headings found, treat entire content as one section
    return [
      {
        title: 'Overview',
        contentHtml: html,
        order: 0,
      },
    ]
  }

  for (let i = 0; i < headingMatches.length; i++) {
    const match = headingMatches[i]
    const title = (match[1] || match[2]).trim()
    const startIndex = match.index!

    // Get content between this heading and next (or end)
    const endIndex = headingMatches[i + 1]?.index ?? html.length
    const content = html.substring(startIndex + match[0].length, endIndex).trim()

    if (content) {
      sections.push({
        title,
        contentHtml: content,
        order: i,
      })
    }
  }

  return sections
}

/**
 * Validate that synthesis includes required citations.
 */
export function validateCitations(html: string): {
  valid: boolean
  citationCount: number
  missingCitations: string[]
} {
  // Extract all citation patterns
  const pmidMatches = html.match(/\[PMID:\d+\]/g) || []
  const nctMatches = html.match(/\[NCT:NCT\d{8}\]/g) || []

  const citationCount = pmidMatches.length + nctMatches.length

  // Check for empirical claims without citations (very basic heuristic)
  const missingCitations: string[] = []

  // Look for sentences with effect claims but no citations nearby
  const sentences = html.split(/[.!?]+/)

  for (const sentence of sentences) {
    const hasEffectClaim =
      /\b(increase|decrease|improve|reduce|enhance|inhibit|promote|prevent)\w*\b/i.test(
        sentence
      )

    const hasCitation = /\[(PMID:|NCT:)/.test(sentence)

    if (hasEffectClaim && !hasCitation && sentence.trim().length > 20) {
      missingCitations.push(sentence.trim().substring(0, 100))
    }
  }

  return {
    valid: citationCount > 0 && missingCitations.length === 0,
    citationCount,
    missingCitations,
  }
}

/**
 * Clean and normalize HTML output.
 */
export function cleanHtml(html: string): string {
  // Remove excessive whitespace
  let cleaned = html.replace(/\s+/g, ' ').trim()

  // Ensure proper paragraph spacing
  cleaned = cleaned.replace(/<\/p>\s*<p>/g, '</p>\n<p>')

  // Remove empty paragraphs
  cleaned = cleaned.replace(/<p>\s*<\/p>/g, '')

  return cleaned
}

/**
 * Extract all citations from HTML.
 */
export function extractCitations(html: string): string[] {
  const citations: string[] = []

  // Extract PMIDs
  const pmidMatches = html.matchAll(/PMID:(\d+)/g)
  for (const match of pmidMatches) {
    citations.push(`PMID:${match[1]}`)
  }

  // Extract NCTs
  const nctMatches = html.matchAll(/NCT:(NCT\d{8})/g)
  for (const match of nctMatches) {
    citations.push(`NCT:${match[1]}`)
  }

  // Return unique citations
  return Array.from(new Set(citations))
}
