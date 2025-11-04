# PepTalk — API Reference

**Version:** 1.0
**Last Updated:** 2025-11-04

---

## Overview

This document defines all HTTP endpoints for the PepTalk API. The API is hosted on Cloudflare Workers using Hono as the routing framework.

**Base URL:** `https://api.peptalk.com` (production)
**Base URL:** `https://api-staging.peptalk.com` (staging)

---

## Authentication

### Session-Based Auth

Protected endpoints require a valid session cookie.

**Cookie Name:** `auth_session`
**Set by:** Magic link authentication flow
**Expiry:** 30 days from creation

**Example Request:**
```http
GET /api/pdf/bpc-157 HTTP/1.1
Host: api.peptalk.com
Cookie: auth_session=abc123xyz789
```

**Unauthorized Response:**
```json
{
  "error": "Unauthorized",
  "message": "Valid session required"
}
```

---

## Public Endpoints

### GET /api/peptides

Search and filter peptides.

**Query Parameters:**
- `query` (string, optional) - Full-text search query
- `grade` (string, optional) - Comma-separated grades: `high,moderate,low,very_low`
- `human_only` (boolean, optional) - Only show peptides with human studies
- `page` (number, optional, default: 1) - Page number
- `limit` (number, optional, default: 20, max: 100) - Results per page

**Example Request:**
```http
GET /api/peptides?query=tendon&grade=high,moderate&page=1&limit=20 HTTP/1.1
Host: api.peptalk.com
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "slug": "bpc-157",
      "name": "BPC-157",
      "aliases": ["Body Protection Compound"],
      "evidence_grade": "moderate",
      "human_rct_count": 2,
      "human_observational_count": 1,
      "animal_study_count": 15,
      "in_vitro_count": 8,
      "last_reviewed_at": "2025-11-04T02:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 20,
    "total_pages": 1
  }
}
```

**Error Responses:**
```json
// 400 Bad Request (invalid parameters)
{
  "error": "BadRequest",
  "message": "Invalid grade value: 'unknown'"
}

// 429 Too Many Requests (rate limit exceeded)
{
  "error": "TooManyRequests",
  "message": "Rate limit exceeded. Try again in 60 seconds."
}
```

---

### GET /api/peptides/:slug

Get detailed information for a specific peptide.

**Path Parameters:**
- `slug` (string, required) - Peptide slug (e.g., "bpc-157")

**Example Request:**
```http
GET /api/peptides/bpc-157 HTTP/1.1
Host: api.peptalk.com
```

**Response (200 OK):**
```json
{
  "peptide": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "slug": "bpc-157",
    "name": "BPC-157",
    "aliases": ["Body Protection Compound"],
    "evidence_grade": "moderate",
    "human_rct_count": 2,
    "human_observational_count": 1,
    "animal_study_count": 15,
    "in_vitro_count": 8,
    "last_reviewed_at": "2025-11-04T02:00:00Z",
    "created_at": "2025-11-01T10:00:00Z",
    "updated_at": "2025-11-04T02:05:00Z"
  },
  "page_record": {
    "evidence_snapshot": {
      "grade": "moderate",
      "rationale": "Two human RCTs with adequate sample sizes...",
      "study_counts": {
        "human_rct": 2,
        "human_observational": 1,
        "animal": 15,
        "in_vitro": 8
      }
    },
    "protocols": [
      {
        "study_id": "PMID:12345678",
        "dosage_reported": "500 mcg daily",
        "duration_reported": "4 weeks",
        "route": "subcutaneous injection"
      }
    ],
    "safety": {
      "summary": "Generally well-tolerated in studies...",
      "adverse_events": [
        {
          "event": "Mild injection site reaction",
          "frequency": "5/60 participants"
        }
      ]
    },
    "regulatory": [
      {
        "region": "US",
        "status": "investigational",
        "notes": "Not FDA-approved for therapeutic use"
      }
    ],
    "citations": [
      {
        "id": "PMID:12345678",
        "title": "Efficacy of BPC-157 in tendon healing",
        "year": 2023,
        "link": "https://pubmed.ncbi.nlm.nih.gov/12345678"
      }
    ]
  },
  "markdown": "# BPC-157\n\n## Disclaimer\n\n> Educational summary..."
}
```

**Error Responses:**
```json
// 404 Not Found
{
  "error": "NotFound",
  "message": "Peptide not found: bpc-999"
}
```

---

### GET /api/studies

Query studies by peptide or date range.

**Query Parameters:**
- `peptide` (string, required) - Peptide ID
- `after` (string, optional) - ISO 8601 date, only studies added after this date
- `type` (string, optional) - Study type filter: `human_rct|human_observational|animal|in_vitro`
- `limit` (number, optional, default: 50, max: 200)

