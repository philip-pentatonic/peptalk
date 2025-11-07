# Retention Features Implementation Status

Foundation phase for Tier 1 retention features (from RETENTION_STRATEGY.md).

## ✅ Completed (Backend Foundation)

### 1. Database Schema (Migration 0005)

Created comprehensive schema for user features:

**User Peptide Tracking:**
- `user_peptides` - Save/track peptides (saved, using, tried)
- `user_journal` - Private research notes and observations
- `user_alerts` - Notification preferences per peptide

**News Feed System:**
- `peptide_news` - News items (studies, trials, FDA, trending)
- `user_news_read` - Track which news items users have read

**Trending/Metrics:**
- `peptide_metrics` - View counts, search counts, save counts
- `peptide_metrics_daily` - Daily snapshots for trending calculations

**Sample Data:**
- 2 news items (BPC-157 trial, Semaglutide FDA approval)
- Metrics for 4 peptides (BPC-157, Semaglutide, CJC-1295, Ipamorelin)

**Location:** `packages/database/migrations/0005-user-features.sql`

### 2. API Endpoints

**Dashboard Endpoints** (`/api/dashboard/*`):
- `GET /peptides` - Get user's saved/using/tried peptides
- `POST /peptides` - Save/update a peptide for user
- `DELETE /peptides/:slug` - Remove peptide from user's list
- `GET /journal` - Get journal entries (optionally filtered by peptide)
- `POST /journal` - Create journal entry
- `PUT /journal/:id` - Update journal entry
- `DELETE /journal/:id` - Delete journal entry
- `GET /alerts` - Get alert preferences
- `POST /alerts` - Update alert preference
- `GET /summary` - Get dashboard summary (counts for all sections)

**News Feed Endpoints** (`/api/news/*`):
- `GET /` - Get news feed (filter by type, peptide)
- `GET /:id` - Get single news item
- `POST /:id/read` - Mark news item as read
- `GET /my-peptides` - Get news for user's saved peptides
- `GET /trending` - Get trending peptides (7d or 30d)
- `GET /latest` - Get latest news summary (for homepage)
- `POST /track/view/:slug` - Track peptide view (for metrics)
- `POST /track/search/:slug` - Track peptide search (for metrics)

**Internal Endpoints** (`/api/internal/*`):
- `POST /news` - Create news item (for daily monitor script)

**Location:**
- `apps/workers/src/routes/dashboard.ts`
- `apps/workers/src/routes/news.ts`
- `apps/workers/src/routes/internal.ts` (news endpoint added)
- `apps/workers/src/index.ts` (routes registered)

### 3. Daily Study Monitor Script

Automated script for discovering new research and creating news items.

**Features:**
- Searches PubMed for new studies (last 24 hours)
- Checks ClinicalTrials.gov for trial updates (last 7 days)
- Creates news items in database via internal API
- Runs for all peptides in the platform
- Rate-limited and respectful of API quotas

**Usage:**
```bash
# Set environment variables
export API_URL=https://peptalk-api.polished-glitter-23bb.workers.dev
export INTERNAL_API_SECRET=your-secret
export PUBMED_API_KEY=your-key
export PUBMED_EMAIL=your@email.com

# Run manually
npx tsx scripts/daily-study-monitor.ts

# Or via cron (recommended: daily at 6am)
0 6 * * * cd /path/to/peptalk && npx tsx scripts/daily-study-monitor.ts
```

**Output:**
- Logs discovery of new studies and trials
- Creates news items with proper categorization
- Provides summary of discoveries

**Location:** `scripts/daily-study-monitor.ts`

## 📋 Next Steps (Frontend Implementation)

To complete Tier 1 retention features, the following frontend work is needed:

### 1. News Feed Page
**Path:** `/news` or homepage section

**Components to Build:**
- News list with infinite scroll
- Filter by type (studies, trials, FDA, trending)
- Filter by peptide
- "Read/Unread" status indicators
- Click to expand full news item
- Links to source (PubMed, ClinicalTrials.gov)

**API Integration:**
```typescript
// Get latest news
const response = await fetch('/api/news/latest?limit=5')

// Get news for my peptides (requires auth)
const response = await fetch('/api/news/my-peptides?userId=xxx')

// Mark as read
await fetch('/api/news/:id/read?userId=xxx', { method: 'POST' })
```

### 2. User Dashboard Page
**Path:** `/dashboard` (requires authentication)

**Sections:**
1. **Summary Cards**
   - X peptides saved
   - X currently using
   - X tried
   - X journal entries
   - X active alerts

2. **My Peptides** (Tabs: Saved | Using | Tried)
   - List of peptides with status
   - Quick actions: Move to using, Add notes, Remove
   - Click to see full peptide page

3. **Research Journal**
   - List of journal entries
   - Filter by peptide
   - Add/Edit/Delete entries
   - Rich text editor for notes

4. **Alert Preferences**
   - List of saved peptides
   - Toggle alerts per peptide (new studies, trials, FDA news)
   - Email notification preferences

