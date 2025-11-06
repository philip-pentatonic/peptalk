/**
 * HTTP Server wrapper for research CLI
 * Exposes the research pipeline as an HTTP API for Railway deployment
 */

import express from 'express';
import { processPeptide } from './cli/process-peptide';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'research-pipeline' });
});

// Process research job
app.post('/process', async (req, res) => {
  try {
    const { peptideId, name, aliases, force } = req.body;

    if (!peptideId || !name || !aliases) {
      return res.status(400).json({
        error: 'Missing required fields: peptideId, name, aliases',
      });
    }

    console.log(`Processing research job for ${name} (${peptideId})`);

    const result = await processPeptide(
      { id: peptideId, name, aliases },
      {
        pubmed: {
          email: process.env.PUBMED_EMAIL || 'support@machinegenie.ai',
          apiKey: process.env.PUBMED_API_KEY!,
          maxResults: 100,
        },
        clinicaltrials: {
          maxResults: 50,
        },
        claude: {
          apiKey: process.env.ANTHROPIC_API_KEY!,
          model: 'claude-sonnet-4-5-20250929',
          maxTokens: 8000,
        },
        compliance: {
          apiKey: process.env.OPENAI_API_KEY!,
          model: 'gpt-4o',
        },
        publish: {
          // Database via HTTP API
          database: {
            apiUrl: process.env.CLOUDFLARE_API_URL || 'https://peptalk-api.polished-glitter-23bb.workers.dev',
            apiSecret: process.env.INTERNAL_API_SECRET!,
          },
          // R2 not available yet (will use HTTP API later)
          r2Bucket: null,
          r2PublicUrl: process.env.R2_PUBLIC_URL,
        },
        skipCompliance: true, // Skip for testing end-to-end
        dryRun: false, // Real run now that we have HTTP API
      }
    );

    return res.json({
      success: result.success,
      peptideId,
      steps: result.steps,
      duration: result.duration,
    });
  } catch (error) {
    console.error('Processing error:', error);
    return res.status(500).json({
      error: 'Processing failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.listen(PORT, () => {
  console.log(`Research pipeline server running on port ${PORT}`);
});
