/**
 * Daily Study Monitor
 *
 * Automated script that runs daily to:
 * - Check PubMed for new studies on tracked peptides
 * - Check ClinicalTrials.gov for trial updates
 * - Create news items in the database
 * - Notify users who are tracking affected peptides
 *
 * Run via cron: 0 6 * * * (daily at 6am)
 */

import * as crypto from 'crypto'

interface NewsItem {
  id: string
  title: string
  type: 'new_study' | 'clinical_trial' | 'fda_news' | 'trending' | 'industry_news'
  peptideSlug: string
  content: string
  summary: string
  source: string
  sourceUrl?: string
  pmid?: string
  nctId?: string
  publishedAt: string
}

interface PubMedStudy {
  pmid: string
  title: string
  abstract: string
  publishedDate: string
  authors: string[]
  journal: string
}

interface ClinicalTrial {
  nctId: string
  title: string
  status: string
  phase: string
  lastUpdate: string
  interventions: string[]
}

/**
 * Get list of popular/tracked peptides to monitor
 */
async function getTrackedPeptides(apiUrl: string, apiSecret: string): Promise<string[]> {
  try {
    // Get all peptides from the database
    const response = await fetch(`${apiUrl}/api/peptides?limit=100`, {
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch peptides: ${response.statusText}`)
    }

    const data = await response.json()
    return data.data.map((p: any) => p.slug)
  } catch (error) {
    console.error('Error fetching tracked peptides:', error)
    return []
  }
}

/**
 * Search PubMed for new studies in the last 24 hours
 */
async function searchPubMedForNewStudies(
  peptideName: string,
  apiKey: string,
  email: string
): Promise<PubMedStudy[]> {
  try {
    // Calculate date range (last 24 hours)
    const today = new Date()
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
    const dateFilter = `${yesterday.getFullYear()}/${String(yesterday.getMonth() + 1).padStart(2, '0')}/${String(yesterday.getDate()).padStart(2, '0')}:${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}[PDAT]`

    // Search PubMed
    const searchQuery = `${peptideName}[Title/Abstract] AND ${dateFilter}`
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(searchQuery)}&retmode=json&retmax=10&api_key=${apiKey}&email=${email}`

    const searchResponse = await fetch(searchUrl)
    const searchData = await searchResponse.json()

    const pmids = searchData.esearchresult?.idlist || []
    if (pmids.length === 0) {
      return []
    }

    // Fetch article details
    const fetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${pmids.join(',')}&retmode=xml&api_key=${apiKey}&email=${email}`
    const fetchResponse = await fetch(fetchUrl)
    const xmlText = await fetchResponse.text()

    // Parse XML (simplified - in production use proper XML parser)
    const studies: PubMedStudy[] = []
    const articlePattern = /<PubmedArticle>([\s\S]*?)<\/PubmedArticle>/g
    let match

    while ((match = articlePattern.exec(xmlText)) !== null) {
      const articleXml = match[1]

      const pmidMatch = /<PMID[^>]*>(\d+)<\/PMID>/.exec(articleXml)
      const titleMatch = /<ArticleTitle>(.*?)<\/ArticleTitle>/.exec(articleXml)
      const abstractMatch = /<AbstractText[^>]*>(.*?)<\/AbstractText>/.exec(articleXml)
      const journalMatch = /<Title>(.*?)<\/Title>/.exec(articleXml)
      const yearMatch = /<Year>(\d{4})<\/Year>/.exec(articleXml)

      if (pmidMatch && titleMatch) {
        studies.push({
          pmid: pmidMatch[1],
          title: titleMatch[1].replace(/<[^>]+>/g, ''),
          abstract: abstractMatch ? abstractMatch[1].replace(/<[^>]+>/g, '') : '',
          publishedDate: yearMatch ? `${yearMatch[1]}-01-01` : new Date().toISOString().split('T')[0],
          authors: [],
          journal: journalMatch ? journalMatch[1] : 'Unknown',
        })
      }
    }

    // Rate limit
    await new Promise(resolve => setTimeout(resolve, 100))

    return studies
  } catch (error) {
    console.error(`Error searching PubMed for ${peptideName}:`, error)
    return []
  }
}

/**
 * Search ClinicalTrials.gov for trial updates
 */
async function searchClinicalTrialsForUpdates(
  peptideName: string
): Promise<ClinicalTrial[]> {
  try {
    // Search for trials with updates in the last 7 days
    const searchUrl = `https://clinicaltrials.gov/api/v2/studies?query.term=${encodeURIComponent(peptideName)}&filter.advanced=AREA[LastUpdatePostDate]RANGE[MIN,MAX]&pageSize=10&format=json`

    const response = await fetch(searchUrl)
    const data = await response.json()

    const trials: ClinicalTrial[] = []

    for (const study of data.studies || []) {
      const protocol = study.protocolSection
      const nctId = protocol?.identificationModule?.nctId
      const title = protocol?.identificationModule?.officialTitle || protocol?.identificationModule?.briefTitle
      const status = protocol?.statusModule?.overallStatus
      const phase = protocol?.designModule?.phases?.[0] || 'UNKNOWN'
      const lastUpdate = protocol?.statusModule?.lastUpdatePostDate

      // Check if updated in last 7 days
      const updateDate = new Date(lastUpdate)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

      if (updateDate > sevenDaysAgo && nctId && title) {
        trials.push({
          nctId,
          title,
          status: status || 'UNKNOWN',
          phase,
          lastUpdate,
          interventions: protocol?.armsInterventionsModule?.interventions?.map((i: any) => i.name) || [],
        })
      }
    }

    return trials
  } catch (error) {
    console.error(`Error searching ClinicalTrials.gov for ${peptideName}:`, error)
    return []
  }
}

/**
 * Create news item in database
 */
async function createNewsItem(
  newsItem: NewsItem,
  apiUrl: string,
  apiSecret: string
): Promise<boolean> {
  try {
    const response = await fetch(`${apiUrl}/api/internal/news`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': apiSecret,
      },
      body: JSON.stringify(newsItem),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`Failed to create news item: ${error}`)
      return false
    }

    return true
  } catch (error) {
    console.error('Error creating news item:', error)
    return false
  }
}

