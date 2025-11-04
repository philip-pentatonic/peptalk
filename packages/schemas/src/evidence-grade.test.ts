import { describe, it, expect } from 'vitest'
import {
  EvidenceGradeSchema,
  isHighQuality,
  compareGrades,
  type EvidenceGrade,
} from './evidence-grade'

describe('EvidenceGradeSchema', () => {
  it('should accept valid evidence grades', () => {
    expect(EvidenceGradeSchema.parse('very_low')).toBe('very_low')
    expect(EvidenceGradeSchema.parse('low')).toBe('low')
    expect(EvidenceGradeSchema.parse('moderate')).toBe('moderate')
    expect(EvidenceGradeSchema.parse('high')).toBe('high')
  })

  it('should reject invalid grades', () => {
    expect(() => EvidenceGradeSchema.parse('invalid')).toThrow()
    expect(() => EvidenceGradeSchema.parse('medium')).toThrow()
  })
})

describe('isHighQuality', () => {
  it('should return true for high and moderate', () => {
    expect(isHighQuality('high')).toBe(true)
    expect(isHighQuality('moderate')).toBe(true)
  })

  it('should return false for low and very_low', () => {
    expect(isHighQuality('low')).toBe(false)
    expect(isHighQuality('very_low')).toBe(false)
  })
})

describe('compareGrades', () => {
  it('should compare grades correctly', () => {
    expect(compareGrades('high', 'moderate')).toBeGreaterThan(0)
    expect(compareGrades('moderate', 'low')).toBeGreaterThan(0)
    expect(compareGrades('low', 'very_low')).toBeGreaterThan(0)
  })

  it('should return 0 for equal grades', () => {
    expect(compareGrades('high', 'high')).toBe(0)
  })

  it('should return negative for lower grades', () => {
    expect(compareGrades('low', 'moderate')).toBeLessThan(0)
  })
})