**API Integration:**
```typescript
// Get summary
const summary = await fetch('/api/dashboard/summary?userId=xxx')

// Get saved peptides
const peptides = await fetch('/api/dashboard/peptides?userId=xxx&status=saved')

// Save a peptide
await fetch('/api/dashboard/peptides?userId=xxx', {
  method: 'POST',
  body: JSON.stringify({
    peptideSlug: 'bpc-157',
    status: 'saved',
    notes: 'Interested for injury recovery'
  })
})

// Get journal
const journal = await fetch('/api/dashboard/journal?userId=xxx')

// Create journal entry
await fetch('/api/dashboard/journal?userId=xxx', {
  method: 'POST',
  body: JSON.stringify({
    peptideSlug: 'bpc-157',
    title: 'Week 1 Progress',
    content: 'Starting to feel improvements...'
  })
})
```

### 3. Peptide Page Enhancements

Add "Save to Dashboard" button to each peptide page:

```typescript
// components/SavePeptideButton.tsx
const SavePeptideButton = ({ peptideSlug, userId }) => {
  const handleSave = async (status: 'saved' | 'using' | 'tried') => {
    await fetch('/api/dashboard/peptides?userId=' + userId, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ peptideSlug, status })
    })
  }

  return (
    <div>
      <button onClick={() => handleSave('saved')}>Save for Later</button>
      <button onClick={() => handleSave('using')}>Currently Using</button>
      <button onClick={() => handleSave('tried')}>Mark as Tried</button>
    </div>
  )
}
```

Also track views:
```typescript
// When peptide page loads
useEffect(() => {
  fetch(`/api/news/track/view/${peptideSlug}`, { method: 'POST' })
}, [peptideSlug])
```

### 4. Homepage Updates

Add sections:
- **Latest News** (5 most recent items)
- **Trending Peptides** (top 10 by engagement)
- Call-to-action for dashboard features

```typescript
// Get trending
const trending = await fetch('/api/news/trending?period=7d&limit=10')

// Get latest news
const latest = await fetch('/api/news/latest?limit=5')
```

## 🔧 Configuration Required

### Environment Variables (Production)

The following secrets need to be set in Cloudflare Workers for the daily monitor:

```bash
# For daily study monitor (if run as Worker cron)
wrangler secret put PUBMED_API_KEY
wrangler secret put PUBMED_EMAIL
wrangler secret put INTERNAL_API_SECRET  # Already set
```

### Cron Setup Options

**Option 1: External Cron (Recommended)**
Run `scripts/daily-study-monitor.ts` via external cron service (e.g., GitHub Actions, cron job on server).

**Option 2: Cloudflare Workers Cron**
Add to `wrangler.toml`:
```toml
[triggers]
crons = [
  "0 0 * * SUN",  # Existing weekly peptide update
  "0 6 * * *"     # New: Daily study monitor at 6am
]
```

Then update scheduled handler in `apps/workers/src/index.ts` to route to daily monitor.

### Database Migration (Production)

The migration has been run on the **local** database successfully. To run on **remote** production database, you'll need a Cloudflare API token with D1 write permissions:

```bash
# Get a token with D1:Edit permissions from Cloudflare dashboard
# Then run:
CLOUDFLARE_API_TOKEN=your-token-with-d1-permissions \
  wrangler d1 execute peptalk-db \
  --file=packages/database/migrations/0005-user-features.sql \
  --remote
```

Or manually run the SQL in Cloudflare dashboard D1 console.

## 📊 Success Metrics

Once frontend is complete, track these metrics (from RETENTION_STRATEGY.md):

**Week 1 Goal:**
- 70% of users save at least 1 peptide

**Month 1 Goal:**
- Dashboard feature adoption
- News feed engagement
- Alert signup rate

**Ongoing:**
- 7-day retention
- 30-day retention
- Daily active users (DAU)
- News item click-through rate

## 🎯 Feature Priorities

**This Week:**
1. ✅ Backend APIs (DONE)
2. ✅ Database schema (DONE)
3. ✅ Daily study monitor (DONE)
4. 🔲 News feed page (Next)
5. 🔲 Dashboard page basics (Next)

**Next Week:**
1. Dashboard full features (journal, alerts)
2. Peptide page save buttons
3. Homepage trending/latest sections

**Week 3:**
1. Run daily monitor in production
2. Polish UI/UX
3. Email notification system (if desired)
4. Analytics tracking

## 📝 API Examples for Testing

### Save a Peptide
```bash
curl -X POST "https://peptalk-api.polished-glitter-23bb.workers.dev/api/dashboard/peptides?userId=test-user-1" \
  -H "Content-Type: application/json" \
  -d '{
    "peptideSlug": "bpc-157",
    "status": "saved",
    "notes": "Interested for injury recovery"
  }'
```

### Get News Feed
```bash
curl "https://peptalk-api.polished-glitter-23bb.workers.dev/api/news?limit=10"
```

### Get Trending Peptides
```bash
curl "https://peptalk-api.polished-glitter-23bb.workers.dev/api/news/trending?period=7d&limit=10"
```

### Create Journal Entry
```bash
curl -X POST "https://peptalk-api.polished-glitter-23bb.workers.dev/api/dashboard/journal?userId=test-user-1" \
  -H "Content-Type: application/json" \
  -d '{
    "peptideSlug": "bpc-157",
    "title": "Week 1 Progress",
    "content": "Starting to notice improvements in recovery time..."
  }'
```

## 🚀 Ready for Frontend Development

All backend infrastructure is complete and ready for frontend integration:

- ✅ Database schema with sample data
- ✅ Complete RESTful API
- ✅ Automated content discovery
- ✅ Metrics tracking system
- ✅ News feed system

The foundation is solid - now it's time to build the user-facing components to deliver the retention value described in RETENTION_STRATEGY.md.
