// @ts-nocheck
/**
 * Process single peptide through the complete pipeline.
 * CLI command for end-to-end research synthesis.
 */

import type { D1Database, R2Bucket } from '@cloudflare/workers-types'
import { ingestPubMed, type PubMedConfig } from '../ingest/pubmed'
import { ingestClinicalTrials, type ClinicalTrialsConfig } from '../ingest/clinicaltrials'
// import { searchWHOICTRP, type WHOICTRPConfig } from '../ingest/who-ictrp' // TODO: Fix type issues
import { normalize } from '../ingest/normalizer'
import { gradeEvidence } from '../rubric/grade-evidence'
import { synthesizePage, type ClaudeConfig } from '../synthesis'
import { validateCompliance, quickValidation, type ComplianceConfig } from '../compliance'
import { publish, type PublishConfig } from '../publisher'
import type { SourcePack } from '@peptalk/schemas'

export interface ProcessPeptideInput {
  id: string
  name: string
  aliases: string[]
}

export interface ProcessPeptideConfig {
  pubmed: PubMedConfig
  clinicaltrials: ClinicalTrialsConfig
  // whoictrp?: WHOICTRPConfig // TODO: Fix type issues
  claude: ClaudeConfig
  compliance: ComplianceConfig
  publish: PublishConfig
  skipCompliance?: boolean
  dryRun?: boolean
}

export interface ProcessPeptideResult {
  success: boolean
  peptideId: string
  steps: {
    ingest: { pubmedCount: number; clinicalTrialsCount: number; totalCount: number }
    normalize: { deduplicatedCount: number; evidenceGrade: string }
    synthesize: { cost: number; tokens: { input: number; output: number } }
    compliance: { passed: boolean; score: number; issuesCount: number }
    publish?: { pdfUrl: string; pdfSizeBytes: number; pdfPageCount: number }
  }
  error?: string
  duration: number
}

/**
 * Process a single peptide through the complete pipeline.
 */
