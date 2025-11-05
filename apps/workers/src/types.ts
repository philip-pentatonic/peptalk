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

  // Environment variables
  JWT_SECRET: string
  RESEND_API_KEY: string
  STRIPE_API_KEY: string
  STRIPE_WEBHOOK_SECRET: string
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
