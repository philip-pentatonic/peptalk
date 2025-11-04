/**
 * Database types for Cloudflare D1.
 */

import type { EvidenceGrade, StudyType } from '@peptalk/schemas'

// ============================================================================
// Core Types
// ============================================================================

export interface Peptide {
  id: string
  slug: string
  name: string
  aliases: string[] // JSON array
  evidence_grade: EvidenceGrade
  human_rct_count: number
  animal_count: number
  summary_html: string
  last_updated: string
  version: number
  created_at: string
}

export interface Study {
  id: string
  peptide_id: string
  type: 'pubmed' | 'clinicaltrials'
  title: string
  study_type: StudyType

  // PubMed fields
  pmid?: string
  abstract?: string
  authors?: string[] // JSON array
  journal?: string
  year?: number
  doi?: string

  // ClinicalTrials fields
  nct_id?: string
  status?: string
  phase?: string
  conditions?: string[] // JSON array
  interventions?: string[] // JSON array
  enrollment?: number
  start_date?: string
  completion_date?: string

  url?: string
  created_at: string
}

export interface LegalNote {
  id: number
  peptide_id: string
  note_text: string
  note_order: number
  created_at: string
}

export interface PageSection {
  id: number
  peptide_id: string
  title: string
  content_html: string
  section_order: number
  created_at: string
}

export interface PageVersion {
  id: number
  peptide_id: string
  version: number
  content_snapshot: Record<string, unknown> // JSON object
  created_at: string
}

// ============================================================================
// User & Auth Types
// ============================================================================

export interface User {
  id: string
  email: string
  email_verified: boolean
  created_at: string
  updated_at: string
}

export interface Session {
  id: string
  user_id: string
  expires_at: number
  created_at: string
}

export interface Subscription {
  id: number
  user_id: string
  stripe_subscription_id: string
  stripe_customer_id: string
  status: string
  current_period_end: string
  cancel_at_period_end: boolean
  created_at: string
  updated_at: string
}

// ============================================================================
// Audit Types
// ============================================================================

export interface ChangelogEntry {
  id: number
  entity_type: string
  entity_id: string
  action: string
  changes?: Record<string, unknown> // JSON object
  created_at: string
}

// ============================================================================
// Query Options
// ============================================================================

export interface ListOptions {
  limit?: number
  offset?: number
  search?: string
  evidenceGrade?: EvidenceGrade
  orderBy?: string
}

export interface SearchOptions {
  query: string
  limit?: number
  peptideId?: string
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pages: number
}
