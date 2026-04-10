# Page Tree

A Contentful app that adds parent/child hierarchy across **multiple content types**, computes full URL paths, and provides a unified visual site tree for editors.

---

## What it does

### Content model

Each participating content type needs three fields:

| Field | Type | Purpose |
|---|---|---|
| `parent` | Link → Entry (any configured type) | Points to this page's parent in the hierarchy |
| `fullPath` | Symbol (max 512 chars) | Stores the computed URL path, e.g. `/articles/my-post` |
| `slug` | Symbol | The URL segment for this entry |

Both `parent` and `fullPath` should be `localized: false` — tree logic requires a single shared parent reference across all locales.

**Cross-type linking:** A blog post entry can have a landing page entry as its parent (e.g. the "Articles" landing page at `/articles` is the parent of blog post `/articles/my-post`). The `parent` field validation should accept entries of **all** configured content types.

### Multi-type example

```
/ (home — landingPage)
├── /articles (landingPage)
│   ├── /articles/my-first-post (blogPost)
│   └── /articles/another-post (blogPost)
├── /products (landingPage)
│   └── /products/widget (productPage)
└── /about (landingPage)
```

### Locations

| Location | What it does |
|---|---|
| **Home** | Dashboard widget. Shows stats (total pages across all types, published/draft/changed counts, max depth, orphans) and a full nested site tree. |
| **App Config** | Installation settings — configure **multiple content types**, each with their own field names, plus locale, home slug, and site base URL. |
| **Entry Sidebar** | Per-entry widget. Detects the current entry's content type and uses the correct field names. Shows full path, breadcrumb, parent, and "Change parent" button. The parent picker shows entries from **all** configured types. |
| **Entry Editor** | Full-width editor tab. Shows the unified tree with the current entry highlighted. Row actions: Edit, Add child, Move, View live. |
| **Page** | Full-screen standalone tree. Search, expand/collapse, new page button. |
| **Dialog** | Parent picker. Excludes the current entry and its descendants to prevent cycles. Shows entries from all configured types, searchable. |

### Frontend routing
A catch-all Next.js route at `app/(site)/[locale]/[...path]/page.tsx` handles nested URLs:

1. Queries Contentful by `fields.fullPath` (e.g. `/articles/my-post`)
2. Falls back to `fields.slug` on the last segment for pages where `fullPath` hasn't been written yet
3. Single-segment URLs (`/about`) continue to hit the existing `[locale]/[slug]` route unchanged

---

## Configuration

### Installation parameters (App Config screen)

The config screen lets you define **multiple content types** that participate in the tree:

| Field | Default | Description |
|---|---|---|
| **Content Types** | `[{ contentTypeId: "landingPage", ... }]` | Array of content types. Each has its own field name mappings. |

Per content type:

| Field | Default | Description |
|---|---|---|
| **Content Type ID** | `landingPage` | The content type ID (e.g. `blogPost`, `productPage`) |
| **Parent Field** | `parent` | Field ID for the parent entry link |
| **Slug Field** | `slug` | Field ID for the URL slug segment |
| **Full Path Field** | `fullPath` | Field ID where the computed path is written |

Global settings:

| Field | Default | Description |
|---|---|---|
| **Locale** | `en-US` | Locale used when reading field values via CMA |
| **Site Base URL** | _(empty)_ | Optional. Enables "View live" links in the tree |
| **Home Slug** | `home` | The slug value that maps to `/` (root) |

### Backward compatibility

Existing single-type installations are automatically migrated. The legacy `contentTypeId`, `parentFieldName`, `fullPathFieldName`, and `slugFieldName` fields are normalized into a single-entry `contentTypes[]` array on read.

### Environment variables

```bash
# Required — used by /api/page-tree/entries and /api/page-tree/set-parent
CONTENTFUL_MANAGEMENT_TOKEN=your_cma_token

# Already present in the project — used to identify the space/environment
NEXT_PUBLIC_CTF_SPACE_ID=your_space_id
NEXT_PUBLIC_CTF_ENVIRONMENT=master

# Optional — used by the sitemap script
SITE_BASE_URL=https://your-site.com
```

