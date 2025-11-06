/**
 * Generate BPC-157 report and save to file for review
 */

import { writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  // Import the pipeline modules
  const { ingestPubMed } = await import('./packages/research/dist/ingest/pubmed/index.js');
  const { ingestClinicalTrials } = await import('./packages/research/dist/ingest/clinicaltrials/index.js');
  const { normalize } = await import('./packages/research/dist/ingest/normalizer/index.js');
  const { gradeEvidence } = await import('./packages/research/dist/rubric/grade-evidence.js');
  const { synthesizePage } = await import('./packages/research/dist/synthesis/index.js');

  console.log('🔬 Generating BPC-157 research report...\n');

  // Config
  const peptideId = 'bpc-157';
  const peptideName = 'BPC-157';
  const aliases = ['Body Protection Compound'];

  const pubmedConfig = {
    email: process.env.PUBMED_EMAIL || 'support@machinegenie.ai',
    apiKey: process.env.PUBMED_API_KEY,
    maxResults: 100,
  };

  const clinicalTrialsConfig = {
    maxResults: 50,
  };

  const claudeConfig = {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-sonnet-4-5-20250929',
    maxTokens: 8000,
  };

  // Step 1: Ingest
  console.log('📥 Step 1: Ingesting from PubMed and ClinicalTrials.gov...');
  const [pubmedStudies, clinicalTrialsStudies] = await Promise.all([
    ingestPubMed(peptideName, aliases, peptideId, pubmedConfig),
    ingestClinicalTrials(peptideName, aliases, peptideId, clinicalTrialsConfig),
  ]);

  console.log(`   ✓ Fetched ${pubmedStudies.length} PubMed + ${clinicalTrialsStudies.length} ClinicalTrials studies\n`);

  // Step 2: Normalize
  console.log('🔧 Step 2: Normalizing...');
  const sourcePack = {
    peptideId,
    peptideName,
    aliases,
    studies: [
      ...pubmedStudies.map(s => ({ ...s, type: 'pubmed' })),
      ...clinicalTrialsStudies.map(s => ({ ...s, type: 'clinicaltrials' })),
    ],
    metadata: {
      fetchedAt: new Date().toISOString(),
      sources: {
        pubmed: pubmedStudies.length,
        clinicaltrials: clinicalTrialsStudies.length,
      },
    },
  };

  const normalized = normalize(sourcePack);
  const evidenceGrade = gradeEvidence(normalized.studies);

  console.log(`   ✓ Deduplicated to ${normalized.studies.length} studies`);
  console.log(`   ✓ Evidence grade: ${evidenceGrade.toUpperCase()}\n`);

  // Step 3: Synthesize
  console.log('🤖 Step 3: Synthesizing with Claude Sonnet 4.5...');
  const synthesis = await synthesizePage(
    {
      peptideId,
      name: peptideName,
      aliases,
      studies: normalized.studies,
      evidenceGrade,
    },
    claudeConfig
  );

  console.log(`   ✓ Generated ${synthesis.pageRecord.sections.length} sections`);
  console.log(`   ✓ Cost: $${synthesis.cost.toFixed(2)}`);
  console.log(`   ✓ Tokens: ${synthesis.usage.inputTokens} input, ${synthesis.usage.outputTokens} output\n`);

  // Save to file
  const outputPath = join(__dirname, 'bpc157-report.json');
  await writeFile(outputPath, JSON.stringify(synthesis.pageRecord, null, 2), 'utf-8');

  console.log(`✅ Report saved to: ${outputPath}\n`);

  // Print summary
  console.log('📊 Summary:');
  console.log(`   Name: ${synthesis.pageRecord.name}`);
  console.log(`   Evidence Grade: ${synthesis.pageRecord.evidenceGrade}`);
  console.log(`   Human RCTs: ${synthesis.pageRecord.humanRctCount}`);
  console.log(`   Animal Studies: ${synthesis.pageRecord.animalCount}`);
  console.log(`   Total Studies: ${synthesis.pageRecord.studies.length}`);
  console.log(`   Sections: ${synthesis.pageRecord.sections.length}`);
  console.log('\n📄 First 500 chars of summary:');
  console.log(synthesis.pageRecord.summaryHtml.substring(0, 500) + '...\n');
}

main().catch(console.error);
