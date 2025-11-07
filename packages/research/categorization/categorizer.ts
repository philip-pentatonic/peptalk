/**
 * Automatic peptide categorization using Claude AI.
 * Analyzes synthesized research content to assign relevant categories.
 */

import Anthropic from '@anthropic-ai/sdk'

export interface CategoryAssignment {
  categorySlug: string
  confidence: 'high' | 'medium' | 'low'
  reasoning: string
}

export interface CategorizationResult {
  categories: CategoryAssignment[]
}

/**
 * Available category definitions
 */
const CATEGORY_DEFINITIONS = {
  'weight-loss': 'Peptides studied for fat loss, metabolism regulation, appetite control, and body composition changes',
  'muscle-growth': 'Peptides for muscle building, hypertrophy, strength gains, and athletic performance',
  'skin-health': 'Peptides for skin quality, wrinkle reduction, collagen production, and anti-aging effects on skin',
  'healing': 'Wound healing, tissue repair, injury recovery, and regenerative medicine applications',
  'immune': 'Immune system modulation, immune support, and immune-related therapeutic effects',
  'cognitive': 'Brain health, memory enhancement, neuroprotection, and cognitive function improvements',
  'longevity': 'Anti-aging, telomere support, lifespan extension, and cellular senescence',
  'joint-bone': 'Joint health, cartilage repair, bone density, osteoarthritis, and skeletal support',
  'gut-health': 'Digestive health, intestinal repair, gut barrier function, and gastrointestinal conditions',
  'hormone': 'Growth hormone, testosterone, hormonal balance, and endocrine system effects',
}

const CATEGORIZATION_PROMPT = `You are a research analyst categorizing peptides based on scientific evidence.

AVAILABLE CATEGORIES:
${Object.entries(CATEGORY_DEFINITIONS)
  .map(([slug, description]) => `- ${slug}: ${description}`)
  .join('\n')}

TASK:
Analyze the provided peptide research synthesis and assign relevant categories.

RULES:
1. Only assign categories where there is clear evidence in the research
2. Assign confidence levels:
   - high: Multiple high-quality studies directly support this use case
   - medium: Some evidence exists, or evidence is from animal studies only
   - low: Limited or preliminary evidence, or mechanistic rationale only
3. A peptide can have multiple categories (typically 1-5)
4. Be conservative - only assign if evidence genuinely supports the category
5. Provide brief reasoning for each category assignment

OUTPUT FORMAT (JSON):
{
  "categories": [
    {
      "categorySlug": "healing",
      "confidence": "high",
      "reasoning": "Multiple RCTs show accelerated wound healing and tissue repair"
    },
    {
      "categorySlug": "gut-health",
      "confidence": "high",
      "reasoning": "Strong evidence for intestinal repair in IBD and leaky gut conditions"
    }
  ]
}

Only output valid JSON, no additional text.`

/**
 * Categorize a peptide based on its research synthesis
 */
export async function categorizePeptide(
  peptideName: string,
  synthesisHtml: string,
  apiKey: string,
  model: string = 'claude-sonnet-4-5-20250929'
): Promise<CategorizationResult> {
  const client = new Anthropic({ apiKey })

  const response = await client.messages.create({
    model,
    max_tokens: 2000,
    temperature: 0, // Deterministic for consistency
    messages: [
      {
        role: 'user',
        content: `Peptide: ${peptideName}\n\nResearch Synthesis:\n${synthesisHtml}\n\nCategorize this peptide based on the research evidence.`,
      },
    ],
    system: CATEGORIZATION_PROMPT,
  })

  const content = response.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude')
  }

  // Parse JSON response
  try {
    const result = JSON.parse(content.text) as CategorizationResult
    return result
  } catch (error) {
    console.error('Failed to parse categorization response:', content.text)
    throw new Error(`Failed to parse categorization: ${error}`)
  }
}

/**
 * Validate category assignments
 */
export function validateCategories(result: CategorizationResult): boolean {
  if (!result.categories || !Array.isArray(result.categories)) {
    return false
  }

  for (const cat of result.categories) {
    // Check category slug is valid
    if (!Object.keys(CATEGORY_DEFINITIONS).includes(cat.categorySlug)) {
      console.warn(`Invalid category slug: ${cat.categorySlug}`)
      return false
    }

    // Check confidence is valid
    if (!['high', 'medium', 'low'].includes(cat.confidence)) {
      console.warn(`Invalid confidence level: ${cat.confidence}`)
      return false
    }

    // Check reasoning exists
    if (!cat.reasoning || cat.reasoning.length < 10) {
      console.warn(`Missing or insufficient reasoning for ${cat.categorySlug}`)
      return false
    }
  }

  return true
}