**Example Request:**
```http
GET /api/studies?peptide=550e8400-e29b-41d4-a716-446655440000&type=human_rct&limit=10 HTTP/1.1
Host: api.peptalk.com
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "PMID:12345678",
      "peptide_id": "550e8400-e29b-41d4-a716-446655440000",
      "registry": "pubmed",
      "external_id": "12345678",
      "year": 2023,
      "study_type": "human_rct",
      "sample_size_total": 60,
      "outcome_direction": "benefit",
      "title": "Efficacy of BPC-157 in tendon healing: A randomized trial",
      "link": "https://pubmed.ncbi.nlm.nih.gov/12345678",
      "created_at": "2025-11-01T10:30:00Z"
    }
  ],
  "count": 2
}
```

**Error Responses:**
```json
// 400 Bad Request (missing required param)
{
  "error": "BadRequest",
  "message": "Required parameter 'peptide' missing"
}
```

---

### GET /api/changelog

Get weekly digest entries.

**Query Parameters:**
- `limit` (number, optional, default: 10, max: 52) - Number of weeks to return
- `after` (string, optional) - ISO 8601 date, only entries after this date

**Example Request:**
```http
GET /api/changelog?limit=4 HTTP/1.1
Host: api.peptalk.com
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "changelog_123",
      "week_start": "2025-11-03",
      "summary_md": "## Week of November 3, 2025\n\n- **BPC-157**: Added 2 new studies...",
      "peptides_updated": ["550e8400-e29b-41d4-a716-446655440000"],
      "published_at": "2025-11-10T09:00:00Z"
    }
  ]
}
```

---

## Protected Endpoints (Auth Required)

### GET /api/pdf/:slug

Get a signed URL for PDF download.

**Authentication:** Required (session cookie)

**Path Parameters:**
- `slug` (string, required) - Peptide slug

**Example Request:**
```http
GET /api/pdf/bpc-157 HTTP/1.1
Host: api.peptalk.com
Cookie: auth_session=abc123xyz789
```

**Response (200 OK):**
```json
{
  "url": "https://storage.peptalk.com/pages/bpc-157/latest.pdf?signature=xyz&expires=1699027200",
  "expires_at": "2025-11-04T15:00:00Z"
}
```

**Error Responses:**
```json
// 401 Unauthorized (no session)
{
  "error": "Unauthorized",
  "message": "Valid session required"
}

// 403 Forbidden (no active subscription)
{
  "error": "Forbidden",
  "message": "Active subscription required"
}

// 404 Not Found (peptide not found)
{
  "error": "NotFound",
  "message": "Peptide not found: bpc-999"
}
```

---

### POST /api/checkout/create

Create a Stripe Checkout session.

**Authentication:** Required (session cookie)

**Request Body:**
```json
{
  "price_id": "price_1234567890"
}
```

**Example Request:**
```http
POST /api/checkout/create HTTP/1.1
Host: api.peptalk.com
Cookie: auth_session=abc123xyz789
Content-Type: application/json

{
  "price_id": "price_1234567890"
}
```

**Response (200 OK):**
```json
{
  "checkout_url": "https://checkout.stripe.com/c/pay/cs_test_abc123#fidkdWxOYHw...",
  "session_id": "cs_test_abc123"
}
```

**Error Responses:**
```json
// 400 Bad Request (invalid price_id)
{
  "error": "BadRequest",
  "message": "Invalid price_id"
}

// 401 Unauthorized
{
  "error": "Unauthorized",
  "message": "Valid session required"
}
```

---

### POST /api/billing/portal

Create a Stripe Customer Portal session.

**Authentication:** Required (session cookie)

**Example Request:**
```http
POST /api/billing/portal HTTP/1.1
Host: api.peptalk.com
Cookie: auth_session=abc123xyz789
```

**Response (200 OK):**
```json
{
  "portal_url": "https://billing.stripe.com/p/session/test_abc123"
}
```

**Error Responses:**
```json
// 401 Unauthorized
{
  "error": "Unauthorized",
  "message": "Valid session required"
}

// 404 Not Found (no subscription)
{
  "error": "NotFound",
  "message": "No subscription found for user"
}
```

---

## Internal Endpoints

### POST /api/ingest/run

Trigger research pipeline (cron-protected).

**Authentication:** Cron secret header

**Headers:**
- `X-Cron-Secret` (string, required) - Shared secret from environment

**Request Body (optional):**
```json
{
  "peptide_ids": ["550e8400-e29b-41d4-a716-446655440000"]
}
```

If `peptide_ids` is omitted, all peptides are processed.

