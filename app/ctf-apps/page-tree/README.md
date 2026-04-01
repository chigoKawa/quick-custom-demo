# Page Tree

A Contentful app that adds parent/child hierarchy to `landingPage` entries, computes full URL paths, and provides a complete visual site tree for editors.

---

## What it does

### Content model
Two fields are added to the `landingPage` content type:

| Field | Type | Purpose |
|---|---|---|
| `parent` | Link → Entry (`landingPage`) | Points to this page's parent in the hierarchy |
| `fullPath` | Symbol (max 512 chars) | Stores the computed URL path, e.g. `/benefit/careers/roles` |

Both fields are `localized: false` — tree logic requires a single shared parent reference across all locales.

### Locations

| Location | What it does |
|---|---|
| **Home** | Dashboard widget on the Contentful home screen. Shows stats (total pages, published/draft/changed counts, max depth, orphans, missing fullPaths) and a full nested site tree. |
| **App Config** | Installation settings — configure which content type, field names, locale, home slug, and site base URL the app uses. |
| **Entry Sidebar** | Per-entry widget. Shows the computed full path, breadcrumb trail, current parent, and a "Change parent" button that opens the picker dialog. Writes both the `parent` link field and the `fullPath` field on save. |
| **Entry Editor** | Full-width editor tab. Shows the entire nested site tree with the current entry highlighted. Every row has an actions menu: Edit, Add child, Move (change parent), View live. |
| **Page** | Full-screen standalone page view of the tree. Accessible from the Apps nav. Search, expand/collapse all, new page button. |
| **Dialog** | Parent picker. Opens when "Change parent" or "Move" is clicked. Excludes the current entry and all its descendants to prevent cycles. Searchable flat list. |

### Frontend routing
A catch-all Next.js route at `app/(site)/[locale]/[...path]/page.tsx` handles nested URLs:

1. Queries Contentful by `fields.fullPath` (e.g. `/benefit/careers`)
2. Falls back to `fields.slug` on the last segment for pages where `fullPath` hasn't been written yet
3. Single-segment URLs (`/about`) continue to hit the existing `[locale]/[slug]` route unchanged

---

## Configuration

### Installation parameters (App Config screen)

| Field | Default | Description |
|---|---|---|
| **Content Type ID** | `landingPage` | The content type the tree is built from |
| **Parent Field Name** | `parent` | Field ID of the parent entry link |
| **Full Path Field Name** | `fullPath` | Field ID where the computed path is written |
| **Slug Field Name** | `slug` | Field ID for the URL slug segment |
| **Locale** | `en-US` | Locale used when reading field values via CMA |
| **Site Base URL** | _(empty)_ | Optional. Enables "View live" links in the tree, e.g. `https://your-site.com` |
| **Home Slug** | `home` | The slug value that maps to `/` (root). Must match `NEXT_PUBLIC_CTF_HOMEPAGE_SLUG` |

### Environment variables

The app's API routes run server-side and require:

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
The `parent` and `fullPath` fields must exist on `landingPage` before the app is useful. They were added to the `biltema` environment via MCP. For other environments, add them manually:

- `parent`: Link → Entry, validation `linkContentType: ["landingPage"]`, localized: false, required: false
- `fullPath`: Symbol, max 512 chars, localized: false, required: false

### 2. Create the app definition
1. Contentful → **Apps** → **Manage apps** → **Create app**
2. Name: `Page Tree`
3. App URL: `http://localhost:3000/ctf-apps/page-tree` (dev) or your deployed URL
4. Enable locations: **App configuration**, **Home**, **Entry sidebar**, **Entry editor**, **Page**, **Dialog**
5. Save

### 3. Install the app
1. In the app definition click **Install to environment** → select your environment
2. Fill in the App Config screen (see Configuration above)
3. Click **Save**

### 4. Add the sidebar to landingPage
1. **Content model** → **Landing Page** → **Appearance** tab (or Sidebar tab)
2. Under Sidebar widgets → **Add widget** → select **Page Tree**
3. Save

### 5. Add the editor tab to landingPage
1. **Content model** → **Landing Page** → **Appearance** tab
2. Under Editor tabs → **Add tab** → select **Page Tree**
3. Save

### 6. Verify
- Open any `landingPage` entry — the sidebar should show the current path and a "Change parent" button
- Click "Change parent", pick a parent, confirm — both `parent` field and `fullPath` field should update
- Click "View in tree" in the sidebar — the full-screen page tree should open with the entry highlighted
- Open the Home widget from the Contentful home screen — stats and tree should load

---

## API routes

| Route | Method | Description |
|---|---|---|
| `/api/page-tree/entries` | GET | Returns all entries of `contentTypeId` as a flat `PageTreeEntry[]` via CMA (drafts included). Query params: `contentTypeId`, `locale` |
| `/api/page-tree/set-parent` | POST | Sets the `parent` field and recomputes `fullPath` on an entry. Body: `{ entryId, parentId, locale }` |

---

## Sitemap

```bash
npm run sitemap
```

Generates `public/sitemap.xml` from published `landingPage` entries. Uses `fullPath` if set, otherwise computes it from the parent chain. Skips cycle-detected entries. Priority: depth 0 = 1.0, depth 1 = 0.8, depth 2+ = 0.6.

Set `SITE_BASE_URL` in `.env.local` to use your real domain (defaults to `https://example.com`).

---

## File structure

```
app/ctf-apps/page-tree/
  page.tsx                        # SDKProvider shell
  layout.tsx                      # Passthrough layout
  manifest.json                   # App definition locations
  types.ts                        # Shared TypeScript types
  constants.ts                    # Defaults and badge colours
  utils.ts                        # computeFullPath, buildTree, getInitials, fetchWithTimeout
  components/
    the-app.tsx                   # Routes by sdk.location.is(...)
  locations/
    config-screen.tsx             # LOCATION_APP_CONFIG
    page-tree-home.tsx            # LOCATION_HOME — stats dashboard + tree
    page-tree-page.tsx            # LOCATION_PAGE — full-screen tree
    page-tree-editor.tsx          # LOCATION_ENTRY_EDITOR — nested tree tab
    page-tree-sidebar.tsx         # LOCATION_ENTRY_SIDEBAR — path + parent picker
    parent-picker-dialog.tsx      # LOCATION_DIALOG — parent selection

app/api/page-tree/
  entries/route.ts                # GET — fetch all entries via CMA
  set-parent/route.ts             # POST — write parent + fullPath via CMA

app/(site)/[locale]/[...path]/
  page.tsx                        # Catch-all for nested fullPath URLs

scripts/
  generate-sitemap.mjs            # npm run sitemap
```