export async function processPeptide(
  input: ProcessPeptideInput,
  config: ProcessPeptideConfig
): Promise<ProcessPeptideResult> {
  const startTime = Date.now()

  try {
    console.log(`\n🚀 Processing peptide: ${input.name}`)
    console.log(`   Aliases: ${input.aliases.join(', ') || 'none'}`)
    console.log(`   ID: ${input.id}\n`)

    // Step 1: Ingest
    console.log('📥 Step 1/6: Ingesting data from PubMed and ClinicalTrials.gov...')
    const ingestStart = Date.now()

    const [pubmedStudies, clinicalTrialsStudies] = await Promise.all([
      ingestPubMed(input.name, input.aliases, input.id, config.pubmed),
      ingestClinicalTrials(input.name, input.aliases, input.id, config.clinicaltrials),
    ])

    const sourcePack: SourcePack = {
      peptideId: input.id,
      peptideName: input.name,
      aliases: input.aliases,
      studies: [
        ...pubmedStudies.map((s) => ({ ...s, type: 'pubmed' as const })),
        ...clinicalTrialsStudies.map((s) => ({ ...s, type: 'clinicaltrials' as const })),
      ],
      metadata: {
        fetchedAt: new Date().toISOString(),
        sources: {
          pubmed: pubmedStudies.length,
          clinicaltrials: clinicalTrialsStudies.length,
        },
      },
    }

    console.log(`   ✓ Fetched ${pubmedStudies.length} PubMed + ${clinicalTrialsStudies.length} ClinicalTrials studies`)
    console.log(`   ⏱️  ${Date.now() - ingestStart}ms\n`)

    // Step 2: Normalize
    console.log('🔧 Step 2/6: Normalizing and deduplicating...')
    const normalizeStart = Date.now()

    const normalized = normalize(sourcePack)
    const evidenceGrade = gradeEvidence(normalized.studies)

    console.log(`   ✓ Deduplicated to ${normalized.studies.length} studies`)
    console.log(`   ✓ Evidence grade: ${evidenceGrade.toUpperCase()}`)
    console.log(`   ⏱️  ${Date.now() - normalizeStart}ms\n`)

    // Step 3: Synthesize
    console.log('🤖 Step 3/6: Synthesizing content with Claude Sonnet 4.5...')
    const synthesizeStart = Date.now()

    const synthesis = await synthesizePage(
      {
        peptideId: input.id,
        name: input.name,
        aliases: input.aliases,
        studies: normalized.studies,
        evidenceGrade,
      },
      config.claude
    )

    console.log(`   ✓ Generated ${synthesis.pageRecord.sections.length} sections`)
    console.log(`   ✓ Cost: $${synthesis.cost.toFixed(2)}`)
    console.log(`   ✓ Tokens: ${synthesis.usage.inputTokens} input, ${synthesis.usage.outputTokens} output`)
    console.log(`   ⏱️  ${Date.now() - synthesizeStart}ms\n`)

    // Step 4: Quick validation
    console.log('⚡ Step 4/6: Quick validation...')
    const quickValidationStart = Date.now()

    const quickValidationResult = quickValidation(synthesis.pageRecord)

    if (quickValidationResult.issues.length > 0) {
      console.log(`   ⚠️  Found ${quickValidationResult.issues.length} potential issues`)
      for (const issue of quickValidationResult.issues.slice(0, 3)) {
        console.log(`      - [${issue.severity}] ${issue.description}`)
      }
    } else {
      console.log(`   ✓ No obvious issues detected`)
    }
    console.log(`   ⏱️  ${Date.now() - quickValidationStart}ms\n`)

    // Step 5: Full compliance check (optional)
    let complianceResult = quickValidationResult

    if (!config.skipCompliance) {
      console.log('🔍 Step 5/6: Full compliance validation with GPT-5...')
      const complianceStart = Date.now()

      complianceResult = await validateCompliance(synthesis.pageRecord, config.compliance)

      console.log(`   ${complianceResult.passed ? '✓' : '✗'} Compliance score: ${complianceResult.score}/100`)
      if (complianceResult.issues.length > 0) {
        console.log(`   Found ${complianceResult.issues.length} issues:`)
        for (const issue of complianceResult.issues.slice(0, 5)) {
          console.log(`      - [${issue.severity}] ${issue.description}`)
        }
      }
      console.log(`   ⏱️  ${Date.now() - complianceStart}ms\n`)

      if (!complianceResult.passed) {
        throw new Error('Compliance validation failed. Fix issues before publishing.')
      }
    } else {
      console.log('⏭️  Step 5/6: Skipping full compliance check\n')
    }

    // Step 6: Publish
    let publishResult = undefined

    if (!config.dryRun) {
      console.log('📤 Step 6/6: Publishing to D1 and R2...')
      const publishStart = Date.now()

      const published = await publish(synthesis.pageRecord, config.publish)

      if (!published.success) {
        throw new Error(published.error || 'Publishing failed')
      }

      publishResult = {
        pdfUrl: published.pdfUrl,
        pdfSizeBytes: published.pdf.sizeBytes,
        pdfPageCount: published.pdf.pageCount,
      }

      console.log(`   ✓ PDF generated: ${published.pdf.pageCount} pages, ${formatBytes(published.pdf.sizeBytes)}`)
      console.log(`   ✓ Database updated: ${published.database.studiesInserted} studies, ${published.database.sectionsInserted} sections`)
      console.log(`   ✓ PDF uploaded: ${published.pdfUrl}`)
      console.log(`   ⏱️  ${Date.now() - publishStart}ms\n`)
    } else {
      console.log('🏃 Step 6/6: Dry run - skipping publish\n')
    }

    const duration = Date.now() - startTime

    console.log(`✅ Successfully processed ${input.name} in ${formatDuration(duration)}\n`)

    return {
      success: true,
      peptideId: input.id,
      steps: {
        ingest: {
          pubmedCount: pubmedStudies.length,
          clinicalTrialsCount: clinicalTrialsStudies.length,
          totalCount: sourcePack.studies.length,
        },
        normalize: {
          deduplicatedCount: normalized.studies.length,
          evidenceGrade,
        },
        synthesize: {
          cost: synthesis.cost,
          tokens: {
            input: synthesis.usage.inputTokens,
            output: synthesis.usage.outputTokens,
          },
        },
        compliance: {
          passed: complianceResult.passed,
          score: complianceResult.score,
          issuesCount: complianceResult.issues.length,
        },
        publish: publishResult,
      },
      duration,
    }
  } catch (error) {
    const duration = Date.now() - startTime

    console.error(`\n❌ Failed to process ${input.name}:`, error)

    return {
      success: false,
      peptideId: input.id,
      steps: {
        ingest: { pubmedCount: 0, clinicalTrialsCount: 0, whoictrpCount: 0, totalCount: 0 },
        normalize: { deduplicatedCount: 0, evidenceGrade: 'very_low' },
        synthesize: { cost: 0, tokens: { input: 0, output: 0 } },
        compliance: { passed: false, score: 0, issuesCount: 0 },
      },
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
    }
  }
}

/**
 * Format bytes for display.
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Format duration for display.
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
}
