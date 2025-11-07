# Peptide Discovery & Processing Tools

Complete toolkit for discovering, cataloging, and processing peptides for the PepTalk platform.

## 📁 Files Created

1. **`peptides-tier1-seed.csv`** - Curated list of 30 high-value peptides to process first
2. **`scripts/discover-peptides.ts`** - Automated discovery script (PubMed, ClinicalTrials.gov, Reddit)
3. **`scripts/batch-process-seeds.ts`** - Batch processor for seed peptides
4. **`PEPTIDE_DISCOVERY_STRATEGY.md`** - Comprehensive discovery strategy document

## 🚀 Quick Start

### 1. Process Tier 1 Seed Peptides (High Priority)

Process the 10 high-priority peptides from the seed list:

```bash
# Set environment variables
export PUBMED_EMAIL="support@machinegenie.ai"
export PUBMED_API_KEY="your-key"
export ANTHROPIC_API_KEY="your-key"
export RESEARCH_API_URL="https://peptalk-research.fly.dev"

# Run batch processor (high priority only)
npx tsx scripts/batch-process-seeds.ts

# Process ALL priorities (high + medium)
npx tsx scripts/batch-process-seeds.ts --all-priorities
```

**This will process:**
- CJC-1295
- Ipamorelin
- Semaglutide
- PT-141
- Semax
- Selank
- MOTS-c
- Cerebrolysin
- Dihexa
- AOD-9604

### 2. Discover New Peptides

Run the automated discovery script to mine databases:

```bash
# Discover from all sources
export PUBMED_API_KEY="your-key"
export PUBMED_EMAIL="support@machinegenie.ai"

npx tsx scripts/discover-peptides.ts
```

**This will:**
- Search PubMed for therapeutic peptides
- Mine ClinicalTrials.gov for peptide trials
- Extract trending peptides from Reddit
- Deduplicate and score all discoveries
- Save results to `discovery-queue.json`

### 3. Review Discovery Queue

After running discovery, review the queue:

```bash
# View the discovery queue
cat discovery-queue.json | jq '.peptides[] | select(.priority == "high") | {name, source, priority, notes}'

# Count by priority
cat discovery-queue.json | jq '.peptides | group_by(.priority) | map({priority: .[0].priority, count: length})'
```

## 📊 Seed List Structure

The `peptides-tier1-seed.csv` contains:

| Column | Description |
|--------|-------------|
| `id` | URL-safe slug identifier |
| `name` | Primary peptide name |
| `aliases` | Alternative names (pipe-separated) |
| `priority` | `completed` \| `high` \| `medium` \| `low` |
| `notes` | Description and usage notes |

**Current Status:**
- ✅ Completed: 5 (BPC-157, TB-500, GHK-Cu, Epithalon, Thymosin Alpha-1)
- 🔥 High Priority: 10 (CJC-1295, Ipamorelin, Semaglutide, etc.)
- 📋 Medium Priority: 15 (Melanotan II, Hexarelin, GHRP-2, etc.)

## 🔍 Discovery Script Features

### Supported Sources

**1. PubMed**
- Searches 6 different query patterns
- Extracts peptide names from titles/abstracts
- Estimates citation counts
- Rate-limited to 10 req/sec

**2. ClinicalTrials.gov**
- Finds trials with peptide interventions
- Extracts phase, status, NCT IDs
- Prioritizes Phase 3+ trials

**3. Reddit**
- Monitors r/Peptides, r/Nootropics, r/Biohacking
- Identifies trending peptides
- Scores by upvotes and comments

### Output Format

`discovery-queue.json`:
```json
{
  "lastUpdated": "2025-01-15T10:30:00Z",
  "totalPeptides": 45,
  "peptides": [
    {
      "name": "NAD+",
      "aliases": ["Nicotinamide Adenine Dinucleotide"],
      "source": "pubmed",
      "citationCount": 150,
      "clinicalTrialCount": 3,
      "firstDiscovered": "2025-01-15T10:30:00Z",
      "priority": "high",
      "notes": "Discovered from PubMed, 150+ citations"
    }
  ]
}
```

