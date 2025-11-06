// @ts-nocheck
/**
 * Study normalizer and deduplicator.
 * Combines studies from multiple sources and removes duplicates.
 */

import type { Study, SourcePack } from '@peptalk/schemas'
import { withMetadata } from '@peptalk/schemas'

/**
 * Normalize and deduplicate studies in a SourcePack.
 */
export function normalize(sourcePack: SourcePack): SourcePack {
  // Deduplicate by ID
  const uniqueStudies = deduplicateById(sourcePack.studies)

  // Sort by relevance (human studies first, then by year)
  const sortedStudies = sortByRelevance(uniqueStudies)

  // Return normalized SourcePack with metadata
  return withMetadata({
    ...sourcePack,
    studies: sortedStudies,
  })
}

/**
 * Remove duplicate studies by ID.
 */
export function deduplicateById(studies: Study[]): Study[] {
  const seen = new Set<string>()
  const unique: Study[] = []

  for (const study of studies) {
    if (!seen.has(study.id)) {
      seen.add(study.id)
      unique.push(study)
    }
  }

  return unique
}

/**
 * Sort studies by relevance.
 * Priority:
 * 1. Human studies before animal studies
 * 2. RCTs before observational
 * 3. Newer studies first (within same category)
 */
export function sortByRelevance(studies: Study[]): Study[] {
  return [...studies].sort((a, b) => {
    // Get study type priority
    const priorityA = getStudyTypePriority(a.studyType)
    const priorityB = getStudyTypePriority(b.studyType)

    if (priorityA !== priorityB) {
      return priorityA - priorityB // Lower number = higher priority
    }

    // Same study type, sort by year (newer first)
    const yearA = getYear(a)
    const yearB = getYear(b)

    return yearB - yearA
  })
}

/**
 * Get priority score for study type (lower = higher priority).
 */
function getStudyTypePriority(studyType: Study['studyType']): number {
  const priorities: Record<Study['studyType'], number> = {
    human_rct: 1,
    human_observational: 2,
    human_case_report: 3,
    animal_invivo: 4,
    animal_invitro: 5,
  }

  return priorities[studyType]
}

/**
 * Get year from study (handles different study types).
 */
function getYear(study: Study): number {
  if (study.type === 'pubmed') {
    return study.year
  }

  // ClinicalTrials: try to parse year from startDate
  if (study.type === 'clinicaltrials' && study.startDate) {
    const yearMatch = study.startDate.match(/(\d{4})/)
    if (yearMatch) {
      return parseInt(yearMatch[1], 10)
    }
  }

  // Default to current year if unknown
  return new Date().getFullYear()
}

/**
 * Filter studies by minimum quality threshold.
 * Removes studies with insufficient data for synthesis.
 */
export function filterByQuality(studies: Study[]): Study[] {
  return studies.filter((study) => {
    // PubMed: must have abstract
    if (study.type === 'pubmed') {
      return study.abstract && study.abstract.length >= 100
    }

    // ClinicalTrials: must have conditions and interventions
    if (study.type === 'clinicaltrials') {
      return (
        study.conditions.length > 0 &&
        study.interventions.length > 0
      )
    }

    return true
  })
}

/**
 * Limit number of studies per category to prevent overwhelming synthesis.
 */
export function limitByCategory(studies: Study[], limits: {
  humanRct?: number
  humanObservational?: number
  humanCaseReport?: number
  animalInvivo?: number
  animalInvitro?: number
}): Study[] {
  const categorized: Record<Study['studyType'], Study[]> = {
    human_rct: [],
    human_observational: [],
    human_case_report: [],
    animal_invivo: [],
    animal_invitro: [],
  }

  // Group by study type
  for (const study of studies) {
    categorized[study.studyType].push(study)
  }

  // Apply limits
  const limited: Study[] = []

  if (limits.humanRct) {
    limited.push(...categorized.human_rct.slice(0, limits.humanRct))
  } else {
    limited.push(...categorized.human_rct)
  }

  if (limits.humanObservational) {
    limited.push(...categorized.human_observational.slice(0, limits.humanObservational))
  } else {
    limited.push(...categorized.human_observational)
  }

  if (limits.humanCaseReport) {
    limited.push(...categorized.human_case_report.slice(0, limits.humanCaseReport))
  } else {
    limited.push(...categorized.human_case_report)
  }

  if (limits.animalInvivo) {
    limited.push(...categorized.animal_invivo.slice(0, limits.animalInvivo))
  } else {
    limited.push(...categorized.animal_invivo)
  }

  if (limits.animalInvitro) {
    limited.push(...categorized.animal_invitro.slice(0, limits.animalInvitro))
  } else {
    limited.push(...categorized.animal_invitro)
  }

  return limited
}
