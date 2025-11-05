import { z } from 'zod'
import { StudySchema } from './study'

/**
 * SourcePack: Raw research data ingested from external APIs.
 *
 * This is the intermediate format between ingestion and synthesis.
 * Contains all studies for a peptide before normalization.
 */
export const SourcePackSchema = z.object({
  peptideId: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, 'Peptide ID must be lowercase with hyphens'),
  name: z.string().min(1),
  aliases: z.array(z.string()).default([]),
  studies: z.array(StudySchema),
  ingestedAt: z
    .string()
    .datetime()
    .default(() => new Date().toISOString()),
  metadata: z
    .object({
      pubmedCount: z.number().int().nonnegative(),
      clinicalTrialsCount: z.number().int().nonnegative(),
      totalCount: z.number().int().nonnegative(),
    })
    .optional(),
})

export type SourcePack = z.infer<typeof SourcePackSchema>

/**
 * Create an empty SourcePack.
 */
export function createEmptySourcePack(
  peptideId: string,
  name: string,
  aliases: string[] = []
): SourcePack {
  return {
    peptideId,
    name,
    aliases,
    studies: [],
    ingestedAt: new Date().toISOString(),
    metadata: {
      pubmedCount: 0,
      clinicalTrialsCount: 0,
      totalCount: 0,
    },
  }
}

/**
 * Calculate metadata from studies array.
 */
export function calculateMetadata(studies: SourcePack['studies']) {
  const pubmedCount = studies.filter((s) => s.type === 'pubmed').length
  const clinicalTrialsCount = studies.filter((s) => s.type === 'clinicaltrials').length

  return {
    pubmedCount,
    clinicalTrialsCount,
    totalCount: studies.length,
  }
}

/**
 * Add metadata to SourcePack.
 */
export function withMetadata(sourcePack: SourcePack): SourcePack {
  return {
    ...sourcePack,
    metadata: calculateMetadata(sourcePack.studies),
  }
}
