/**
 * Evidence grading rubric for peptide research quality.
 *
 * Grades evidence quality based on study types and counts.
 * Higher quality evidence = more human studies, especially RCTs.
 */

import type { Study } from '@peptalk/schemas'
import { EvidenceGrade } from '@peptalk/schemas'

/**
 * Grade evidence quality based on study composition.
 *
 * Grading criteria:
 * - HIGH: 3+ human RCTs
 * - MODERATE: 1-2 human RCTs OR 3+ human observational studies
 * - LOW: Only animal studies (5+ animal studies)
 * - VERY_LOW: Minimal evidence (<5 animal studies, no human data)
 *
 * @param studies Array of studies to grade
 * @returns Evidence quality grade
 */
export function gradeEvidence(studies: Study[]): EvidenceGrade {
  if (studies.length === 0) {
    return 'very_low'
  }

  const counts = categorizeStudies(studies)

  // HIGH: 3+ human RCTs
  if (counts.humanRct >= 3) {
    return 'high'
  }

  // MODERATE: 1-2 human RCTs OR 3+ human observational
  if (counts.humanRct >= 1 || counts.humanObservational >= 3) {
    return 'moderate'
  }

  // LOW: 5+ animal studies
  if (counts.animalTotal >= 5) {
    return 'low'
  }

  // VERY_LOW: Everything else
  return 'very_low'
}

/**
 * Categorize studies by type for grading.
 */
export function categorizeStudies(studies: Study[]) {
  let humanRct = 0
  let humanObservational = 0
  let humanCaseReport = 0
  let animalInvivo = 0
  let animalInvitro = 0

  for (const study of studies) {
    switch (study.studyType) {
      case 'human_rct':
        humanRct++
        break
      case 'human_observational':
        humanObservational++
        break
      case 'human_case_report':
        humanCaseReport++
        break
      case 'animal_invivo':
        animalInvivo++
        break
      case 'animal_invitro':
        animalInvitro++
        break
    }
  }

  return {
    humanRct,
    humanObservational,
    humanCaseReport,
    humanTotal: humanRct + humanObservational + humanCaseReport,
    animalInvivo,
    animalInvitro,
    animalTotal: animalInvivo + animalInvitro,
    total: studies.length,
  }
}

/**
 * Get detailed grading explanation.
 */
export function explainGrade(studies: Study[]): string {
  const grade = gradeEvidence(studies)
  const counts = categorizeStudies(studies)

  if (grade === 'high') {
    return `HIGH quality: ${counts.humanRct} human RCT(s) provide strong evidence.`
  }

  if (grade === 'moderate') {
    if (counts.humanRct > 0) {
      return `MODERATE quality: ${counts.humanRct} human RCT(s) plus ${counts.humanTotal - counts.humanRct} other human study(ies).`
    }
    return `MODERATE quality: ${counts.humanObservational} human observational study(ies).`
  }

  if (grade === 'low') {
    return `LOW quality: Only ${counts.animalTotal} animal study(ies), no human research.`
  }

  if (counts.animalTotal > 0) {
    return `VERY LOW quality: Only ${counts.animalTotal} animal study(ies), limited evidence.`
  }

  return 'VERY LOW quality: Minimal evidence available.'
}

/**
 * Check if evidence meets minimum quality threshold.
 */
export function meetsMinimumQuality(studies: Study[]): boolean {
  const grade = gradeEvidence(studies)
  return grade === 'moderate' || grade === 'high'
}

/**
 * Get missing study types for grade improvement.
 */
export function getMissingForUpgrade(studies: Study[]): string[] {
  const counts = categorizeStudies(studies)
  const grade = gradeEvidence(studies)
  const suggestions: string[] = []

  if (grade === 'very_low') {
    if (counts.animalTotal < 5) {
      suggestions.push(`${5 - counts.animalTotal} more animal studies to reach LOW quality`)
    }
    if (counts.humanTotal === 0) {
      suggestions.push('1 human study to reach MODERATE quality')
    }
  }

  if (grade === 'low') {
    suggestions.push('1 human RCT or 3 human observational studies to reach MODERATE quality')
  }

  if (grade === 'moderate') {
    const needed = 3 - counts.humanRct
    if (needed > 0) {
      suggestions.push(`${needed} more human RCT(s) to reach HIGH quality`)
    }
  }

  return suggestions
}
