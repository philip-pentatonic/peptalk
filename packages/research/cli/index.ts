#!/usr/bin/env node

/**
 * PepTalk Research Pipeline CLI.
 * Command-line interface for processing peptides.
 */

import * as fs from 'fs/promises'
import { processPeptide, type ProcessPeptideConfig } from './process-peptide'
import { batchProcess, loadPeptidesFromYaml, generateReport } from './batch-process'

export * from './process-peptide'
export * from './batch-process'

/**
 * Parse command-line arguments.
 */
function parseArgs(): {
  command: 'single' | 'batch' | 'help'
  peptideId?: string
  peptideName?: string
  aliases?: string[]
  yamlFile?: string
  dryRun?: boolean
  skipCompliance?: boolean
  continueOnError?: boolean
  outputReport?: string
} {
  const args = process.argv.slice(2)

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    return { command: 'help' }
  }

  const command = args[0] as 'single' | 'batch' | 'help'

  if (command === 'single') {
    const peptideId = args[1]
    const peptideName = args[2]
    const aliases = args
      .slice(3)
      .filter((arg) => !arg.startsWith('--'))

    return {
      command: 'single',
      peptideId,
      peptideName,
      aliases,
      dryRun: args.includes('--dry-run'),
      skipCompliance: args.includes('--skip-compliance'),
    }
  }

  if (command === 'batch') {
    const yamlFile = args[1]

    return {
      command: 'batch',
      yamlFile,
      dryRun: args.includes('--dry-run'),
      skipCompliance: args.includes('--skip-compliance'),
      continueOnError: args.includes('--continue-on-error'),
      outputReport: args.find((arg) => arg.startsWith('--report='))?.split('=')[1],
    }
  }

  return { command: 'help' }
}

/**
 * Load configuration from environment.
 */
function loadConfig(): ProcessPeptideConfig {
  const pubmedEmail = process.env.PUBMED_EMAIL
  const pubmedApiKey = process.env.PUBMED_API_KEY
  const claudeApiKey = process.env.ANTHROPIC_API_KEY
  const openaiApiKey = process.env.OPENAI_API_KEY

  if (!pubmedEmail) {
    throw new Error('PUBMED_EMAIL environment variable is required')
  }

  if (!claudeApiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required')
  }

  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required')
  }

  // Note: These are placeholder values - in production, these would be properly initialized
  const placeholderDb = {} as any
  const placeholderR2 = {} as any

  return {
    pubmed: {
      email: pubmedEmail,
      apiKey: pubmedApiKey,
      maxResults: 100,
    },
    clinicaltrials: {
      maxResults: 50,
    },
    claude: {
      apiKey: claudeApiKey,
      model: 'claude-sonnet-4-5-20250929',
      maxTokens: 8000,
      temperature: 0.3,
    },
    compliance: {
      apiKey: openaiApiKey,
      model: 'gpt-5',
    },
    publish: {
      db: placeholderDb,
      r2Bucket: placeholderR2,
      r2PublicUrl: process.env.R2_PUBLIC_URL,
    },
  }
}

/**
 * Print help message.
 */
function printHelp(): void {
  console.log(`
PepTalk Research Pipeline CLI

USAGE:
  peptalk-research single <id> <name> [aliases...] [options]
  peptalk-research batch <yaml-file> [options]

COMMANDS:
  single    Process a single peptide
  batch     Process multiple peptides from YAML file

OPTIONS:
  --dry-run              Generate content but don't publish
  --skip-compliance      Skip GPT-5 compliance validation
  --continue-on-error    Continue batch processing on errors
  --report=<file>        Save batch report to file

ENVIRONMENT VARIABLES:
  PUBMED_EMAIL           Email for PubMed API (required)
  PUBMED_API_KEY         API key for PubMed (optional, increases rate limit)
  ANTHROPIC_API_KEY      Claude API key (required)
  OPENAI_API_KEY         OpenAI API key for compliance (required)
  R2_PUBLIC_URL          Public URL for R2 bucket (optional)

EXAMPLES:
  # Process single peptide
  peptalk-research single bpc-157 "BPC-157" "Body Protection Compound"

  # Batch process with dry run
  peptalk-research batch peptides.yaml --dry-run

  # Batch process with report
  peptalk-research batch peptides.yaml --report=report.md

YAML FORMAT:
  peptides:
    - id: bpc-157
      name: BPC-157
      aliases:
        - Body Protection Compound
        - Pentadecapeptide BPC 157
    - id: tb-500
      name: TB-500
      aliases:
        - Thymosin Beta-4

For more information, visit: https://github.com/philip-pentatonic/peptalk
`)
}

/**
 * Main CLI function.
 */
async function main(): Promise<void> {
  try {
    const args = parseArgs()

    if (args.command === 'help') {
      printHelp()
      process.exit(0)
    }

    console.log(`\n╔═══════════════════════════════════════════════════════════╗`)
    console.log(`║  PepTalk Research Pipeline CLI`)
    console.log(`╚═══════════════════════════════════════════════════════════╝\n`)

    const config = loadConfig()

    if (args.dryRun) {
      console.log('🏃 Dry run mode - will not publish to production\n')
    }

    if (args.skipCompliance) {
      console.log('⏭️  Skipping full compliance validation\n')
      config.skipCompliance = true
    }

    if (args.command === 'single') {
      if (!args.peptideId || !args.peptideName) {
        console.error('❌ Error: peptide ID and name are required')
        printHelp()
        process.exit(1)
      }

      config.dryRun = args.dryRun

      const result = await processPeptide(
        {
          id: args.peptideId,
          name: args.peptideName,
          aliases: args.aliases || [],
        },
        config
      )

      if (!result.success) {
        process.exit(1)
      }
    } else if (args.command === 'batch') {
      if (!args.yamlFile) {
        console.error('❌ Error: YAML file path is required')
        printHelp()
        process.exit(1)
      }

      console.log(`📂 Loading peptides from: ${args.yamlFile}\n`)

      const peptides = await loadPeptidesFromYaml(args.yamlFile)

      console.log(`✓ Loaded ${peptides.length} peptides\n`)

      config.dryRun = args.dryRun

      const result = await batchProcess(peptides, config, {
        continueOnError: args.continueOnError,
        delayBetween: 1000, // 1 second between peptides
      })

      if (args.outputReport) {
        const report = generateReport(result)
        await fs.writeFile(args.outputReport, report, 'utf-8')
        console.log(`📄 Report saved to: ${args.outputReport}\n`)
      }

      if (result.failed > 0) {
        process.exit(1)
      }
    }
  } catch (error) {
    console.error('\n❌ CLI Error:', error)
    process.exit(1)
  }
}

// Run CLI if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
