import { describe, it, expect } from 'vitest'
import {
  PubMedStudySchema,
  ClinicalTrialStudySchema,
  StudySchema,
  isPubMedStudy,
  isClinicalTrialStudy,
  getStudyUrl,
  getCitation,
  type PubMedStudy,
  type ClinicalTrialStudy,
} from './study'

describe('PubMedStudySchema', () => {
  const validPubMed: PubMedStudy = {
    id: 'PMID:12345678',
    type: 'pubmed',
    pmid: '12345678',
    title: 'Test Study',
    studyType: 'human_rct',
    abstract: 'Study abstract',
    authors: ['Smith J', 'Doe A'],
    journal: 'Nature',
    year: 2023,
  }

  it('should accept valid PubMed study', () => {
    expect(PubMedStudySchema.parse(validPubMed)).toEqual(validPubMed)
  })

  it('should reject invalid PMID format', () => {
    const invalid = { ...validPubMed, pmid: 'ABC123' }
    expect(() => PubMedStudySchema.parse(invalid)).toThrow()
  })

  it('should reject future years', () => {
    const invalid = { ...validPubMed, year: 2030 }
    expect(() => PubMedStudySchema.parse(invalid)).toThrow()
  })
})

describe('ClinicalTrialStudySchema', () => {
  const validCT: ClinicalTrialStudy = {
    id: 'NCT:NCT01234567',
    type: 'clinicaltrials',
    nctId: 'NCT01234567',
    title: 'Test Trial',
    studyType: 'human_rct',
    status: 'Completed',
    conditions: ['Pain'],
    interventions: ['BPC-157'],
  }

  it('should accept valid ClinicalTrials study', () => {
    expect(ClinicalTrialStudySchema.parse(validCT)).toEqual(validCT)
  })

  it('should reject invalid NCT ID format', () => {
    const invalid = { ...validCT, nctId: 'NCT123' }
    expect(() => ClinicalTrialStudySchema.parse(invalid)).toThrow()
  })
})

describe('StudySchema (discriminated union)', () => {
  it('should parse PubMed studies', () => {
    const pubmed = {
      id: 'PMID:12345678',
      type: 'pubmed' as const,
      pmid: '12345678',
      title: 'Test',
      studyType: 'human_rct' as const,
      abstract: 'Abstract',
      authors: ['Smith'],
      journal: 'Nature',
      year: 2023,
    }

    const result = StudySchema.parse(pubmed)
    expect(result.type).toBe('pubmed')
  })

  it('should parse ClinicalTrials studies', () => {
    const ct = {
      id: 'NCT:NCT01234567',
      type: 'clinicaltrials' as const,
      nctId: 'NCT01234567',
      title: 'Test',
      studyType: 'human_rct' as const,
      status: 'Completed',
      conditions: ['Pain'],
      interventions: ['BPC-157'],
    }

    const result = StudySchema.parse(ct)
    expect(result.type).toBe('clinicaltrials')
  })
})

describe('Type guards', () => {
  const pubmed = StudySchema.parse({
    id: 'PMID:123',
    type: 'pubmed',
    pmid: '123',
    title: 'Test',
    studyType: 'human_rct',
    abstract: 'Abstract',
    authors: [],
    journal: 'Journal',
    year: 2023,
  })

  const ct = StudySchema.parse({
    id: 'NCT:NCT01234567',
    type: 'clinicaltrials',
    nctId: 'NCT01234567',
    title: 'Test',
    studyType: 'human_rct',
    status: 'Completed',
    conditions: [],
    interventions: [],
  })

  it('isPubMedStudy should work', () => {
    expect(isPubMedStudy(pubmed)).toBe(true)
    expect(isPubMedStudy(ct)).toBe(false)
  })

  it('isClinicalTrialStudy should work', () => {
    expect(isClinicalTrialStudy(ct)).toBe(true)
    expect(isClinicalTrialStudy(pubmed)).toBe(false)
  })
})

describe('getStudyUrl', () => {
  it('should return PubMed URL', () => {
    const study = StudySchema.parse({
      id: 'PMID:12345678',
      type: 'pubmed',
      pmid: '12345678',
      title: 'Test',
      studyType: 'human_rct',
      abstract: '',
      authors: [],
      journal: 'Journal',
      year: 2023,
    })

    expect(getStudyUrl(study)).toBe('https://pubmed.ncbi.nlm.nih.gov/12345678/')
  })

  it('should return ClinicalTrials URL', () => {
    const study = StudySchema.parse({
      id: 'NCT:NCT01234567',
      type: 'clinicaltrials',
      nctId: 'NCT01234567',
      title: 'Test',
      studyType: 'human_rct',
      status: 'Completed',
      conditions: [],
      interventions: [],
    })

    expect(getStudyUrl(study)).toBe('https://clinicaltrials.gov/study/NCT01234567')
  })
})

describe('getCitation', () => {
  it('should format PubMed citation', () => {
    const study = StudySchema.parse({
      id: 'PMID:12345678',
      type: 'pubmed',
      pmid: '12345678',
      title: 'Test',
      studyType: 'human_rct',
      abstract: '',
      authors: ['Smith J'],
      journal: 'Nature',
      year: 2023,
    })

    expect(getCitation(study)).toContain('Smith J et al')
    expect(getCitation(study)).toContain('Nature')
    expect(getCitation(study)).toContain('2023')
    expect(getCitation(study)).toContain('PMID:12345678')
  })

  it('should format ClinicalTrials citation', () => {
    const study = StudySchema.parse({
      id: 'NCT:NCT01234567',
      type: 'clinicaltrials',
      nctId: 'NCT01234567',
      title: 'Test',
      studyType: 'human_rct',
      status: 'Completed',
      conditions: [],
      interventions: [],
    })

    expect(getCitation(study)).toContain('NCT01234567')
  })
})
