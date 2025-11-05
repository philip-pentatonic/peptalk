/**
 * Rate limiting middleware using Cloudflare KV
 */

import type { Context, Next } from 'hono'
import type { Bindings } from '../types'

interface RateLimitConfig {
  limit: number // Max requests
  window: number // Time window in seconds
}

/**
 * Rate limit middleware
 * Uses Cloudflare KV to track request counts per IP
 */
export function rateLimit(config: RateLimitConfig) {
  return async (c: Context<{ Bindings: Bindings }>, next: Next) => {
    const { limit, window } = config

    // Get client IP
    const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown'

    // Skip rate limiting for unknown IPs (development)
    if (ip === 'unknown') {
      return next()
    }

    try {
      const kv = c.env.RATE_LIMIT
      const key = `rate-limit:${ip}`

      // Get current count
      const current = await kv.get(key)
      const count = current ? parseInt(current) : 0

      // Check if limit exceeded
      if (count >= limit) {
        return c.json(
          {
            error: 'Rate limit exceeded',
            limit,
            window,
            retryAfter: window,
          },
          429
        )
      }

      // Increment counter
      const newCount = count + 1
      await kv.put(key, newCount.toString(), {
        expirationTtl: window,
      })

      // Add rate limit headers
      c.header('X-RateLimit-Limit', limit.toString())
      c.header('X-RateLimit-Remaining', (limit - newCount).toString())
      c.header('X-RateLimit-Reset', (Date.now() + window * 1000).toString())

      return next()
    } catch (error) {
      console.error('Rate limiting error:', error)
      // On error, allow request through
      return next()
    }
  }
}
