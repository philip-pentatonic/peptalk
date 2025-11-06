// @ts-nocheck
/**
 * GPT-5 compliance validation module.
 * Checks synthesized content for medical advice, dosing, vendor mentions.
 */

import OpenAI from 'openai'
import type { PageRecord } from '@peptalk/schemas'

export interface ComplianceConfig {
  apiKey: string
  model?: string
}

export interface ComplianceResult {
  passed: boolean
  issues: ComplianceIssue[]
  score: number // 0-100
}

export interface ComplianceIssue {
  type: 'medical_advice' | 'dosing' | 'vendor' | 'claims' | 'other'
  severity: 'critical' | 'warning' | 'info'
  description: string
  location?: string
}

const COMPLIANCE_PROMPT = `You are a compliance validator for educational peptide content.

REVIEW THE CONTENT FOR VIOLATIONS:

CRITICAL (must fix):
1. Medical advice (e.g., "you should take", "we recommend", "consult your doctor about dosing")
2. Dosage recommendations (e.g., "take 250mcg daily", "typical dose is")
3. Vendor mentions or purchase guidance (e.g., "buy from X", "available at Y")
4. Unsubstantiated claims without citations

WARNINGS (should fix):
5. Promotional language (e.g., "miracle", "revolutionary", "breakthrough")
6. Absolute claims without qualifiers (e.g., "always works", "guaranteed")
7. Missing citations for empirical claims

EVALUATE:
- Assign a compliance score (0-100, where 100 = perfect compliance)
- List all issues found with severity levels
- Provide specific quotes showing violations

RETURN JSON:
{
  "passed": boolean,
  "score": number,
  "issues": [
    {
      "type": "medical_advice" | "dosing" | "vendor" | "claims" | "other",
      "severity": "critical" | "warning" | "info",
      "description": "explanation",
      "location": "exact quote from content"
    }
  ]
}

Be strict but fair. Educational content should inform, not prescribe.`

/**
 * Validate PageRecord for compliance.
 */
export async function validateCompliance(
  pageRecord: Omit<PageRecord, 'lastUpdated' | 'version'>,
  config: ComplianceConfig
): Promise<ComplianceResult> {
  const client = new OpenAI({
    apiKey: config.apiKey,
  })

  // Combine all content for review
  const contentToReview = [
    `PEPTIDE: ${pageRecord.name}`,
    `SUMMARY: ${pageRecord.summaryHtml}`,
    ...pageRecord.sections.map((s) => `SECTION "${s.title}": ${s.contentHtml}`),
  ].join('\n\n')

  try {
    const response = await client.chat.completions.create({
      model: config.model || 'gpt-5',
      messages: [
        {
          role: 'system',
          content: COMPLIANCE_PROMPT,
        },
        {
          role: 'user',
          content: contentToReview,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    })

    const result = JSON.parse(response.choices[0].message.content || '{}')

    return {
      passed: result.passed ?? false,
      score: result.score ?? 0,
      issues: result.issues ?? [],
    }
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      throw new Error(`OpenAI API error: ${error.message}`)
    }
    throw error
  }
}

/**
 * Quick pre-validation check using regex patterns.
 * Faster than LLM, catches obvious violations.
 */
export function quickValidation(
  pageRecord: Omit<PageRecord, 'lastUpdated' | 'version'>
): ComplianceResult {
  const issues: ComplianceIssue[] = []
  const allContent = [
    pageRecord.summaryHtml,
    ...pageRecord.sections.map((s) => s.contentHtml),
  ].join(' ')

  // Check for medical advice patterns
  const medicalAdvicePatterns = [
    /\b(you should|we recommend|recommended dose|consult your doctor about)\b/i,
    /\b(take|use|administer)\s+\d+\s*(mcg|mg|ml|iu)/i,
  ]

  for (const pattern of medicalAdvicePatterns) {
    const match = allContent.match(pattern)
    if (match) {
      issues.push({
        type: 'medical_advice',
        severity: 'critical',
        description: 'Content appears to provide medical advice',
        location: match[0],
      })
    }
  }

  // Check for dosing information
  const dosingPatterns = [
    /\b(dose|dosage|dosing)\s*:?\s*\d+/i,
    /\b\d+\s*(mcg|mg|ml|iu)\s+(daily|twice daily|per day|weekly)/i,
  ]

  for (const pattern of dosingPatterns) {
    const match = allContent.match(pattern)
    if (match) {
      issues.push({
        type: 'dosing',
        severity: 'critical',
        description: 'Content includes specific dosing information',
        location: match[0],
      })
    }
  }

  // Check for vendor mentions
  const vendorPatterns = [
    /\b(buy|purchase|order|available at|sold by)\b/i,
    /\b(vendor|supplier|source)\b/i,
  ]

  for (const pattern of vendorPatterns) {
    const match = allContent.match(pattern)
    if (match) {
      issues.push({
        type: 'vendor',
        severity: 'critical',
        description: 'Content mentions vendors or purchasing',
        location: match[0],
      })
    }
  }

  // Check for missing citations on claims
  const claimPatterns = [
    /\b(increase|decrease|improve|reduce|enhance)\w*\s+\w+/i,
  ]

  for (const pattern of claimPatterns) {
    const matches = allContent.matchAll(new RegExp(pattern.source, 'gi'))

    for (const match of matches) {
      // Check if citation is nearby (within 50 chars)
      const contextStart = Math.max(0, match.index! - 50)
      const contextEnd = Math.min(allContent.length, match.index! + match[0].length + 50)
      const context = allContent.substring(contextStart, contextEnd)

      if (!/\[(PMID:|NCT:)/.test(context)) {
        issues.push({
          type: 'claims',
          severity: 'warning',
          description: 'Effect claim may be missing citation',
          location: match[0],
        })
        break // Only report once
      }
    }
  }

  const criticalCount = issues.filter((i) => i.severity === 'critical').length
  const passed = criticalCount === 0

  // Calculate score
  const score = passed ? Math.max(70, 100 - issues.length * 10) : 0

  return {
    passed,
    score,
    issues,
  }
}
