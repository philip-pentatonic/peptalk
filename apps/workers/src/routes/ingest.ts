/**
 * Ingest API endpoint - Adds research pipeline jobs to queue
 * Called weekly via Cloudflare Cron
 */

import { Hono } from 'hono';
import type { Env } from '../types';

const app = new Hono<{ Bindings: Env }>();

export interface ResearchJob {
  peptideId: string
  name: string
  aliases: string[]
  force?: boolean
}

/**
 * POST /api/ingest/run
 * Adds research pipeline jobs to queue for one or all peptides
 *
 * Body:
 * {
 *   "peptideId": "bpc-157",  // Optional - if omitted, processes all peptides
 *   "force": false           // Optional - skip if data is recent
 * }
 */
app.post('/run', async (c) => {
  try {
    const { peptideId, force } = await c.req.json().catch(() => ({}));

    // Get environment variables
    const env = c.env;

    // Verify cron secret for security
    const cronSecret = c.req.header('X-Cron-Secret');
    if (cronSecret !== env.CRON_SECRET) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // TODO: Get peptide list from database or config
    const peptidesToProcess = peptideId
      ? [{ id: peptideId, name: 'BPC-157', aliases: ['Body Protection Compound'] }]
      : [
          { id: 'bpc-157', name: 'BPC-157', aliases: ['Body Protection Compound'] },
          // Add more peptides here
        ];

    // Send each peptide to the queue for processing
    const queuedJobs: string[] = [];

    for (const peptide of peptidesToProcess) {
      const job: ResearchJob = {
        peptideId: peptide.id,
        name: peptide.name,
        aliases: peptide.aliases,
        force: force || false,
      };

      await env.RESEARCH_QUEUE.send(job);
      queuedJobs.push(peptide.id);
      console.log(`✅ Queued research job for ${peptide.name}`);
    }

    return c.json({
      success: true,
      queued: queuedJobs.length,
      peptides: queuedJobs,
      message: 'Research jobs added to queue for processing',
    });

  } catch (error) {
    console.error('Ingest error:', error);
    return c.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

export default app;
