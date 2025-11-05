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
import { rateLimit } from './middleware/rate-limit'
import type { Bindings } from './types'

const app = new Hono<{ Bindings: Bindings }>()

// Middleware
app.use('*', logger())
app.use('*', cors({
  origin: ['https://peptalk.com', 'http://localhost:3000'],
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
app.route('/api/pdf', pdf)
app.route('/api/auth', auth)

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

export default app
