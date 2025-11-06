# Category System Implementation

## Overview
Added a comprehensive category/tagging system for peptides to allow users to filter and discover peptides by use case (e.g., weight loss, muscle growth, skin health, etc.).

## Database Schema

### New Tables

1. **`categories`** - Stores all available categories
   - `id` (TEXT PRIMARY KEY) - e.g., "cat_weight_loss"
   - `slug` (TEXT UNIQUE) - URL-friendly slug
   - `name` (TEXT) - Display name
   - `description` (TEXT) - Category description
   - `icon` (TEXT) - Emoji or icon identifier
   - `display_order` (INTEGER) - Sort order for display

2. **`peptide_categories`** - Many-to-many junction table
   - `peptide_id` (TEXT) - References `peptides(slug)`
   - `category_id` (TEXT) - References `categories(id)`
   - `confidence` (TEXT) - "high", "medium", or "low" (based on evidence strength)
   - PRIMARY KEY: `(peptide_id, category_id)`

### Seeded Categories

| Slug | Name | Icon | Description |
|------|------|------|-------------|
| `weight-loss` | Weight Loss | ⚖️ | Fat loss, metabolism, body composition |
| `muscle-growth` | Muscle Growth | 💪 | Muscle building, recovery, performance |
| `skin-health` | Skin & Anti-Aging | ✨ | Skin quality, wrinkles, aging |
| `healing` | Healing & Recovery | 🩹 | Wound healing, tissue repair, injury recovery |
| `immune` | Immune Support | 🛡️ | Immune system modulation |
| `cognitive` | Cognitive Function | 🧠 | Brain health, memory, neuroprotection |
| `longevity` | Longevity & Aging | ⏳ | Anti-aging, telomere support, lifespan |
| `joint-bone` | Joint & Bone Health | 🦴 | Cartilage, bone density, joint support |
| `gut-health` | Gut Health | 🫃 | Digestive health, intestinal repair |
| `hormone` | Hormone Support | ⚗️ | Growth hormone, testosterone, hormonal balance |

## API Endpoints

### New Endpoints

1. **`GET /api/categories`** - List all categories
   ```json
   {
     "categories": [
       {
         "id": "cat_weight_loss",
         "slug": "weight-loss",
         "name": "Weight Loss",
         "description": "...",
         "icon": "⚖️",
         "display_order": 1
       }
     ]
   }
   ```

2. **`GET /api/categories/:slug`** - Get category with peptides
   ```json
   {
     "category": { ... },
     "peptides": [ ... ],
     "count": 3
   }
   ```

### Updated Endpoints

**`GET /api/peptides/:slug`** - Now includes categories:
```json
{
  "slug": "bpc-157",
  "name": "BPC-157",
  "categories": [
    {
      "slug": "healing",
      "name": "Healing & Recovery",
      "icon": "🩹",
      "confidence": "high"
    },
    {
      "slug": "gut-health",
      "name": "Gut Health",
      "icon": "🫃",
      "confidence": "high"
    }
  ],
  ...
}
```

## Code Structure

### Database Package
- **`packages/database/src/categories.ts`** - Database operations for categories
- **`packages/database/migrations/0004-categories.sql`** - Schema and seed data

### Workers API
- **`apps/workers/src/routes/categories.ts`** - Category API routes
- **`apps/workers/src/routes/peptides.ts`** - Updated to include categories

## Next Steps

### Frontend Implementation

1. **Peptide Detail Page** (`apps/web/src/app/peptides/[slug]/page.tsx`)
   - Display category badges under peptide name
   - Show confidence level (high/medium/low) with styling
   - Make categories clickable to filter

2. **Peptide List Page** (`apps/web/src/app/peptides/page.tsx`)
   - Add category filter sidebar
   - Show active filter pills
   - Allow multi-select categories

3. **Category Browse Page** (`apps/web/src/app/categories/[slug]/page.tsx`)
   - Dedicated page for each category
   - List all peptides in that category
   - Include category description

### Design Suggestions

**Category Badges:**
```
🩹 Healing & Recovery (High Evidence)
```

**Filter Sidebar:**
```
┌─────────────────────────┐
│ Filter by Use Case      │
├─────────────────────────┤
│ ☑ ⚖️  Weight Loss (3)   │
│ ☐ 💪 Muscle Growth (2)  │
│ ☐ ✨ Skin Health (4)    │
│ ☐ 🩹 Healing (5)        │
└─────────────────────────┘
```

## Database Cleanup

The production database has duplicate BPC-157 entries that need cleanup:
- `test-bpc-157`
- `550e8400-e29b-41d4-a716-446655440001`
- `final-bpc-157`
- `test-final`
- `bpc-157-final`
- `bpc-157-success`
- `bpc-157-100percent`

Keep only: `bpc-157`

Migration file created: `packages/database/migrations/0005-cleanup-duplicates.sql`

## Deployment Status

✅ Database schema created locally
✅ API routes created
✅ Categories seeded
⏳ Need to apply migrations to production database
⏳ Need to deploy Workers API (authentication issue)
⏳ Need to implement frontend components

## Notes

- Confidence levels ("high", "medium", "low") indicate strength of evidence for each use case
- Categories are manually curated for now
- Future: Research pipeline could automatically suggest categories based on study analysis