---

## Setup guide

### 1. Content model

For **each** content type you want in the tree, add:

- `parent`: Link → Entry, validation `linkContentType: ["landingPage", "blogPost", ...]` (list all participating types), localized: false, required: false
- `fullPath`: Symbol, max 512 chars, localized: false, required: false
- `slug`: Symbol (likely already exists)

### 2. Create the app definition
1. Contentful → **Apps** → **Manage apps** → **Create app**
2. Name: `Page Tree`
3. App URL: `http://localhost:3000/ctf-apps/page-tree` (dev) or your deployed URL
4. Enable locations: **App configuration**, **Home**, **Entry sidebar**, **Entry editor**, **Page**, **Dialog**
5. Save

### 3. Install the app
1. In the app definition click **Install to environment** → select your environment
2. Fill in the App Config screen — add all content types that should appear in the tree
3. Click **Save**

### 4. Add the sidebar to each content type
For **each** configured content type:
1. **Content model** → select the type → **Appearance** tab (or Sidebar tab)
2. Under Sidebar widgets → **Add widget** → select **Page Tree**
3. Save

### 5. Add the editor tab (optional, per type)
1. **Content model** → select the type → **Appearance** tab
2. Under Editor tabs → **Add tab** → select **Page Tree**
3. Save

### 6. Verify
- Open an entry of any configured type — the sidebar should show the current path and "Change parent"
- Click "Change parent" — the picker should list entries from **all** configured types
- Pick a parent from a different content type (e.g. set a blog post's parent to a landing page)
- Both `parent` and `fullPath` fields should update
- Open the Page view — the unified tree should show entries from all types

---

## API routes

| Route | Method | Description |
|---|---|---|
| `/api/page-tree/entries` | GET | Returns entries from all specified content types as a flat `PageTreeEntry[]`. Query params: `contentTypeIds` (comma-separated), `locale`, `fieldMappings` (JSON). Legacy `contentTypeId` (singular) still works. |
| `/api/page-tree/set-parent` | POST | Sets the `parent` field and recomputes `fullPath`. Body: `{ entryId, parentId, locale, parentFieldName?, fullPathFieldName?, slugFieldName? }` |

---

## Sitemap

```bash
npm run sitemap
```

Generates `public/sitemap.xml` from published entries. Uses `fullPath` if set, otherwise computes from parent chain. Skips cycle-detected entries.

---

## File structure

```
app/ctf-apps/page-tree/
  page.tsx                        # SDKProvider shell
  layout.tsx                      # Passthrough layout
  manifest.json                   # App definition locations
  types.ts                        # Shared types (ContentTypeConfig, PageTreeEntry, etc.)
  constants.ts                    # Defaults and badge colours
  utils.ts                        # resolveContentTypes, buildTree, computeFullPath, etc.
  components/
    the-app.tsx                   # Routes by sdk.location.is(...)
  locations/
    config-screen.tsx             # LOCATION_APP_CONFIG — multi-type config UI
    page-tree-home.tsx            # LOCATION_HOME — stats dashboard + tree
    page-tree-page.tsx            # LOCATION_PAGE — full-screen tree
    page-tree-editor.tsx          # LOCATION_ENTRY_EDITOR — nested tree tab
    page-tree-sidebar.tsx         # LOCATION_ENTRY_SIDEBAR — path + parent picker
    parent-picker-dialog.tsx      # LOCATION_DIALOG — parent selection

app/api/page-tree/
  entries/route.ts                # GET — fetch entries from multiple types via CMA
  set-parent/route.ts             # POST — write parent + fullPath via CMA

app/(site)/[locale]/[...path]/
  page.tsx                        # Catch-all for nested fullPath URLs

scripts/
  generate-sitemap.mjs            # npm run sitemap
```