## 🎯 Processing Workflow

### Recommended Approach

**Week 1-2: Foundation**
```bash
# Process high-priority seeds
npx tsx scripts/batch-process-seeds.ts

# Result: 10 new peptides added to platform
```

**Week 3: Discovery**
```bash
# Run discovery to find new candidates
npx tsx scripts/discover-peptides.ts

# Review and curate discoveries
# Add high-value peptides to seed list
```

**Week 4: Expansion**
```bash
# Process medium-priority seeds
npx tsx scripts/batch-process-seeds.ts --all-priorities

# Result: 25+ new peptides added
```

**Ongoing: Maintenance**
```bash
# Weekly discovery runs
npx tsx scripts/discover-peptides.ts

# Monthly: Review queue and process new high-priority finds
```

## ⚙️ Configuration

### Environment Variables

```bash
# Required for discovery
PUBMED_API_KEY=your-ncbi-api-key
PUBMED_EMAIL=your@email.com

# Required for processing
ANTHROPIC_API_KEY=your-claude-key
OPENAI_API_KEY=your-openai-key  # For compliance (optional)
RESEARCH_API_URL=https://peptalk-research.fly.dev
```

### Batch Processing Options

```bash
# Default: High priority only, skip completed
npx tsx scripts/batch-process-seeds.ts

# Process all priorities
npx tsx scripts/batch-process-seeds.ts --all-priorities

# Include already-completed peptides (reprocess)
npx tsx scripts/batch-process-seeds.ts --include-completed

# Custom API URL
RESEARCH_API_URL=http://localhost:3002 npx tsx scripts/batch-process-seeds.ts
```

## 📈 Success Metrics

**Coverage Goals:**
- Month 1: 15 peptides (Tier 1 high priority)
- Month 2: 30 peptides (Tier 1 complete)
- Month 3: 50 peptides (+ top discoveries)
- Month 6: 100+ peptides (comprehensive catalog)

**Quality Standards:**
- ✅ Minimum 5 scientific papers per peptide
- ✅ At least 1 clinical trial OR strong preclinical data
- ✅ Evidence grade calculated from research
- ✅ Auto-categorized by AI
- ✅ Compliance-checked content

## 🔧 Troubleshooting

### Rate Limiting

If you hit rate limits:

**PubMed:**
- With API key: 10 requests/second
- Without: 3 requests/second
- Solution: Add delays in discovery script

**Research API:**
- Fly.io has resource limits
- Default: 10-second delay between peptides
- Adjust with `config.delayBetween`

### Failed Processing

Check `batch-results.json` for details:
```bash
cat batch-results.json | jq '.results[] | select(.success == false)'
```

Common issues:
- No studies found → Check peptide name/aliases
- Synthesis failed → API key or rate limits
- Database write failed → Check INTERNAL_API_SECRET

## 📝 Adding New Peptides Manually

To add a peptide not in the seed list:

```bash
curl -X POST https://peptalk-research.fly.dev/process \
  -H "Content-Type: application/json" \
  -d '{
    "peptideId": "new-peptide",
    "name": "New Peptide Name",
    "aliases": ["Alternative Name 1", "Alternative Name 2"],
    "force": false
  }'
```

Or add to `peptides-tier1-seed.csv` and run batch processor.

## 🎓 Next Steps

1. **Run discovery weekly** to find new peptides
2. **Curate high-value discoveries** - add to seed list
3. **Process in batches** - don't overwhelm the API
4. **Monitor quality** - check evidence grades and categories
5. **Update existing peptides** quarterly with new research

## 📚 Related Documentation

- `PEPTIDE_DISCOVERY_STRATEGY.md` - Full strategy document
- `DEPLOYMENT_STATUS.md` - Infrastructure setup
- `packages/research/README.md` - Research pipeline details

---

**Happy Discovering! 🔬**
