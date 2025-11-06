/**
 * Generate real BPC-157 content and update local database
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile } from 'fs/promises';

const execAsync = promisify(exec);

async function main() {
  console.log('🔬 Generating real BPC-157 research content...\n');

  // Step 1: Run the pipeline to generate content
  console.log('Running research pipeline (this will take ~60 seconds)...');

  const env = `export PUBMED_EMAIL=${process.env.PUBMED_EMAIL} && export PUBMED_API_KEY=${process.env.PUBMED_API_KEY} && export ANTHROPIC_API_KEY=${process.env.ANTHROPIC_API_KEY}`;

  const cmd = `${env} && cd packages/research && pnpm cli single bpc-157 "BPC-157" "Body Protection Compound" --skip-compliance 2>&1`;

  try {
    const { stdout, stderr } = await execAsync(cmd, {
      maxBuffer: 10 * 1024 * 1024,
      timeout: 300000 // 5 minutes
    });

    console.log(stdout);

    if (stderr) {
      console.error('Errors:', stderr);
    }

    console.log('\n✅ Pipeline completed successfully!');
    console.log('\nThe real BPC-157 content should now be in your local database.');
    console.log('Visit: http://localhost:3003/peptides/bpc-157');

  } catch (error) {
    console.error('❌ Pipeline failed:', error.message);

    // Check if it's the D1/R2 binding issue
    if (error.message.includes('DB') || error.message.includes('R2') || error.message.includes('publish')) {
      console.log('\n⚠️  The pipeline needs D1 and R2 bindings to publish.');
      console.log('Generating content to JSON file instead...\n');

      // Fallback: run in dry-run mode and save to JSON
      const dryRunCmd = `${env} && cd packages/research && node -e "
        import('./dist/ingest/pubmed/index.js').then(async (pubmed) => {
          import('./dist/ingest/clinicaltrials/index.js').then(async (ct) => {
            import('./dist/ingest/normalizer/index.js').then(async (norm) => {
              import('./dist/rubric/grade-evidence.js').then(async (grade) => {
                import('./dist/synthesis/index.js').then(async (synth) => {
                  const pubmedStudies = await pubmed.ingestPubMed('BPC-157', ['Body Protection Compound'], 'bpc-157', {
                    email: process.env.PUBMED_EMAIL,
                    maxResults: 100
                  });

                  const ctStudies = await ct.ingestClinicalTrials('BPC-157', ['Body Protection Compound'], 'bpc-157', {
                    maxResults: 50
                  });

                  const sourcePack = {
                    peptideId: 'bpc-157',
                    peptideName: 'BPC-157',
                    aliases: ['Body Protection Compound'],
                    studies: [...pubmedStudies, ...ctStudies],
                    metadata: { fetchedAt: new Date().toISOString(), sources: { pubmed: pubmedStudies.length, clinicaltrials: ctStudies.length }}
                  };

                  const normalized = norm.normalize(sourcePack);
                  const evidenceGrade = grade.gradeEvidence(normalized.studies);

                  const result = await synth.synthesizePage({
                    peptideId: 'bpc-157',
                    name: 'BPC-157',
                    aliases: ['Body Protection Compound'],
                    studies: normalized.studies,
                    evidenceGrade
                  }, {
                    apiKey: process.env.ANTHROPIC_API_KEY,
                    model: 'claude-sonnet-4-5-20250929',
                    maxTokens: 8000
                  });

                  console.log(JSON.stringify(result.pageRecord, null, 2));
                });
              });
            });
          });
        });
      "`;

      try {
        const { stdout: jsonOutput } = await execAsync(dryRunCmd, {
          maxBuffer: 50 * 1024 * 1024,
          timeout: 300000
        });

        await writeFile('bpc157-content.json', jsonOutput);
        console.log('✅ Content saved to bpc157-content.json');
        console.log('\nYou can review the generated content in this file.');

      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError.message);
      }
    }

    process.exit(1);
  }
}

main().catch(console.error);
