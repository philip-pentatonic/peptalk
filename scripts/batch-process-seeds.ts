/**
 * Batch Process Seed Peptides
 *
 * Reads peptides-tier1-seed.csv and processes them through the research pipeline.
 * Useful for initial catalog building.
 */

import * as fs from 'fs'
import * as path from 'path'
import { parse } from 'csv-parse/sync'

interface SeedPeptide {
  id: string
  name: string
  aliases: string
  priority: string
  notes: string
}

interface ProcessResult {
  peptideId: string
  success: boolean
  duration: number
  error?: string
}

/**
 * Load seed peptides from CSV
 */
function loadSeedPeptides(): SeedPeptide[] {
  const csvPath = path.join(process.cwd(), 'peptides-tier1-seed.csv')

  if (!fs.existsSync(csvPath)) {
    throw new Error(`Seed file not found: ${csvPath}`)
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  })

  return records as SeedPeptide[]
}

/**
 * Process a single peptide via HTTP API
 */
async function processPeptide(
  peptide: SeedPeptide,
  apiUrl: string
): Promise<ProcessResult> {
  console.log(`\n📦 Processing ${peptide.name}...`)

  const startTime = Date.now()

  try {
    const aliases = peptide.aliases.split('|').map(a => a.trim())

    const response = await fetch(`${apiUrl}/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        peptideId: peptide.id,
        name: peptide.name,
        aliases,
        force: false, // Don't reprocess if already exists
      }),
    })

    const result = await response.json()
    const duration = Date.now() - startTime

    if (!response.ok || !result.success) {
      console.log(`   ❌ Failed: ${result.error || 'Unknown error'}`)
      return {
        peptideId: peptide.id,
        success: false,
        duration,
        error: result.error || 'Unknown error',
      }
    }

    console.log(`   ✅ Success in ${(duration / 1000).toFixed(1)}s`)
    console.log(`      - ${result.steps.ingest.totalCount} studies ingested`)
    console.log(`      - ${result.steps.normalize.evidenceGrade} evidence grade`)
    console.log(`      - ${result.steps.categorize?.categoriesCount || 0} categories assigned`)

    return {
      peptideId: peptide.id,
      success: true,
      duration,
    }

  } catch (error) {
    const duration = Date.now() - startTime
    console.log(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)

    return {
      peptideId: peptide.id,
      success: false,
      duration,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Batch process all seed peptides
 */
async function batchProcessSeeds(config: {
  apiUrl: string
  priorities?: string[]
  skipCompleted?: boolean
  delayBetween?: number
}): Promise<void> {
  console.log('🚀 Starting batch processing of seed peptides...\n')

  const seeds = loadSeedPeptides()
  const priorities = config.priorities || ['high', 'medium']

  // Filter by priority and completion status
  const toProcess = seeds.filter(seed => {
    if (config.skipCompleted && seed.priority === 'completed') return false
    if (!priorities.includes(seed.priority) && seed.priority !== 'completed') return false
    return true
  })

  console.log(`📋 Loaded ${seeds.length} seed peptides`)
  console.log(`   - Completed: ${seeds.filter(s => s.priority === 'completed').length}`)
  console.log(`   - High priority: ${seeds.filter(s => s.priority === 'high').length}`)
  console.log(`   - Medium priority: ${seeds.filter(s => s.priority === 'medium').length}`)
  console.log(`   - To process: ${toProcess.length}\n`)

  const results: ProcessResult[] = []
  const delayBetween = config.delayBetween || 5000 // 5 seconds between requests

  for (let i = 0; i < toProcess.length; i++) {
    const peptide = toProcess[i]
    console.log(`\n[${i + 1}/${toProcess.length}] ${peptide.name}`)

    const result = await processPeptide(peptide, config.apiUrl)
    results.push(result)

    // Delay between requests to avoid overwhelming the API
    if (i < toProcess.length - 1) {
      console.log(`   ⏸️  Waiting ${delayBetween / 1000}s before next peptide...`)
      await new Promise(resolve => setTimeout(resolve, delayBetween))
    }
  }

  // Summary
  const successful = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0)

  console.log('\n' + '='.repeat(60))
  console.log('📊 BATCH PROCESSING SUMMARY')
  console.log('='.repeat(60))
  console.log(`Total processed: ${results.length}`)
  console.log(`Successful: ${successful} (${((successful / results.length) * 100).toFixed(1)}%)`)
  console.log(`Failed: ${failed}`)
  console.log(`Total duration: ${(totalDuration / 1000 / 60).toFixed(1)} minutes`)
  console.log(`Average per peptide: ${(totalDuration / results.length / 1000).toFixed(1)}s`)

  if (failed > 0) {
    console.log('\n❌ Failed peptides:')
    results.filter(r => !r.success).forEach(r => {
      console.log(`   - ${r.peptideId}: ${r.error}`)
    })
  }

  console.log('\n✅ Batch processing complete!\n')

  // Save results
  const resultsPath = path.join(process.cwd(), 'batch-results.json')
  fs.writeFileSync(resultsPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: {
      total: results.length,
      successful,
      failed,
      totalDuration,
    },
    results,
  }, null, 2))

  console.log(`💾 Results saved to batch-results.json\n`)
}

// CLI execution
if (require.main === module) {
  const config = {
    apiUrl: process.env.RESEARCH_API_URL || 'https://peptalk-research.fly.dev',
    priorities: ['high'], // Only process high priority by default
    skipCompleted: true,
    delayBetween: 10000, // 10 seconds between requests (API/rate limiting friendly)
  }

  // Parse command line args
  const args = process.argv.slice(2)
  if (args.includes('--all-priorities')) {
    config.priorities = ['high', 'medium', 'low']
  }
  if (args.includes('--include-completed')) {
    config.skipCompleted = false
  }

  batchProcessSeeds(config)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('\n❌ Batch processing failed:', error)
      process.exit(1)
    })
}
