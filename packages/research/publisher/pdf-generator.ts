/**
 * PDF generation from PageRecord HTML using Puppeteer.
 * Generates citation-formatted PDFs for download.
 */

import puppeteer, { type Browser, type Page } from 'puppeteer'
import type { PageRecord } from '@peptalk/schemas'

export interface PdfConfig {
  headless?: boolean
  format?: 'A4' | 'Letter'
  margin?: {
    top?: string
    right?: string
    bottom?: string
    left?: string
  }
}

export interface PdfResult {
  buffer: Buffer
  sizeBytes: number
  pageCount: number
}

/**
 * Generate PDF from PageRecord.
 */
export async function generatePdf(
  pageRecord: PageRecord,
  config: PdfConfig = {}
): Promise<PdfResult> {
  const browser = await puppeteer.launch({
    headless: config.headless ?? true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()

    // Set viewport for consistent rendering
    await page.setViewport({ width: 1200, height: 1600 })

    // Generate HTML content
    const html = buildHtmlDocument(pageRecord)

    // Load HTML
    await page.setContent(html, { waitUntil: 'networkidle0' })

    // Generate PDF
    const buffer = await page.pdf({
      format: config.format || 'A4',
      margin: config.margin || {
        top: '1in',
        right: '1in',
        bottom: '1in',
        left: '1in',
      },
      printBackground: true,
      preferCSSPageSize: false,
    })

    // Get page count (approximate based on content length)
    const pageCount = estimatePageCount(pageRecord)

    return {
      buffer: Buffer.from(buffer),
      sizeBytes: buffer.byteLength,
      pageCount,
    }
  } finally {
    await browser.close()
  }
}

/**
 * Build complete HTML document with styling.
 */
function buildHtmlDocument(pageRecord: PageRecord): string {
  const css = `
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: 'Georgia', 'Times New Roman', serif;
        font-size: 11pt;
        line-height: 1.6;
        color: #1a1a1a;
        max-width: 100%;
      }

      h1 {
        font-size: 24pt;
        font-weight: bold;
        margin-bottom: 0.5em;
        color: #000;
        page-break-after: avoid;
      }

      h2 {
        font-size: 16pt;
        font-weight: bold;
        margin-top: 1.5em;
        margin-bottom: 0.75em;
        color: #000;
        page-break-after: avoid;
      }

      h3 {
        font-size: 13pt;
        font-weight: bold;
        margin-top: 1em;
        margin-bottom: 0.5em;
        color: #000;
        page-break-after: avoid;
      }

      p {
        margin-bottom: 1em;
        text-align: justify;
      }

      ul, ol {
        margin-left: 1.5em;
        margin-bottom: 1em;
      }

      li {
        margin-bottom: 0.5em;
      }

      strong {
        font-weight: bold;
      }

      em {
        font-style: italic;
      }

      .header {
        border-bottom: 2px solid #000;
        padding-bottom: 1em;
        margin-bottom: 2em;
      }

      .metadata {
        font-size: 9pt;
        color: #666;
        margin-top: 0.5em;
      }

      .evidence-badge {
        display: inline-block;
        padding: 0.25em 0.75em;
        border-radius: 4px;
        font-size: 9pt;
        font-weight: bold;
        text-transform: uppercase;
        margin-right: 1em;
      }

      .badge-high {
        background: #10b981;
        color: white;
      }

      .badge-moderate {
        background: #f59e0b;
        color: white;
      }

      .badge-low {
        background: #ef4444;
        color: white;
      }

      .badge-very-low {
        background: #6b7280;
        color: white;
      }

      .summary {
        background: #f9fafb;
        border-left: 4px solid #3b82f6;
        padding: 1em;
        margin-bottom: 2em;
        page-break-inside: avoid;
      }

      .section {
        margin-bottom: 2em;
        page-break-inside: avoid;
      }

      .legal-notes {
        margin-top: 3em;
        padding-top: 1em;
        border-top: 1px solid #d1d5db;
        font-size: 9pt;
        color: #6b7280;
        page-break-inside: avoid;
      }

      .legal-notes p {
        margin-bottom: 0.5em;
      }

      .footer {
        margin-top: 2em;
        padding-top: 1em;
        border-top: 1px solid #e5e7eb;
        font-size: 8pt;
        color: #9ca3af;
        text-align: center;
      }

      @page {
        size: A4;
        margin: 1in;
      }

      @media print {
        body {
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
        }
      }
    </style>
  `

  const badgeClass = `badge-${pageRecord.evidenceGrade.replace('_', '-')}`

  const aliases = pageRecord.aliases.length > 0
    ? `<div class="metadata">Also known as: ${pageRecord.aliases.join(', ')}</div>`
    : ''

  const header = `
    <div class="header">
      <h1>${pageRecord.name}</h1>
      ${aliases}
      <div class="metadata">
        <span class="evidence-badge ${badgeClass}">${formatGrade(pageRecord.evidenceGrade)} Evidence</span>
        <span>${pageRecord.humanRctCount} Human RCTs • ${pageRecord.animalCount} Animal Studies</span>
        <span style="float: right;">Last Updated: ${new Date(pageRecord.lastUpdated).toLocaleDateString()}</span>
      </div>
    </div>
  `

  const summary = `
    <div class="summary">
      <h2>Summary</h2>
      ${pageRecord.summaryHtml}
    </div>
  `

  const sections = pageRecord.sections
    .sort((a, b) => a.order - b.order)
    .map(
      (section) => `
    <div class="section">
      <h2>${section.title}</h2>
      ${section.contentHtml}
    </div>
  `
    )
    .join('\n')

  const legalNotes = `
    <div class="legal-notes">
      <h3>Legal Disclaimer</h3>
      ${pageRecord.legalNotes.map((note) => `<p>${note}</p>`).join('\n')}
    </div>
  `

  const footer = `
    <div class="footer">
      <p>Generated by PepTalk • Version ${pageRecord.version} • ${new Date().toISOString()}</p>
      <p>For educational purposes only. Not medical advice.</p>
    </div>
  `

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageRecord.name} - PepTalk</title>
  ${css}
</head>
<body>
  ${header}
  ${summary}
  ${sections}
  ${legalNotes}
  ${footer}
</body>
</html>
  `.trim()
}

/**
 * Format evidence grade for display.
 */
function formatGrade(grade: string): string {
  return grade
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Estimate page count based on content length.
 * Rough heuristic: ~500 words per page.
 */
function estimatePageCount(pageRecord: PageRecord): number {
  const allContent = [
    pageRecord.summaryHtml,
    ...pageRecord.sections.map((s) => s.contentHtml),
  ].join(' ')

  // Strip HTML tags
  const textContent = allContent.replace(/<[^>]*>/g, ' ')

  // Count words
  const wordCount = textContent.split(/\s+/).filter((w) => w.length > 0).length

  // Estimate pages (500 words per page with margins)
  const estimatedPages = Math.ceil(wordCount / 500)

  return Math.max(1, estimatedPages)
}
