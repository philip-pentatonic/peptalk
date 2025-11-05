/**
 * Publisher module - Final step in research pipeline.
 * Orchestrates PDF generation, database insertion, and R2 upload.
 */

import type { D1Database, R2Bucket } from '@cloudflare/workers-types'
import type { PageRecord } from '@peptalk/schemas'
import { generatePdf, type PdfConfig } from './pdf-generator'
import { writeToDatabase, rollbackDatabase, type DatabaseWriteResult } from './database-writer'
import { uploadPdf, deletePdf, type R2UploadResult } from './r2-storage'

export * from './pdf-generator'
export * from './database-writer'
export * from './r2-storage'

export interface PublishConfig {
  db: D1Database
  r2Bucket: R2Bucket
  r2PublicUrl?: string
  pdfConfig?: PdfConfig
}

export interface PublishResult {
  success: boolean
  peptideId: string
  pdfUrl: string
  database: DatabaseWriteResult
  pdf: {
    sizeBytes: number
    pageCount: number
    key: string
  }
  error?: string
}

/**
 * Publish PageRecord to production.
 *
 * Steps:
 * 1. Generate PDF from HTML content
 * 2. Write peptide + studies to D1
 * 3. Upload PDF to R2
 * 4. Return success with URLs
 *
 * On failure, rolls back database changes.
 */
export async function publish(
  pageRecord: PageRecord,
  config: PublishConfig
): Promise<PublishResult> {
  let peptideId: string | undefined
  let pdfKey: string | undefined

  try {
    // Step 1: Generate PDF
    console.log(`[Publisher] Generating PDF for ${pageRecord.name}...`)
    const pdfResult = await generatePdf(pageRecord, config.pdfConfig)
    console.log(`[Publisher] PDF generated: ${pdfResult.sizeBytes} bytes, ${pdfResult.pageCount} pages`)

    // Step 2: Write to database
    console.log(`[Publisher] Writing to database...`)
    const dbResult = await writeToDatabase(pageRecord, config.db)
    peptideId = dbResult.peptideId
    console.log(
      `[Publisher] Database write complete: ${dbResult.studiesInserted} studies, ${dbResult.sectionsInserted} sections`
    )

    // Step 3: Upload PDF to R2
    console.log(`[Publisher] Uploading PDF to R2...`)
    const r2Result = await uploadPdf(pageRecord.slug, pdfResult.buffer, {
      bucket: config.r2Bucket,
      publicUrl: config.r2PublicUrl,
    })
    pdfKey = r2Result.key
    console.log(`[Publisher] PDF uploaded: ${r2Result.url}`)

    // Success!
    return {
      success: true,
      peptideId,
      pdfUrl: r2Result.url,
      database: dbResult,
      pdf: {
        sizeBytes: pdfResult.sizeBytes,
        pageCount: pdfResult.pageCount,
        key: r2Result.key,
      },
    }
  } catch (error) {
    console.error(`[Publisher] Publish failed:`, error)

    // Rollback on failure
    if (peptideId) {
      console.log(`[Publisher] Rolling back database changes for ${peptideId}...`)
      await rollbackDatabase(peptideId, config.db)
    }

    if (pdfKey) {
      console.log(`[Publisher] Deleting uploaded PDF ${pdfKey}...`)
      await deletePdf(pageRecord.slug, config.r2Bucket)
    }

    return {
      success: false,
      peptideId: peptideId || 'unknown',
      pdfUrl: '',
      database: {
        peptideId: peptideId || 'unknown',
        studiesInserted: 0,
        sectionsInserted: 0,
        success: false,
      },
      pdf: {
        sizeBytes: 0,
        pageCount: 0,
        key: '',
      },
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Dry run - validate without publishing.
 * Generates PDF but doesn't write to database or upload.
 */
export async function dryRun(
  pageRecord: PageRecord,
  pdfConfig?: PdfConfig
): Promise<{
  valid: boolean
  pdfSizeBytes: number
  pdfPageCount: number
  error?: string
}> {
  try {
    // Generate PDF to validate
    const pdfResult = await generatePdf(pageRecord, pdfConfig)

    return {
      valid: true,
      pdfSizeBytes: pdfResult.sizeBytes,
      pdfPageCount: pdfResult.pageCount,
    }
  } catch (error) {
    return {
      valid: false,
      pdfSizeBytes: 0,
      pdfPageCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Republish existing peptide.
 * Updates database and generates new PDF version.
 */
export async function republish(
  pageRecord: PageRecord,
  config: PublishConfig
): Promise<PublishResult> {
  // Increment version
  const updatedRecord: PageRecord = {
    ...pageRecord,
    version: pageRecord.version + 1,
    lastUpdated: new Date().toISOString(),
  }

  return publish(updatedRecord, config)
}
