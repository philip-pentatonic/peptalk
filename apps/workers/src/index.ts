/**
 * PepTalk API - Cloudflare Workers with Hono
 * Main entry point for API routes
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { peptides } from './routes/peptides'
import { pdf } from './routes/pdf'
import { auth } from './routes/auth'
import { stripe } from './routes/stripe-routes'
import ingest from './routes/ingest'
import internal from './routes/internal'
import categoriesRoute from './routes/categories'
import { rateLimit } from './middleware/rate-limit'
import type { Bindings } from './types'

const app = new Hono<{ Bindings: Bindings }>()

// Middleware
app.use('*', logger())
app.use('*', cors({
  origin: (origin) => {
    // Allow production domain, Cloudflare Pages, and any localhost port
    if (
      origin === 'https://peptalk.com' ||
      origin?.endsWith('.peptalk.pages.dev') ||
      origin === 'https://peptalk.pages.dev' ||
      origin?.startsWith('http://localhost:')
    ) {
      return origin
    }
    return 'https://peptalk.com' // default fallback
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}))
app.use('/api/*', rateLimit({ limit: 100, window: 60 }))

// Health check
app.get('/', (c) => {
  return c.json({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  })
})

// API Routes
app.route('/api/peptides', peptides)
app.route('/api/categories', categoriesRoute)
app.route('/api/pdf', pdf)
app.route('/api/auth', auth)
app.route('/api/stripe', stripe)
app.route('/api/ingest', ingest)
app.route('/api/internal', internal)

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404)
})

// Error handler
app.onError((err, c) => {
  console.error('API Error:', err)
  return c.json({
    error: 'Internal server error',
    message: err.message,
  }, 500)
})

// Export for regular requests
export default {
  fetch: app.fetch,

  // Cron trigger for weekly research updates
  async scheduled(_event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
    console.log('Cron triggered - running weekly research update')

    try {
      // Create a request to trigger the ingest endpoint
      const request = new Request('http://internal/api/ingest/run', {
        method: 'POST',
        headers: {
          'X-Cron-Secret': env.CRON_SECRET,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Process all peptides (no peptideId specified)
          force: false,
        }),
      })

      // Process the request through the app
      const response = await app.fetch(request, env, ctx)
      const result = await response.json()

      console.log('Cron completed:', result)
    } catch (error) {
      console.error('Cron error:', error)
    }
  },

  // Queue consumer for research pipeline
  async queue(batch: MessageBatch, env: Bindings, ctx: ExecutionContext) {
    console.log(`Processing ${batch.messages.length} research jobs from queue`)

    for (const message of batch.messages) {
      try {
        const job = message.body as any
        console.log(`Processing research job for peptide: ${job.peptideId}`)

        // Call Railway service to run research pipeline
        const railwayUrl = env.RAILWAY_SERVICE_URL || 'http://localhost:3000'
        const response = await fetch(`${railwayUrl}/process`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            peptideId: job.peptideId,
            name: job.name,
            aliases: job.aliases,
            force: job.force || false,
          }),
        })

        if (!response.ok) {
          throw new Error(`Railway service returned ${response.status}: ${await response.text()}`)
        }

        const result = await response.json()
        console.log(`✅ Research job completed for ${job.name}:`, result)

        // Acknowledge the message
        message.ack()
      } catch (error) {
        console.error('Queue processing error:', error)
        // Retry the message
        message.retry()
      }
    }
  },
}
