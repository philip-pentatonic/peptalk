/**
 * Quick test script to fetch real studies from PubMed for BPC-157
 * This validates the pipeline can get accurate data
 */

// Simple PubMed API client
const PUBMED_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

async function searchPubMed(query) {
  const url = `${PUBMED_BASE}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmode=json&retmax=100&email=support@machinegenie.ai`;

  const response = await fetch(url);
  const data = await response.json();

  return data.esearchresult?.idlist || [];
}

async function fetchArticleDetails(pmids) {
  if (pmids.length === 0) return [];

  const url = `${PUBMED_BASE}/efetch.fcgi?db=pubmed&id=${pmids.join(',')}&retmode=xml&email=support@machinegenie.ai`;

  const response = await fetch(url);
  const xml = await response.text();

  return parseArticles(xml);
}

function parseArticles(xml) {
  const articles = [];
  const articleMatches = xml.matchAll(/<PubmedArticle>([\s\S]*?)<\/PubmedArticle>/g);

  for (const match of articleMatches) {
    const articleXml = match[1];

    const pmidMatch = articleXml.match(/<PMID[^>]*>(\d+)<\/PMID>/);
    const titleMatch = articleXml.match(/<ArticleTitle>(.*?)<\/ArticleTitle>/);
    const abstractMatch = articleXml.match(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/);
    const yearMatch = articleXml.match(/<PubDate>[\s\S]*?<Year>(\d{4})<\/Year>/);
    const journalMatch = articleXml.match(/<Title>(.*?)<\/Title>/);

    if (pmidMatch && titleMatch) {
      const text = `${titleMatch[1]} ${abstractMatch ? abstractMatch[1] : ''}`.toLowerCase();

      // Infer study type
      let studyType = 'unknown';
      if (text.includes('randomized') || text.includes('rct')) {
        studyType = 'human_rct';
      } else if (text.includes('rat') || text.includes('mouse') || text.includes('animal')) {
        studyType = 'animal_invivo';
      } else if (text.includes('in vitro') || text.includes('cell culture')) {
        studyType = 'in_vitro';
      } else if (text.includes('patient') || text.includes('clinical')) {
        studyType = 'human_observational';
      }

      articles.push({
        pmid: pmidMatch[1],
        title: titleMatch[1].replace(/<[^>]+>/g, ''),
        year: yearMatch ? yearMatch[1] : 'unknown',
        journal: journalMatch ? journalMatch[1].replace(/<[^>]+>/g, '') : 'unknown',
        studyType,
        url: `https://pubmed.ncbi.nlm.nih.gov/${pmidMatch[1]}/`
      });
    }
  }

  return articles;
}

async function main() {
  console.log('\n🔬 Fetching real studies for BPC-157 from PubMed...\n');

  // Search for BPC-157 studies
  const query = '"BPC-157" OR "Body Protection Compound" OR "Pentadecapeptide BPC 157"';

  console.log(`Query: ${query}\n`);

  const pmids = await searchPubMed(query);
  console.log(`✓ Found ${pmids.length} PMIDs\n`);

  if (pmids.length === 0) {
    console.log('No studies found!');
    return;
  }

  // Fetch first 20 for testing
  console.log('📥 Fetching details for first 20 studies...\n');
  const articles = await fetchArticleDetails(pmids.slice(0, 20));

  // Count by study type
  const counts = {
    human_rct: 0,
    human_observational: 0,
    animal_invivo: 0,
    in_vitro: 0,
    unknown: 0
  };

  articles.forEach(a => counts[a.studyType]++);

  console.log('📊 Study Type Breakdown (first 20):');
  console.log(`   Human RCTs: ${counts.human_rct}`);
  console.log(`   Human Observational: ${counts.human_observational}`);
  console.log(`   Animal In Vivo: ${counts.animal_invivo}`);
  console.log(`   In Vitro: ${counts.in_vitro}`);
  console.log(`   Unknown: ${counts.unknown}`);
  console.log('');

  console.log('📚 Sample Studies:\n');

  // Show first 5 studies
  articles.slice(0, 5).forEach((article, i) => {
    console.log(`${i + 1}. [${article.studyType.toUpperCase()}] ${article.title}`);
    console.log(`   PMID: ${article.pmid} | Year: ${article.year}`);
    console.log(`   Journal: ${article.journal}`);
    console.log(`   URL: ${article.url}`);
    console.log('');
  });

  console.log(`\n✅ Successfully fetched and categorized real study data!`);
  console.log(`\nNote: The fake sample data claims "8 human RCTs, 45 animal studies"`);
  console.log(`      Real data shows different numbers - we need to run full analysis on all ${pmids.length} studies\n`);
}

main().catch(console.error);