/**
 * Process new studies for a peptide
 */
async function processNewStudies(
  peptideSlug: string,
  peptideName: string,
  pubmedApiKey: string,
  pubmedEmail: string,
  apiUrl: string,
  apiSecret: string
): Promise<number> {
  console.log(`  Checking PubMed for ${peptideName}...`)

  const studies = await searchPubMedForNewStudies(peptideName, pubmedApiKey, pubmedEmail)

  if (studies.length === 0) {
    console.log(`    No new studies found`)
    return 0
  }

  console.log(`    Found ${studies.length} new studies`)

  let created = 0
  for (const study of studies) {
    const newsItem: NewsItem = {
      id: `study-${study.pmid}`,
      title: study.title,
      type: 'new_study',
      peptideSlug,
      content: study.abstract || study.title,
      summary: study.title,
      source: study.journal,
      sourceUrl: `https://pubmed.ncbi.nlm.nih.gov/${study.pmid}`,
      pmid: study.pmid,
      publishedAt: new Date(study.publishedDate).toISOString(),
    }

    const success = await createNewsItem(newsItem, apiUrl, apiSecret)
    if (success) {
      created++
      console.log(`    ✓ Created news item for PMID ${study.pmid}`)
    }
  }

  return created
}

/**
 * Process clinical trial updates for a peptide
 */
async function processTrialUpdates(
  peptideSlug: string,
  peptideName: string,
  apiUrl: string,
  apiSecret: string
): Promise<number> {
  console.log(`  Checking ClinicalTrials.gov for ${peptideName}...`)

  const trials = await searchClinicalTrialsForUpdates(peptideName)

  if (trials.length === 0) {
    console.log(`    No trial updates found`)
    return 0
  }

  console.log(`    Found ${trials.length} trial updates`)

  let created = 0
  for (const trial of trials) {
    const newsItem: NewsItem = {
      id: `trial-${trial.nctId}-${Date.now()}`,
      title: `Clinical Trial Update: ${trial.title}`,
      type: 'clinical_trial',
      peptideSlug,
      content: `${trial.phase} trial (${trial.status}): ${trial.title}. Last updated: ${new Date(trial.lastUpdate).toLocaleDateString()}.`,
      summary: `${trial.phase} trial ${trial.status.toLowerCase()}`,
      source: 'ClinicalTrials.gov',
      sourceUrl: `https://clinicaltrials.gov/study/${trial.nctId}`,
      nctId: trial.nctId,
      publishedAt: new Date(trial.lastUpdate).toISOString(),
    }

    const success = await createNewsItem(newsItem, apiUrl, apiSecret)
    if (success) {
      created++
      console.log(`    ✓ Created news item for ${trial.nctId}`)
    }
  }

  return created
}

/**
 * Main daily monitoring function
 */
export async function runDailyMonitor(config: {
  apiUrl: string
  apiSecret: string
  pubmedApiKey: string
  pubmedEmail: string
}): Promise<void> {
  console.log('🔍 Starting daily study monitor...\n')
  console.log(`Time: ${new Date().toISOString()}`)
  console.log(`API URL: ${config.apiUrl}\n`)

  // Get list of peptides to monitor
  const peptideSlugs = await getTrackedPeptides(config.apiUrl, config.apiSecret)
  console.log(`📋 Monitoring ${peptideSlugs.length} peptides\n`)

  let totalStudies = 0
  let totalTrials = 0

  for (const slug of peptideSlugs) {
    console.log(`\n📦 Processing ${slug}...`)

    // Convert slug to name for searches
    const name = slug.toUpperCase().replace(/-/g, ' ')

    // Check for new studies
    const studyCount = await processNewStudies(
      slug,
      name,
      config.pubmedApiKey,
      config.pubmedEmail,
      config.apiUrl,
      config.apiSecret
    )
    totalStudies += studyCount

    // Check for trial updates
    const trialCount = await processTrialUpdates(
      slug,
      name,
      config.apiUrl,
      config.apiSecret
    )
    totalTrials += trialCount

    // Rate limiting between peptides
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 DAILY MONITOR SUMMARY')
  console.log('='.repeat(60))
  console.log(`Peptides monitored: ${peptideSlugs.length}`)
  console.log(`New studies found: ${totalStudies}`)
  console.log(`Trial updates found: ${totalTrials}`)
  console.log(`Total news items created: ${totalStudies + totalTrials}`)
  console.log('\n✅ Daily monitor complete!\n')
}

// CLI execution
if (require.main === module) {
  const config = {
    apiUrl: process.env.API_URL || 'https://peptalk-api.polished-glitter-23bb.workers.dev',
    apiSecret: process.env.INTERNAL_API_SECRET || '',
    pubmedApiKey: process.env.PUBMED_API_KEY || '',
    pubmedEmail: process.env.PUBMED_EMAIL || 'support@machinegenie.ai',
  }

  if (!config.apiSecret) {
    console.error('❌ Error: INTERNAL_API_SECRET environment variable is required')
    process.exit(1)
  }

  if (!config.pubmedApiKey) {
    console.error('❌ Error: PUBMED_API_KEY environment variable is required')
    process.exit(1)
  }

  runDailyMonitor(config)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('\n❌ Daily monitor failed:', error)
      process.exit(1)
    })
}
