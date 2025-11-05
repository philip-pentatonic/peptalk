import { describe, it, expect } from 'vitest'
import {
  gradeEvidence,
  categorizeStudies,
  explainGrade,
  meetsMinimumQuality,
  getMissingForUpgrade,
} from './grade-evidence'
import type { Study } from '@peptalk/schemas'

const createStudy = (studyType: Study['studyType'], id: string): Study => ({
  id: `PMID:${id}`,
  type: 'pubmed',
  title: 'Test Study',
  studyType,
  pmid: id,
  abstract: 'Test abstract',
  authors: ['Test Author'],
  journal: 'Test Journal',
  year: 2023,
})

describe('gradeEvidence', () => {
  it('should return very_low for no studies', () => {
    expect(gradeEvidence([])).toBe('very_low')
  })

  it('should return high for 3+ human RCTs', () => {
    const studies = [
      createStudy('human_rct', '1'),
      createStudy('human_rct', '2'),
      createStudy('human_rct', '3'),
    ]
    expect(gradeEvidence(studies)).toBe('high')
  })

  it('should return moderate for 1-2 human RCTs', () => {
    const studies = [createStudy('human_rct', '1')]
    expect(gradeEvidence(studies)).toBe('moderate')
  })

  it('should return moderate for 3+ observational studies', () => {
    const studies = [
      createStudy('human_observational', '1'),
      createStudy('human_observational', '2'),
      createStudy('human_observational', '3'),
    ]
    expect(gradeEvidence(studies)).toBe('moderate')
  })

  it('should return low for 5+ animal studies', () => {
    const studies = [
      createStudy('animal_invivo', '1'),
      createStudy('animal_invivo', '2'),
      createStudy('animal_invivo', '3'),
      createStudy('animal_invivo', '4'),
      createStudy('animal_invivo', '5'),
    ]
    expect(gradeEvidence(studies)).toBe('low')
  })

  it('should return very_low for few animal studies', () => {
    const studies = [createStudy('animal_invivo', '1'), createStudy('animal_invivo', '2')]
    expect(gradeEvidence(studies)).toBe('very_low')
  })
})

describe('categorizeStudies', () => {
  it('should correctly count study types', () => {
    const studies = [
      createStudy('human_rct', '1'),
      createStudy('human_rct', '2'),
      createStudy('human_observational', '3'),
      createStudy('animal_invivo', '4'),
      createStudy('animal_invitro', '5'),
    ]

    const counts = categorizeStudies(studies)

    expect(counts.humanRct).toBe(2)
    expect(counts.humanObservational).toBe(1)
    expect(counts.humanTotal).toBe(3)
    expect(counts.animalInvivo).toBe(1)
    expect(counts.animalInvitro).toBe(1)
    expect(counts.animalTotal).toBe(2)
    expect(counts.total).toBe(5)
  })
})

describe('explainGrade', () => {
  it('should explain high grade', () => {
    const studies = [
      createStudy('human_rct', '1'),
      createStudy('human_rct', '2'),
      createStudy('human_rct', '3'),
    ]
    const explanation = explainGrade(studies)
    expect(explanation).toContain('HIGH quality')
    expect(explanation).toContain('3 human RCT')
  })

  it('should explain moderate grade with RCTs', () => {
    const studies = [createStudy('human_rct', '1'), createStudy('human_observational', '2')]
    const explanation = explainGrade(studies)
    expect(explanation).toContain('MODERATE quality')
  })

  it('should explain low grade', () => {
    const studies = Array.from({ length: 5 }, (_, i) => createStudy('animal_invivo', String(i)))
    const explanation = explainGrade(studies)
    expect(explanation).toContain('LOW quality')
    expect(explanation).toContain('animal')
  })
})

describe('meetsMinimumQuality', () => {
  it('should return true for high and moderate', () => {
    const high = [
      createStudy('human_rct', '1'),
      createStudy('human_rct', '2'),
      createStudy('human_rct', '3'),
    ]
    expect(meetsMinimumQuality(high)).toBe(true)

    const moderate = [createStudy('human_rct', '1')]
    expect(meetsMinimumQuality(moderate)).toBe(true)
  })

  it('should return false for low and very_low', () => {
    const low = Array.from({ length: 5 }, (_, i) => createStudy('animal_invivo', String(i)))
    expect(meetsMinimumQuality(low)).toBe(false)

    expect(meetsMinimumQuality([])).toBe(false)
  })
})

describe('getMissingForUpgrade', () => {
  it('should suggest improvements for very_low', () => {
    const studies = [createStudy('animal_invivo', '1')]
    const suggestions = getMissingForUpgrade(studies)
    expect(suggestions.length).toBeGreaterThan(0)
    expect(suggestions.some((s) => s.includes('animal'))).toBe(true)
  })

  it('should suggest improvements for moderate to high', () => {
    const studies = [createStudy('human_rct', '1')]
    const suggestions = getMissingForUpgrade(studies)
    expect(suggestions.some((s) => s.includes('2 more human RCT'))).toBe(true)
  })

  it('should return empty for high grade', () => {
    const studies = [
      createStudy('human_rct', '1'),
      createStudy('human_rct', '2'),
      createStudy('human_rct', '3'),
    ]
    const suggestions = getMissingForUpgrade(studies)
    expect(suggestions.length).toBe(0)
  })
})
