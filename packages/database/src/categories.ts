/**
 * Database operations for categories
 */

import type { D1Database } from '@cloudflare/workers-types'

export interface Category {
  id: string
  slug: string
  name: string
  description: string | null
  icon: string | null
  display_order: number
  created_at: string
}

export interface PeptideCategory {
  peptide_id: string
  category_id: string
  confidence: 'high' | 'medium' | 'low'
  created_at: string
}

/**
 * Get all categories
 */
export async function getAllCategories(db: D1Database): Promise<Category[]> {
  const result = await db
    .prepare('SELECT * FROM categories ORDER BY display_order')
    .all<Category>()

  return result.results || []
}

/**
 * Get categories for a specific peptide
 */
export async function getPeptideCategories(
  db: D1Database,
  peptideSlug: string
): Promise<(Category & { confidence: string })[]> {
  const result = await db
    .prepare(
      `SELECT c.*, pc.confidence
       FROM categories c
       JOIN peptide_categories pc ON c.id = pc.category_id
       WHERE pc.peptide_id = ?
       ORDER BY c.display_order`
    )
    .bind(peptideSlug)
    .all<Category & { confidence: string }>()

  return result.results || []
}

/**
 * Get all peptides in a category
 */
export async function getPeptidesByCategory(
  db: D1Database,
  categorySlug: string
): Promise<string[]> {
  const result = await db
    .prepare(
      `SELECT pc.peptide_id
       FROM peptide_categories pc
       JOIN categories c ON pc.category_id = c.id
       WHERE c.slug = ?`
    )
    .bind(categorySlug)
    .all<{ peptide_id: string }>()

  return result.results?.map((r) => r.peptide_id) || []
}

/**
 * Add category to peptide
 */
export async function addPeptideCategory(
  db: D1Database,
  peptideSlug: string,
  categoryId: string,
  confidence: 'high' | 'medium' | 'low' = 'medium'
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO peptide_categories (peptide_id, category_id, confidence)
       VALUES (?, ?, ?)
       ON CONFLICT (peptide_id, category_id) DO UPDATE SET confidence = ?`
    )
    .bind(peptideSlug, categoryId, confidence, confidence)
    .run()
}

/**
 * Remove category from peptide
 */
export async function removePeptideCategory(
  db: D1Database,
  peptideSlug: string,
  categoryId: string
): Promise<void> {
  await db
    .prepare('DELETE FROM peptide_categories WHERE peptide_id = ? AND category_id = ?')
    .bind(peptideSlug, categoryId)
    .run()
}
