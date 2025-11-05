/**
 * Maps PubMed articles to Study schema.
 */

import type { PubMedStudy, StudyType } from '@peptalk/schemas'
import { PubMedStudySchema } from '@peptalk/schemas'
import type { PubMedArticle } from './client'

/**
 * Convert PubMed article to Study schema.
 */
export function mapToStudy(
  article: PubMedArticle,
  peptideId: string
): PubMedStudy {
  const studyType = inferStudyType(article)

  const study: PubMedStudy = {
    id: `PMID:${article.pmid}`,
    type: 'pubmed',
    pmid: article.pmid,
    title: article.title,
    studyType,
    abstract: article.abstract,
    authors: article.authors,
    journal: article.journal,
    year: article.year,
    doi: article.doi,
    url: `https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`,
  }

  // Validate with Zod schema
  return PubMedStudySchema.parse(study)
}

/**
 * Infer study type from article metadata.
 * Uses title and abstract text to classify study design.
 *
 * Classification priority:
 * 1. Check for RCT keywords → human_rct
 * 2. Check for human study keywords → human_observational or human_case_report
 * 3. Check for animal keywords → animal_invivo
 * 4. Check for in vitro keywords → animal_invitro
 * 5. Default → animal_invivo (conservative)
 */
export function inferStudyType(article: PubMedArticle): StudyType {
  const text = `${article.title} ${article.abstract}`.toLowerCase()

  // Human RCT indicators
  const rctKeywords = [
    'randomized controlled trial',
    'randomised controlled trial',
    'rct',
    'double-blind',
    'double blind',
    'placebo-controlled',
    'clinical trial',
  ]

  if (rctKeywords.some((kw) => text.includes(kw))) {
    return 'human_rct'
  }

  // Human study indicators
  const humanKeywords = [
    'human',
    'patient',
    'clinical',
    'cohort',
    'case-control',
    'cross-sectional',
    'retrospective',
    'prospective',
    'volunteer',
    'participant',
  ]

  const hasHuman = humanKeywords.some((kw) => text.includes(kw))

  if (hasHuman) {
    // Check if it's a case report
    const caseReportKeywords = ['case report', 'case series', 'case study']
    if (caseReportKeywords.some((kw) => text.includes(kw))) {
      return 'human_case_report'
    }

    return 'human_observational'
  }

  // In vitro indicators
  const invitroKeywords = [
    'in vitro',
    'cell culture',
    'cultured cells',
    'cell line',
    'petri dish',
  ]

  if (invitroKeywords.some((kw) => text.includes(kw))) {
    return 'animal_invitro'
  }

  // Animal study indicators (or default)
  const animalKeywords = [
    'rat',
    'mouse',
    'mice',
    'animal',
    'rodent',
    'rabbit',
    'guinea pig',
    'in vivo',
  ]

  if (animalKeywords.some((kw) => text.includes(kw))) {
    return 'animal_invivo'
  }

  // Conservative default: assume animal study
  return 'animal_invivo'
}

/**
 * Map multiple articles to studies.
 */
export function mapArticlesToStudies(
  articles: PubMedArticle[],
  peptideId: string
): PubMedStudy[] {
  return articles.map((article) => mapToStudy(article, peptideId))
}

/**
 * Filter out articles with insufficient data.
 */
export function filterValidArticles(articles: PubMedArticle[]): PubMedArticle[] {
  return articles.filter((article) => {
    // Must have title and PMID
    if (!article.title || !article.pmid) return false

    // Must have abstract (critical for synthesis)
    if (!article.abstract || article.abstract.length < 50) return false

    return true
  })
}
