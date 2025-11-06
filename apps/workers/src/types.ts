/**
 * Type definitions for Cloudflare Workers bindings
 */

export interface Bindings {
  // D1 Database
  DB: D1Database

  // R2 Storage
  PDF_BUCKET: R2Bucket

  // KV Namespace for rate limiting
  RATE_LIMIT: KVNamespace

  // Queue for research pipeline
  RESEARCH_QUEUE: Queue

  // Environment variables
  JWT_SECRET: string
  RESEND_API_KEY: string
  STRIPE_API_KEY: string
  STRIPE_WEBHOOK_SECRET: string

  // Research pipeline API keys
  PUBMED_EMAIL: string
  PUBMED_API_KEY: string
  ANTHROPIC_API_KEY: string
  OPENAI_API_KEY: string

  // Cron security
  CRON_SECRET: string

  // Internal API security (for Docker service)
  INTERNAL_API_SECRET: string

  // R2 public URL
  R2_PUBLIC_URL: string

  // Railway service URL for research pipeline
  RAILWAY_SERVICE_URL: string

  // Allow index signature for Hono compatibility
  [key: string]: any
}

export interface PaginationParams {
  limit?: number
  offset?: number
  page?: number
}

export interface SearchParams extends PaginationParams {
  search?: string
  evidenceGrade?: string
  orderBy?: string
}
