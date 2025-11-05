/**
 * Claude Sonnet 4.5 synthesis module.
 * Main entry point for content generation.
 */

export * from './client'
export * from './prompts'
export * from './parser'

import type { Study, EvidenceGrade, PageRecord, Section } from '@peptalk/schemas'
import { calculateStudyCounts } from '@peptalk/schemas'
import { synthesize as callClaude, type ClaudeConfig } from './client'
import { SYSTEM_PROMPT, generateUserPrompt } from './prompts'
import { parseSynthesis, cleanHtml, validateCitations } from './parser'

export interface SynthesisInput {
  peptideId: string
  name: string
  aliases: string[]
  studies: Study[]
  evidenceGrade: EvidenceGrade
}

export interface SynthesisOutput {
  pageRecord: Omit<PageRecord, 'lastUpdated' | 'version'>
  cost: number
  usage: {
    inputTokens: number
    outputTokens: number
  }
}

/**
 * Synthesize a complete PageRecord from studies.
 */
export async function synthesizePage(
  input: SynthesisInput,
  config: ClaudeConfig
): Promise<SynthesisOutput> {
  // Generate prompts
  const userPrompt = generateUserPrompt(
    input.name,
    input.aliases,
    input.studies,
    input.evidenceGrade
  )

  // Call Claude API
  const result = await callClaude(SYSTEM_PROMPT, userPrompt, config)

  // Clean HTML
  const cleanedHtml = cleanHtml(result.content)

  // Parse into sections
  const { summaryHtml, sections } = parseSynthesis(cleanedHtml)

  // Validate citations
  const validation = validateCitations(cleanedHtml)

  if (!validation.valid) {
    console.warn('Synthesis may have missing citations:', validation.missingCitations)
  }

  // Calculate study counts
  const { humanRctCount, animalCount } = calculateStudyCounts(input.studies)

  // Build PageRecord
  const pageRecord: SynthesisOutput['pageRecord'] = {
    slug: input.peptideId,
    name: input.name,
    aliases: input.aliases,
    evidenceGrade: input.evidenceGrade,
    summaryHtml,
    sections,
    studies: input.studies,
    humanRctCount,
    animalCount,
    legalNotes: [
      'This content is for educational purposes only.',
      'Not intended as medical advice.',
      'Consult a healthcare provider before use.',
    ],
  }

  // Calculate cost
  const costPerPeptide = (result.usage.inputTokens / 1_000_000) * 3 +
    (result.usage.outputTokens / 1_000_000) * 15

  return {
    pageRecord,
    cost: costPerPeptide,
    usage: result.usage,
  }
}
