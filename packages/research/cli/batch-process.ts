/**
 * Batch process multiple peptides from YAML file.
 * Processes peptides sequentially with progress reporting.
 */

import * as fs from 'fs/promises'
import * as yaml from 'yaml'
import { processPeptide, type ProcessPeptideConfig, type ProcessPeptideResult } from './process-peptide'

export interface PeptideInput {
  id: string
  name: string
  aliases?: string[]
}

export interface BatchInput {
  peptides: PeptideInput[]
}

export interface BatchProcessResult {
  total: number
  succeeded: number
  failed: number
  results: ProcessPeptideResult[]
  totalCost: number
  totalDuration: number
}

/**
 * Load peptides from YAML file.
 */
export async function loadPeptidesFromYaml(filePath: string): Promise<PeptideInput[]> {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const data = yaml.parse(content) as BatchInput

    if (!data.peptides || !Array.isArray(data.peptides)) {
      throw new Error('YAML file must contain "peptides" array')
    }

    return data.peptides.map((p) => ({
      id: p.id,
      name: p.name,
      aliases: p.aliases || [],
    }))
  } catch (error) {
    throw new Error(`Failed to load YAML: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Batch process peptides.
 */
export async function batchProcess(
  peptides: PeptideInput[],
  config: ProcessPeptideConfig,
  options: {
    continueOnError?: boolean
    delayBetween?: number
  } = {}
): Promise<BatchProcessResult> {
  const startTime = Date.now()
  const results: ProcessPeptideResult[] = []

  console.log(`\n╔═══════════════════════════════════════════════════════════╗`)
  console.log(`║  Batch Processing: ${peptides.length} peptides`)
  console.log(`╚═══════════════════════════════════════════════════════════╝\n`)

  for (let i = 0; i < peptides.length; i++) {
    const peptide = peptides[i]

    console.log(`\n┌─────────────────────────────────────────────────────────┐`)
    console.log(`│  [${i + 1}/${peptides.length}] Processing: ${peptide.name}`)
    console.log(`└─────────────────────────────────────────────────────────┘`)

    try {
      const result = await processPeptide(peptide, config)
      results.push(result)

      if (!result.success && !options.continueOnError) {
        console.error(`\n❌ Batch processing stopped due to error.\n`)
        break
      }

      // Delay between peptides to respect rate limits
      if (i < peptides.length - 1 && options.delayBetween) {
        console.log(`\n⏳ Waiting ${options.delayBetween}ms before next peptide...\n`)
        await sleep(options.delayBetween)
      }
    } catch (error) {
      console.error(`\n❌ Unexpected error processing ${peptide.name}:`, error)

      results.push({
        success: false,
        peptideId: peptide.id,
        steps: {
          ingest: { pubmedCount: 0, clinicalTrialsCount: 0, totalCount: 0 },
          normalize: { deduplicatedCount: 0, evidenceGrade: 'very_low' },
          synthesize: { cost: 0, tokens: { input: 0, output: 0 } },
          compliance: { passed: false, score: 0, issuesCount: 0 },
        },
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: 0,
      })

      if (!options.continueOnError) {
        break
      }
    }
  }

  const totalDuration = Date.now() - startTime

  // Calculate summary
  const succeeded = results.filter((r) => r.success).length
  const failed = results.filter((r) => !r.success).length
  const totalCost = results.reduce((sum, r) => sum + (r.steps.synthesize?.cost || 0), 0)

  // Print summary
  console.log(`\n╔═══════════════════════════════════════════════════════════╗`)
  console.log(`║  Batch Processing Complete`)
  console.log(`╠═══════════════════════════════════════════════════════════╣`)
  console.log(`║  Total:      ${results.length}`)
  console.log(`║  Succeeded:  ${succeeded} (${((succeeded / results.length) * 100).toFixed(1)}%)`)
  console.log(`║  Failed:     ${failed} (${((failed / results.length) * 100).toFixed(1)}%)`)
  console.log(`║  Total Cost: $${totalCost.toFixed(2)}`)
  console.log(`║  Duration:   ${formatDuration(totalDuration)}`)
  console.log(`╚═══════════════════════════════════════════════════════════╝\n`)

  if (failed > 0) {
    console.log(`❌ Failed peptides:`)
    for (const result of results.filter((r) => !r.success)) {
      console.log(`   - ${result.peptideId}: ${result.error}`)
    }
    console.log()
  }

  return {
    total: results.length,
    succeeded,
    failed,
    results,
    totalCost,
    totalDuration,
  }
}

/**
 * Generate batch summary report.
 */
export function generateReport(result: BatchProcessResult): string {
  const lines: string[] = []

  lines.push('# Batch Processing Report')
  lines.push('')
  lines.push(`**Date:** ${new Date().toISOString()}`)
  lines.push(`**Total Peptides:** ${result.total}`)
  lines.push(`**Succeeded:** ${result.succeeded}`)
  lines.push(`**Failed:** ${result.failed}`)
  lines.push(`**Total Cost:** $${result.totalCost.toFixed(2)}`)
  lines.push(`**Duration:** ${formatDuration(result.totalDuration)}`)
  lines.push('')

  lines.push('## Results')
  lines.push('')
  lines.push('| Peptide | Status | Evidence Grade | Studies | Cost | Duration |')
  lines.push('|---------|--------|----------------|---------|------|----------|')

  for (const r of result.results) {
    const status = r.success ? '✅' : '❌'
    const grade = r.steps.normalize.evidenceGrade.toUpperCase()
    const studies = r.steps.normalize.deduplicatedCount
    const cost = `$${r.steps.synthesize.cost.toFixed(2)}`
    const duration = formatDuration(r.duration)

    lines.push(`| ${r.peptideId} | ${status} | ${grade} | ${studies} | ${cost} | ${duration} |`)
  }

  lines.push('')

  if (result.failed > 0) {
    lines.push('## Errors')
    lines.push('')

    for (const r of result.results.filter((x) => !x.success)) {
      lines.push(`### ${r.peptideId}`)
      lines.push('')
      lines.push(`\`\`\``)
      lines.push(r.error || 'Unknown error')
      lines.push(`\`\`\``)
      lines.push('')
    }
  }

  return lines.join('\n')
}

/**
 * Sleep utility.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Format duration for display.
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
}
