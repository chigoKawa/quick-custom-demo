# Market Override Helper

A Contentful app that lets editors create market-specific overrides for selected
fields on selected content types, **without** spinning up new locales or
duplicating entries. Overrides are written as a JSON delta into a single
field on the entry (conventionally `marketOverride`). Your frontend resolves
"base content + market overrides" at runtime using a tiny merge function — no
SDK, no special server, no proprietary protocol.

Markets are managed as **Contentful entries** of a configurable `market`
content type — not as inline app config — so editors edit market metadata
(name, flag, locales) the same way they edit any other content.

---

## Table of contents

1. [Quick mental model](#quick-mental-model)
2. [Locations](#locations)
3. [Content model](#content-model)
4. [Stored JSON shape](#stored-json-shape)
5. [App configuration](#app-configuration)
6. [Editor UX](#editor-ux)
7. [Frontend implementation guide (framework-agnostic)](#frontend-implementation-guide-framework-agnostic)
8. [Reference implementations in this repo](#reference-implementations-in-this-repo)
9. [v1 scope](#v1-scope)
10. [Install in Contentful](#install-in-contentful)

---

## Quick mental model

```
┌─────────────────────────────┐         ┌─────────────────────────────┐
│ Entry (default locale)      │         │ Entry (Spanish locale)      │
│ ─────────────────────────── │         │ ─────────────────────────── │
│ headline: "Break it down"   │         │ headline: "Rómpelo"         │
│ marketOverride:             │         │ marketOverride:             │
│   { overrides: {            │         │   { overrides: {            │
│       NG: { headline: ... } │         │       US: { headline: ... } │
│   }}                        │         │   }}                        │
└─────────────────────────────┘         └─────────────────────────────┘
              │                                       │
              │   request:  /market/ng/...            │
              │   locale:   default                   │
              ▼                                       ▼
        merge(base.headline,                    merge(base.headline,
              marketOverride[NG].headline)            marketOverride[US].headline)
              │                                       │
              ▼                                       ▼
        "Break it down" overridden            "Rómpelo" overridden
        by the Nigerian override               by the US override
                                              (US-flavoured Spanish)
```

Two orthogonal axes:

- **Locale** (handled natively by Contentful): the language the field is
  authored in. The override JSON is itself localized, so each locale has its
  own set of market overrides.
- **Market** (handled by this app): a runtime, request-scoped flag. Editors
  pick a market from a controlled list (`market` content type entries) and
  override specific whitelisted fields per market.

This gives you `locale × market` orthogonality for free — "Spanish in the
US market" can differ from "Spanish in general" without forking content.

---

## Locations

| Location      | File                                       | Purpose                                                                        |
| ------------- | ------------------------------------------ | ------------------------------------------------------------------------------ |
| `app-config`  | `locations/config-screen.tsx`              | Admin config: markets, content types, allowed fields, limits, protected fields |
| `entry-field` | `locations/market-override-field.tsx`      | The editor UI mounted on a JSON Object field                                   |

---

## Content model

You add a single field to each content type that should support overrides.

| Field            | Type          | Localized? | Purpose                                          |
| ---------------- | ------------- | ---------- | ------------------------------------------------ |
| `marketOverride` | Object (JSON) | **yes**    | Stores the delta JSON payload (v1 schema)        |

The field can have any ID; mount the app on the field's appearance in the
content type editor. Keeping it localized is critical for the
"Spanish in the US" pattern above.

---

## Stored JSON shape

```json
{
  "version": 1,
  "overrides": {
    "NG": {
      "headline": "Nigeria-specific headline",
      "subCopy": "Locally relevant copy"
    },
    "US": {
      "headline": "US headline"
    }
  }
}
```

- Keys at `overrides.<MARKET_CODE>` correspond to the `code` field of
  `market` entries.
- Each market bucket is a flat map of `fieldId → string`.
- Only field IDs whitelisted for the entry's content type — and that exist
  on the current content model — are accepted.
- Market codes are matched **case-insensitively** by the merge utility so
  `/market/ng/...` URLs match an `NG` override key.

---

## App configuration

The config screen reads every content type in the current Contentful
environment via the CMA and lets the admin:

- Choose the **market content type** (default `market`). On save, the
  installer creates it with the canonical schema if it doesn't exist, or
  tops up missing fields if it does.
- Validate the chosen content type live in the UI — must have a Symbol
  `code` field, a display field, and (optionally) a Link → Asset `flag`
  field.
- Toggle which **content types** participate.
- Per content type, whitelist the **fields** that may be overridden.
  Only Symbol and Text fields are shown (v1 supported types).
- Set a global **protected fields** blacklist (e.g. `slug, internalName`).
- Set hard **limits**: max markets per entry, max overrides per market.

Installation parameters are persisted under `sdk.parameters.installation`
and normalized through `resolveInstallationParameters` in `utils.ts` on
read.

### Canonical `market` content type schema

| Field          | Type                 | Required | Notes                              |
| -------------- | -------------------- | -------- | ---------------------------------- |
| `internalName` | Symbol               | yes      | Unique. Used as displayField.      |
| `code`         | Symbol               | yes      | Unique. Stable key in JSON output. |
| `description`  | Text                 | no       |                                    |
| `locales`      | Array&lt;Symbol&gt;  | no       |                                    |
| `flag`         | Link → Asset (image) | no       | Shown in the picker when present.  |

---

## Editor UX

When an editor opens an entry of a supported content type:

1. The field loads all market entries via CMA, resolving flag asset URLs
   in a single batched fetch.
2. If the content type isn't configured, the field shows a neutral
   "not configured" notice (read-only).
3. If no market entries exist yet, a warning prompts the editor to create
   at least one market entry first.
4. Otherwise:
   - A native Forma36 **Select** lets the editor add a market. Draft
     markets are flagged in the option label.
   - Each added market renders as an **Accordion item** showing flag,
     label, code, and an `n / N` badge for override count.
   - Inside, each overrideable field renders as a native `FormControl`
     row: name + Overriding badge + ✕ icon, input below, base value in
     the help text.
   - If a saved override references a market code that no longer exists
     in Contentful, the section is rendered as an **orphan** with a
     warning badge so the editor can clean it up.
   - All writes go through `validateMarketOverrides` before persisting;
     allowed markets are the live list of `code` values fetched from
     Contentful.

Long-text (`Text`) fields render with a `<Textarea>`; short text (`Symbol`)
renders with a `<TextInput>`. The base value is read from the sibling
field on the current entry in the **same locale** the editor is currently
viewing.

Empty market buckets are stripped on save (`compactMarketOverrides`).
If no overrides remain, the field is cleared with `removeValue()` rather
than saving an empty object.

---

## Frontend implementation guide (framework-agnostic)

You can integrate the override system into any frontend that fetches
Contentful entries — React, Vue, Svelte, plain JS, server-rendered
templates. There is **no required SDK** beyond the merge function.

### The contract

Resolving an entry against a market is one pure function:

```
resolveFieldsForMarket(baseFields, overridesJson, marketCode) -> resolvedFields
```

- **Input**:
  - `baseFields`: the locale-resolved `entry.fields` from the Contentful
    SDK / GraphQL / REST.
  - `overridesJson`: the raw value of the `marketOverride` field.
  - `marketCode`: the active market code (or `null` / `undefined` to
    skip resolution and return the base).
- **Output**: a new `fields` object with overridden values applied. Fields
  not present in the override are returned untouched.

### Reference implementation (TypeScript, ~30 lines)

If you don't want to depend on `@/lib/market-overrides`, drop the
following into your codebase — it's the exact same logic:

```ts
type Overrides = {
  version?: number;
  overrides?: Record<string, Record<string, string>>;
};

export function resolveFieldsForMarket<T extends Record<string, unknown>>(
  baseFields: T,
  overridesJson: unknown,
  marketCode: string | null | undefined
): T {
  if (!marketCode) return baseFields;
  const parsed = parseOverrides(overridesJson);
  const bucket = findBucket(parsed.overrides, marketCode);
  if (!bucket) return baseFields;
  const next: Record<string, unknown> = { ...baseFields };
  for (const [fieldId, value] of Object.entries(bucket)) {
    if (fieldId in next) next[fieldId] = value;
  }
  return next as T;
}

function parseOverrides(raw: unknown): Required<Overrides> {
  if (!raw || typeof raw !== "object") return { version: 1, overrides: {} };
  const r = raw as Overrides;
  return { version: r.version ?? 1, overrides: r.overrides ?? {} };
}

function findBucket(
  o: Record<string, Record<string, string>>,
  key: string
): Record<string, string> | undefined {
  if (o[key]) return o[key];
  const lower = key.toLowerCase();
  for (const [k, v] of Object.entries(o)) {
    if (k.toLowerCase() === lower) return v;
  }
  return undefined;
}
```

### Step 1 — Fetch the entry in the active locale

Use whichever Contentful client you have. Below shows REST (CDA), but the
same applies to the JS SDK, the GraphQL endpoint, or a server-side
language client.

```bash
GET https://cdn.contentful.com/spaces/{space}/environments/{env}/entries
  ?content_type=heroModule
  &locale=es
  &include=6
  &access_token=...
```

You'll get back each entry's fields scoped to the requested locale —
including the `marketOverride` field, because it is itself localized.

### Step 2 — Discover the active market

Pick one of these conventions. The exact mechanism is up to you; the
merge function only needs the resolved code.

| Convention                     | Where it lives                                   |
| ------------------------------ | ------------------------------------------------ |
| **URL segment** (recommended)  | `/market/<code>/...` or `/<locale>/market/<code>/...` |
| **Cookie**                     | `mkt_code=NG`                                    |
| **Subdomain**                  | `ng.example.com`                                 |
| **Geo-IP / Accept-Language**   | Server-side header                               |
| **Manual switcher**            | Client state + localStorage                      |

Whatever you choose:

- Normalize on the **server boundary** so all downstream code reads from
  one place (a header, a server context, etc.).
- Validate against the published `market.code` list so unknown codes
  produce a 404 (or a graceful "no override" fallback).

### Step 3 — Merge on the boundary

For every component that should be overrideable:

```ts
import { resolveFieldsForMarket } from "./market-overrides";

const fields = resolveFieldsForMarket(
  entry.fields,            // locale-resolved base fields
  entry.fields.marketOverride, // raw JSON
  activeMarketCode             // "NG" | null
);

render(fields);
```

Precedence:

1. Market override value if present for `(marketCode, fieldId)`.
2. Base entry field value (in the requested locale).
3. Caller's own fallback (e.g. commerce-API value for product fields).

### Step 4 — Handle SEO

Because market-prefixed URLs serve the same canonical entry with a delta
applied, the variants should not be independently indexed:

```html
<meta name="robots" content="noindex, follow">
```

Set `noindex` whenever a market is active and let the unmarketed URL be
the canonical version. Reference: `app/(site)/[locale]/[slug]/page.tsx`
in this repo.

### Step 5 — Validate unknown codes

When the URL carries `/market/<code>/` but `<code>` isn't in the published
`market.code` list, render a 404. This prevents accidental indexing of
typo'd URLs and keeps fallbacks honest.

```ts
const markets = await fetchPublishedMarketCodes(); // ["NG", "DE", "US", ...]
if (!markets.find(c => c.toLowerCase() === url.marketCode.toLowerCase())) {
  return notFound();
}
```

### Examples by framework

<details>
<summary>Next.js App Router (server component)</summary>

```ts
// app/[locale]/[slug]/page.tsx
import { headers } from "next/headers";
import { createClient } from "contentful";
import { resolveFieldsForMarket } from "./market-overrides";

export default async function Page({ params }) {
  const marketCode = (await headers()).get("x-market-code");
  const entry = await client.getEntries({
    content_type: "heroModule",
    locale: params.locale,
    include: 6,
  }).then(r => r.items[0]);

  const fields = resolveFieldsForMarket(
    entry.fields,
    entry.fields.marketOverride,
    marketCode
  );

  return <Hero {...fields} />;
}
```

</details>

<details>
<summary>Express + React SSR (Node)</summary>

```js
app.get("/market/:code/products/:slug", async (req, res) => {
  const entry = await client.getEntries({
    content_type: "productStory",
    "fields.slug": req.params.slug,
    locale: req.query.locale ?? "en-US",
  }).then(r => r.items[0]);

  const fields = resolveFieldsForMarket(
    entry.fields,
    entry.fields.marketOverride,
    req.params.code
  );

  res.send(renderToString(<ProductStory {...fields} />));
});
```

</details>

<details>
<summary>Astro</summary>

```astro
---
// pages/market/[code]/[slug].astro
import { resolveFieldsForMarket } from "../../../lib/market-overrides";
const entry = await contentful.getEntries({
  content_type: "productStory",
  "fields.slug": Astro.params.slug,
}).then(r => r.items[0]);

const fields = resolveFieldsForMarket(
  entry.fields,
  entry.fields.marketOverride,
  Astro.params.code,
);
---
<h1>{fields.headline}</h1>
```

</details>

<details>
<summary>SvelteKit</summary>

```ts
// src/routes/market/[code]/[slug]/+page.server.ts
import { resolveFieldsForMarket } from "$lib/market-overrides";
export const load = async ({ params }) => {
  const entry = (await client.getEntries({
    content_type: "productStory",
    "fields.slug": params.slug,
  })).items[0];

  return {
    fields: resolveFieldsForMarket(
      entry.fields,
      entry.fields.marketOverride,
      params.code,
    ),
  };
};
```

</details>

<details>
<summary>Plain JS (browser)</summary>

```js
const entry = await fetch(`https://cdn.contentful.com/.../entries/${id}?locale=es`)
  .then(r => r.json());

const marketCode = new URLSearchParams(location.search).get("market");
const fields = resolveFieldsForMarket(
  entry.fields,
  entry.fields.marketOverride,
  marketCode,
);

document.getElementById("headline").textContent = fields.headline;
```

</details>

### Common pitfalls

| Symptom                                          | Likely cause                                                                                  |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Override saved but storefront still shows base   | The fetch isn't passing `locale: <activeLocale>`; the `marketOverride` JSON is locale-scoped. |
| `/market/ng/` doesn't match `NG` in JSON         | Use the case-insensitive merge (`findBucket` above).                                          |
| Live Preview crashes with "Maximum call stack…"  | Don't pass deeply-nested entries to `useContentfulLiveUpdates`. See `CLAUDE.md`.              |
| Editor sees default-locale "Base value"          | Make sure the field editor reads `sdk.field.locale`, not `sdk.locales.default`.               |
| Indexer shows duplicate URLs                     | Set `noindex` on market-prefixed pages.                                                       |

---

## Reference implementations in this repo

These are working examples you can copy from:

| What                  | Where                                                                       |
| --------------------- | --------------------------------------------------------------------------- |
| Per-locale fetching   | `lib/contentful.ts` — `getEntries({ locale })` wrappers                     |
| URL → market header   | `middleware.ts` — strips `/market/<code>` and sets `x-market-code`          |
| Server-side reader    | `lib/market-overrides/server.ts` — `getActiveMarketCode()`                  |
| Client-side context   | `lib/market-overrides/react.tsx` — `MarketProvider`, `useActiveMarket()`    |
| Component integration | `features/contentful/components/hero-module/hero-module-wrapper.tsx`        |
| Product story         | `features/contentful/components/product-story/product-story-page.tsx`      |
| Switcher UI           | `features/market-switcher/market-switcher.tsx` — flag list + hard reload   |
| 404 on invalid codes  | `lib/markets.ts` — `requireValidActiveMarket()`                             |
| SEO `noindex`         | `app/(site)/[locale]/[slug]/page.tsx` — conditional `robots`                |

The Next.js wiring is one possible composition. The same merge function
backs all of it.

---

## v1 scope

### Supported

- Symbol and Text fields
- Manual market selection from a controlled list
- Per-content-type field whitelisting
- Localized overrides (per-locale × per-market)
- Case-insensitive market-code lookup
- Base value display next to override input (in the editing locale)
- CRUD for overrides (add market, override field, edit, delete field, delete market)
- JSON schema validation + hard limits enforced in the UI and on save
- Auto-clean empty market buckets
- Idempotent `market` content type installation

### Deferred

- Rich Text
- References and Assets
- Arrays
- Slug overrides
- Nested component traversal
- Inline effective-value preview (left to the frontend preview experience)
- Bulk edit across entries

---

## File layout

```
app/ctf-apps/market-override-helper/
  layout.tsx                            # passthrough client layout
  page.tsx                              # SDKProvider shell
  manifest.json                         # app-config + entry-field locations
  constants.ts                          # APP_NAME, defaults
  install.ts                            # idempotent market content type installer + validator
  utils.ts                              # resolveInstallationParameters, fetchMarketEntries, getOverrideableFields
  components/
    the-app.tsx                         # routes by sdk.location.is(...)
  locations/
    config-screen.tsx                   # LOCATION_APP_CONFIG — market CT picker, install, content type whitelist
    market-override-field.tsx           # LOCATION_ENTRY_FIELD — flag-based market picker + CRUD
  README.md

lib/market-overrides/
  index.ts                              # public barrel (server-safe)
  server.ts                             # getActiveMarketCode() (Next.js headers)
  react.tsx                             # MarketProvider, useActiveMarket
  types.ts                              # shared types + schema version
  schema.ts                             # parse / validate / compact helpers
  merge.ts                              # resolveFieldForMarket, resolveFieldsForMarket
```

---

## Install in Contentful

1. **Apps → Manage apps → Create app**.
2. Name: `Market Override Helper`.
3. App URL: `http://localhost:3000/ctf-apps/market-override-helper` (dev) or your deployed URL.
4. Enable locations: **App configuration**, **Entry field** (field type: **Object**).
5. **Install to environment** and complete the config screen:
   - Pick or accept the default market content type (`market` is created automatically if missing).
   - Pick which content types accept overrides and whitelist fields per type.
   - Configure limits.
6. Save — the installer runs once and creates / tops-up the market content type.
7. Create at least one entry of the market content type (set `code`, `internalName`, optionally upload a `flag`).
8. For each participating content type, add an `Object` field called `marketOverride` (or any ID), and set it to **localized**.
9. **Content model → field → Appearance** → choose **Market Override Helper**.
10. Open any entry of a configured content type — the field will show the editor UI with your market entries as picker options.
