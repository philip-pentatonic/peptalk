// @ts-nocheck
/**
 * PubMed E-utilities API client.
 * Fetches studies from NCBI PubMed database.
 *
 * API Docs: https://www.ncbi.nlm.nih.gov/books/NBK25501/
 */

export interface PubMedConfig {
  email: string // Required by NCBI
  apiKey?: string // Optional, increases rate limits
  maxResults?: number
}

export interface PubMedArticle {
  pmid: string
  title: string
  abstract: string
  authors: string[]
  journal: string
  year: number
  doi?: string
}

const PUBMED_BASE_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils'

/**
 * Search PubMed for articles matching a query.
 * Returns array of PMIDs.
 */
export async function searchPubMed(
  query: string,
  config: PubMedConfig
): Promise<string[]> {
  const params = new URLSearchParams({
    db: 'pubmed',
    term: query,
    retmode: 'json',
    retmax: String(config.maxResults || 100),
    email: config.email,
  })

  if (config.apiKey) {
    params.set('api_key', config.apiKey)
  }

  const url = `${PUBMED_BASE_URL}/esearch.fcgi?${params}`

  try {
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`PubMed search failed: ${response.statusText}`)
    }

    const data = await response.json()

    // Extract PMIDs from response
    const pmids: string[] = data.esearchresult?.idlist || []

    return pmids
  } catch (error) {
    throw new Error(`PubMed search error: ${error}`)
  }
}

/**
 * Fetch full article details for given PMIDs.
 */
export async function fetchArticles(
  pmids: string[],
  config: PubMedConfig
): Promise<PubMedArticle[]> {
  if (pmids.length === 0) return []

  const params = new URLSearchParams({
    db: 'pubmed',
    id: pmids.join(','),
    retmode: 'xml',
    email: config.email,
  })

  if (config.apiKey) {
    params.set('api_key', config.apiKey)
  }

  const url = `${PUBMED_BASE_URL}/efetch.fcgi?${params}`

  try {
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`PubMed fetch failed: ${response.statusText}`)
    }

    const xml = await response.text()

    return parseArticlesXML(xml)
  } catch (error) {
    throw new Error(`PubMed fetch error: ${error}`)
  }
}

/**
 * Parse PubMed XML response into articles.
 */
function parseArticlesXML(xml: string): PubMedArticle[] {
  const articles: PubMedArticle[] = []

  // Basic XML parsing (would use proper XML parser in production)
  const articleMatches = xml.matchAll(/<PubmedArticle>([\s\S]*?)<\/PubmedArticle>/g)

  for (const match of articleMatches) {
    const articleXml = match[1]

    try {
      const article = parseArticle(articleXml)
      if (article) articles.push(article)
    } catch (error) {
      console.error('Failed to parse article:', error)
    }
  }

  return articles
}

/**
 * Parse single article from XML.
 */
function parseArticle(xml: string): PubMedArticle | null {
  // Extract PMID
  const pmidMatch = xml.match(/<PMID[^>]*>(\d+)<\/PMID>/)
  if (!pmidMatch) return null
  const pmid = pmidMatch[1]

  // Extract title
  const titleMatch = xml.match(/<ArticleTitle>(.*?)<\/ArticleTitle>/)
  const title = titleMatch ? stripHtml(titleMatch[1]) : ''

  // Extract abstract
  const abstractMatch = xml.match(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/)
  const abstract = abstractMatch ? stripHtml(abstractMatch[1]) : ''

  // Extract authors
  const authors: string[] = []
  const authorMatches = xml.matchAll(
    /<Author[^>]*>[\s\S]*?<LastName>(.*?)<\/LastName>[\s\S]*?<ForeName>(.*?)<\/ForeName>[\s\S]*?<\/Author>/g
  )
  for (const match of authorMatches) {
    const lastName = match[1]
    const foreName = match[2]
    authors.push(`${lastName} ${foreName.charAt(0)}`)
  }

  // Extract journal
  const journalMatch = xml.match(/<Title>(.*?)<\/Title>/)
  const journal = journalMatch ? stripHtml(journalMatch[1]) : 'Unknown'

  // Extract year
  const yearMatch = xml.match(/<PubDate>[\s\S]*?<Year>(\d{4})<\/Year>/)
  const year = yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear()

  // Extract DOI
  const doiMatch = xml.match(/<ArticleId IdType="doi">(.*?)<\/ArticleId>/)
  const doi = doiMatch ? doiMatch[1] : undefined

  return {
    pmid,
    title,
    abstract,
    authors,
    journal,
    year,
    doi,
  }
}

/**
 * Strip HTML tags from text.
 */
function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, '').trim()
}

/**
 * Build search query for peptide research.
 */
export function buildPeptideQuery(peptideName: string, aliases: string[]): string {
  const terms = [peptideName, ...aliases]
  const quotedTerms = terms.map((t) => `"${t}"`)
  return quotedTerms.join(' OR ')
}

/**
 * Search and fetch articles for a peptide.
 * Combines search + fetch in one call.
 */
export async function searchAndFetch(
  peptideName: string,
  aliases: string[],
  config: PubMedConfig
): Promise<PubMedArticle[]> {
  const query = buildPeptideQuery(peptideName, aliases)

  const pmids = await searchPubMed(query, config)

  if (pmids.length === 0) {
    return []
  }

  // Respect rate limits: fetch in batches of 200 (max per request)
  const articles: PubMedArticle[] = []

  for (let i = 0; i < pmids.length; i += 200) {
    const batch = pmids.slice(i, i + 200)
    const batchArticles = await fetchArticles(batch, config)
    articles.push(...batchArticles)

    // Rate limiting: 3 requests/second without API key, 10/second with
    if (i + 200 < pmids.length) {
      await sleep(config.apiKey ? 100 : 333)
    }
  }

  return articles
}

/**
 * Sleep helper for rate limiting.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
