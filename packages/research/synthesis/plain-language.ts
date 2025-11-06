/**
 * Generate plain language summaries for technical sections.
 * Second pass after main synthesis to make content accessible.
 */

import { synthesize, type ClaudeConfig } from './client'
import type { Section } from '@peptalk/schemas'

/**
 * System prompt for plain language translation
 */
const PLAIN_LANGUAGE_SYSTEM_PROMPT = `You are an expert at translating complex scientific and medical content into simple, accessible language for non-scientists.

Your task is to create plain-language summaries that:
- Use conversational, everyday language (8th-grade reading level)
- Avoid jargon and technical terms (or explain them if necessary)
- Are 2-3 sentences long
- Focus on practical implications and what it means for regular people
- Are accurate but simplified
- Use active voice and present tense when possible

IMPORTANT: Output ONLY the plain language summary text. No formatting, no labels, no extra commentary.`

/**
 * Generate plain language summaries for all sections
 */
export async function addPlainLanguageSummaries(
  sections: Section[],
  peptideName: string,
  config: ClaudeConfig
): Promise<Section[]> {
  console.log(`   🔄 Generating plain language summaries for ${sections.length} sections...`)

  const updatedSections: Section[] = []

  for (const section of sections) {
    try {
      // Generate plain language summary for this section
      const summary = await generateSectionSummary(
        section.title,
        section.contentHtml,
        peptideName,
        config
      )

      updatedSections.push({
        ...section,
        plainLanguageSummary: summary,
      })

      console.log(`      ✓ Generated summary for "${section.title}"`)
    } catch (error) {
      console.warn(`      ⚠️  Failed to generate summary for "${section.title}":`, error)
      // Keep section without summary rather than failing entire pipeline
      updatedSections.push(section)
    }
  }

  return updatedSections
}

/**
 * Generate plain language summary for a single section
 */
async function generateSectionSummary(
  sectionTitle: string,
  contentHtml: string,
  peptideName: string,
  config: ClaudeConfig
): Promise<string> {
  // Strip HTML tags to get plain text
  const plainText = contentHtml
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // Truncate if too long (to save tokens)
  const maxLength = 3000
  const truncated = plainText.length > maxLength
    ? plainText.substring(0, maxLength) + '...'
    : plainText

  const userPrompt = `Section Title: "${sectionTitle}"
Peptide: ${peptideName}

Technical Content:
${truncated}

Task: Write a 2-3 sentence plain language summary that explains what this section means for a regular person who isn't a scientist. Focus on practical implications and use simple, conversational language.`

  const result = await synthesize(
    PLAIN_LANGUAGE_SYSTEM_PROMPT,
    userPrompt,
    {
      ...config,
      maxTokens: 200, // Summaries are short
      temperature: 0.5, // Slightly higher for more natural language
    }
  )

  return result.content.trim()
}