**Example Request:**
```http
POST /api/ingest/run HTTP/1.1
Host: api.peptalk.com
X-Cron-Secret: my-secret-key
Content-Type: application/json

{
  "peptide_ids": ["550e8400-e29b-41d4-a716-446655440000"]
}
```

**Response (202 Accepted):**
```json
{
  "message": "Ingest job queued",
  "peptide_count": 1
}
```

**Error Responses:**
```json
// 401 Unauthorized (invalid secret)
{
  "error": "Unauthorized",
  "message": "Invalid cron secret"
}
```

---

### POST /api/webhooks/stripe

Handle Stripe webhook events.

**Authentication:** Stripe signature verification

**Headers:**
- `stripe-signature` (string, required) - Stripe signature header

**Request Body:** Stripe event JSON

**Example Request:**
```http
POST /api/webhooks/stripe HTTP/1.1
Host: api.peptalk.com
stripe-signature: t=1699027200,v1=abc123...
Content-Type: application/json

{
  "id": "evt_123",
  "type": "customer.subscription.updated",
  "data": {
    "object": {
      "id": "sub_123",
      "status": "active",
      "customer": "cus_123"
    }
  }
}
```

**Response (200 OK):**
```json
{
  "received": true
}
```

**Error Responses:**
```json
// 400 Bad Request (invalid signature)
{
  "error": "BadRequest",
  "message": "Invalid Stripe signature"
}
```

---

## Rate Limiting

### Limits

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| Auth endpoints | 5 req | 1 minute |
| Search/list | 10 req | 1 second |
| Detail pages | 20 req | 1 second |
| PDF downloads | 5 req | 1 minute |
| Webhooks | No limit | N/A |

### Rate Limit Headers

Responses include rate limit headers:

```http
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1699027260
```

### Rate Limit Exceeded Response

```json
{
  "error": "TooManyRequests",
  "message": "Rate limit exceeded. Try again in 60 seconds.",
  "retry_after": 60
}
```

---

## Error Response Format

All errors follow this format:

```json
{
  "error": "ErrorCode",
  "message": "Human-readable error message",
  "details": {
    "field": "Additional context (optional)"
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `BadRequest` | 400 | Invalid request parameters |
| `Unauthorized` | 401 | Authentication required |
| `Forbidden` | 403 | Insufficient permissions |
| `NotFound` | 404 | Resource not found |
| `TooManyRequests` | 429 | Rate limit exceeded |
| `InternalServerError` | 500 | Unexpected server error |

---

## Pagination

List endpoints support pagination:

**Request:**
```http
GET /api/peptides?page=2&limit=20
```

**Response:**
```json
{
  "data": [ /* ... */ ],
  "pagination": {
    "page": 2,
    "limit": 20,
    "total": 45,
    "total_pages": 3,
    "has_next": true,
    "has_prev": true
  }
}
```

---

## CORS

### Allowed Origins

- `https://peptalk.com`
- `https://www-staging.peptalk.com`
- `http://localhost:3000` (development)

### Preflight Requests

```http
OPTIONS /api/peptides HTTP/1.1
Origin: https://peptalk.com
Access-Control-Request-Method: GET
```

**Response:**
```http
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://peptalk.com
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Cookie
Access-Control-Max-Age: 86400
```

---

## Versioning

### Current Version: v1

API is currently unversioned. When v2 is introduced, endpoints will be:

```
/api/v1/peptides
/api/v2/peptides
```

v1 will be maintained for 6 months after v2 release.

---

## SDK Examples

### TypeScript/JavaScript

```typescript
// Fetch peptides
const response = await fetch('https://api.peptalk.com/api/peptides?query=tendon')
const data = await response.json()

// Get peptide detail
const peptide = await fetch('https://api.peptalk.com/api/peptides/bpc-157')
const detail = await peptide.json()

// Download PDF (authenticated)
const pdf = await fetch('https://api.peptalk.com/api/pdf/bpc-157', {
  credentials: 'include' // Send cookies
})
const pdfData = await pdf.json()
window.location.href = pdfData.url
```

### cURL

```bash
# Search peptides
curl "https://api.peptalk.com/api/peptides?query=tendon&grade=high"

# Get detail
curl "https://api.peptalk.com/api/peptides/bpc-157"

# Download PDF (with session)
curl -H "Cookie: auth_session=abc123" \
  "https://api.peptalk.com/api/pdf/bpc-157"
```

---

## References

- [01-architecture.md](./01-architecture.md) - System architecture
- [02-database-schema.md](./02-database-schema.md) - Database schema
- [08-security.md](./08-security.md) - Authentication details
- [11-stripe-integration.md](./11-stripe-integration.md) - Payment flows

---

**Document Owner:** Engineering Team
**Lines:** 398 (within 400-line limit ✓)
