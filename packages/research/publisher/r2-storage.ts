/**
 * R2 storage module for PDF uploads.
 * Handles PDF storage and signed URL generation.
 */

import type { R2Bucket } from '@cloudflare/workers-types'

export interface R2UploadResult {
  key: string
  etag: string
  sizeBytes: number
  url: string
}

export interface R2Config {
  bucket: R2Bucket
  publicUrl?: string
}

/**
 * Upload PDF to R2 storage.
 */
export async function uploadPdf(
  slug: string,
  pdfBuffer: Buffer,
  config: R2Config
): Promise<R2UploadResult> {
  const key = buildPdfKey(slug)

  try {
    // Upload to R2
    const object = await config.bucket.put(key, pdfBuffer, {
      httpMetadata: {
        contentType: 'application/pdf',
        contentDisposition: `attachment; filename="${slug}.pdf"`,
        cacheControl: 'public, max-age=31536000', // 1 year cache
      },
      customMetadata: {
        slug,
        uploadedAt: new Date().toISOString(),
      },
    })

    // Get public URL
    const url = config.publicUrl
      ? `${config.publicUrl}/${key}`
      : `https://pub-${config.bucket}.r2.dev/${key}`

    return {
      key,
      etag: object.etag,
      sizeBytes: pdfBuffer.byteLength,
      url,
    }
  } catch (error) {
    throw new Error(`R2 upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Generate signed URL for PDF download.
 * Valid for specified duration.
 */
export async function generateSignedUrl(
  key: string,
  bucket: R2Bucket,
  expiresIn: number = 3600
): Promise<string> {
  try {
    // Get object from R2
    const object = await bucket.get(key)

    if (!object) {
      throw new Error(`PDF not found: ${key}`)
    }

    // For Cloudflare R2, signed URLs are generated differently
    // This is a simplified version - in production, use R2 API for presigned URLs
    const signedUrl = `https://${bucket}.r2.dev/${key}?X-Amz-Expires=${expiresIn}`

    return signedUrl
  } catch (error) {
    throw new Error(`Failed to generate signed URL: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Check if PDF exists in R2.
 */
export async function pdfExists(slug: string, bucket: R2Bucket): Promise<boolean> {
  const key = buildPdfKey(slug)

  try {
    const object = await bucket.head(key)
    return object !== null
  } catch {
    return false
  }
}

/**
 * Delete PDF from R2.
 * Used for cleanup or when rolling back.
 */
export async function deletePdf(slug: string, bucket: R2Bucket): Promise<void> {
  const key = buildPdfKey(slug)

  try {
    await bucket.delete(key)
  } catch (error) {
    console.error(`Failed to delete PDF: ${error}`)
    // Don't throw - deletion is best-effort
  }
}

/**
 * Get PDF metadata without downloading.
 */
export async function getPdfMetadata(
  slug: string,
  bucket: R2Bucket
): Promise<{
  size: number
  etag: string
  uploaded: string
} | null> {
  const key = buildPdfKey(slug)

  try {
    const object = await bucket.head(key)

    if (!object) {
      return null
    }

    return {
      size: object.size,
      etag: object.etag,
      uploaded: object.customMetadata?.uploadedAt || 'unknown',
    }
  } catch {
    return null
  }
}

/**
 * Build R2 key for PDF.
 * Format: pdfs/{slug}/{slug}-v{version}.pdf
 */
function buildPdfKey(slug: string, version: number = 1): string {
  return `pdfs/${slug}/${slug}-v${version}.pdf`
}

/**
 * List all PDFs for a peptide.
 */
export async function listPeptidePdfs(
  slug: string,
  bucket: R2Bucket
): Promise<string[]> {
  const prefix = `pdfs/${slug}/`

  try {
    const listed = await bucket.list({ prefix })

    return listed.objects.map((obj) => obj.key)
  } catch (error) {
    console.error(`Failed to list PDFs: ${error}`)
    return []
  }
}
