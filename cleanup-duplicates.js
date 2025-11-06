/**
 * Cleanup duplicate BPC-157 entries from production database
 * via the internal API
 */

const PRODUCTION_API = 'https://peptalk-api.polished-glitter-23bb.workers.dev'
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET

if (!INTERNAL_SECRET) {
  console.error('❌ INTERNAL_API_SECRET environment variable not set')
  process.exit(1)
}

const DUPLICATES_TO_DELETE = [
  'test-bpc-157',
  '550e8400-e29b-41d4-a716-446655440001',
  'final-bpc-157',
  'test-final',
  'bpc-157-final',
  'bpc-157-success',
  'bpc-157-100percent'
]

const KEEP = 'bpc-157'

async function deletePeptide(slug) {
  console.log(`🗑️  Deleting ${slug}...`)

  const response = await fetch(`${PRODUCTION_API}/api/internal/peptide/${slug}`, {
    method: 'DELETE',
    headers: {
      'X-Internal-Secret': INTERNAL_SECRET
    }
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to delete ${slug}: ${response.status} ${error}`)
  }

  const result = await response.json()
  console.log(`✅ Deleted ${slug}`)
  return result
}

async function main() {
  console.log('🧹 Starting cleanup of duplicate BPC-157 entries...\n')
  console.log(`Keeping: ${KEEP}`)
  console.log(`Deleting: ${DUPLICATES_TO_DELETE.length} duplicates\n`)

  let deleted = 0
  let failed = 0

  for (const slug of DUPLICATES_TO_DELETE) {
    try {
      await deletePeptide(slug)
      deleted++
    } catch (error) {
      console.error(`❌ Failed to delete ${slug}:`, error.message)
      failed++
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  console.log('\n📊 Summary:')
  console.log(`✅ Deleted: ${deleted}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`\n✨ Cleanup complete!`)
}

main().catch(error => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
