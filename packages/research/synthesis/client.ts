// @ts-nocheck
/**
 * Claude Sonnet 4.5 API client for evidence synthesis.
 */

import Anthropic from '@anthropic-ai/sdk'

export interface ClaudeConfig {
  apiKey: string
  model?: string
  maxTokens?: number
  temperature?: number
}

export interface SynthesisResult {
  content: string
  usage: {
    inputTokens: number
    outputTokens: number
  }
}

/**
 * Synthesize content using Claude Sonnet 4.5.
 */
export async function synthesize(
  systemPrompt: string,
  userPrompt: string,
  config: ClaudeConfig
): Promise<SynthesisResult> {
  const client = new Anthropic({
    apiKey: config.apiKey,
  })

  try {
    const response = await client.messages.create({
      model: config.model || 'claude-sonnet-4-5-20250929',
      max_tokens: config.maxTokens || 8000,
      temperature: config.temperature || 0.3,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    })

    // Extract text content
    const content = response.content
      .filter((block) => block.type === 'text')
      .map((block) => (block as { type: 'text'; text: string }).text)
      .join('\n')

    return {
      content,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    }
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      throw new Error(`Claude API error: ${error.message}`)
    }
    throw error
  }
}

/**
 * Calculate estimated cost for synthesis.
 * Based on Claude Sonnet 4.5 pricing.
 */
export function estimateCost(usage: SynthesisResult['usage']): number {
  // Claude Sonnet 4.5 pricing (as of 2025):
  // Input: $3 per million tokens
  // Output: $15 per million tokens

  const inputCost = (usage.inputTokens / 1_000_000) * 3
  const outputCost = (usage.outputTokens / 1_000_000) * 15

  return inputCost + outputCost
}
