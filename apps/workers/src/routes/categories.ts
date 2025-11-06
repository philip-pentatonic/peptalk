/**
 * Category routes
 */

import { Hono } from 'hono'
import type { HonoEnv } from '../types'
import { categories, peptides } from '@peptalk/database'

const app = new Hono<HonoEnv>()

/**
 * GET /api/categories
 * Get all categories
 */
app.get('/', async (c) => {
  try {
    const allCategories = await categories.getAllCategories(c.env.DB)

    return c.json({ categories: allCategories })
  } catch (error) {
    console.error('Failed to fetch categories:', error)
    return c.json({ error: 'Failed to fetch categories' }, 500)
  }
})

/**
 * GET /api/categories/:slug
 * Get category details and peptides in this category
 */
app.get('/:slug', async (c) => {
  try {
    const slug = c.req.param('slug')

    // Get all categories to find this one
    const allCategories = await categories.getAllCategories(c.env.DB)
    const category = allCategories.find((cat) => cat.slug === slug)

    if (!category) {
      return c.json({ error: 'Category not found' }, 404)
    }

    // Get peptides in this category
    const peptideSlugs = await categories.getPeptidesByCategory(c.env.DB, slug)

    // Get full peptide details for each
    const peptideDetails = await Promise.all(
      peptideSlugs.map((peptideSlug) => peptides.getBySlug(c.env.DB, peptideSlug))
    )

    const validPeptides = peptideDetails.filter((p) => p !== null)

    return c.json({
      category,
      peptides: validPeptides,
      count: validPeptides.length,
    })
  } catch (error) {
    console.error('Failed to fetch category:', error)
    return c.json({ error: 'Failed to fetch category' }, 500)
  }
})

export default app
