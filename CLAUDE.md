# Neumann Project — Dev Rules

## Contentful Live Preview: useContentfulLiveUpdates

**Never pass a fully-resolved Contentful entry directly to `useContentfulLiveUpdates`.**

The project fetches pages with `include: 6`, meaning entries contain 6 levels of nested linked entries. `useContentfulLiveUpdates` uses lodash `isEqual` to diff old vs. new data on every update — passing a deeply-nested entry causes a "Maximum call stack size exceeded" RangeError.

### Rule: always shallow the entry before passing to `useContentfulLiveUpdates`

**For page-level components** (landing page, campaign page, blog page) that own a `sections` / `items` array of linked entries, strip nested linked entries from each child before passing to the hook. Keep only scalar fields and `sys` stubs for links:

```tsx
// WRONG — blows the call stack with include:6 data
const entry = useContentfulLiveUpdates(publishedEntry);

// CORRECT — strip linked entries from sections, keep scalars
function shallowSection(s: any): any {
  if (!s?.sys?.id || !s?.fields) return s;
  const shallowFields: Record<string, any> = {};
  for (const [k, v] of Object.entries(s.fields)) {
    if (Array.isArray(v)) {
      shallowFields[k] = (v as any[]).map((item) =>
        item?.sys?.type === "Entry" || item?.sys?.contentType
          ? { sys: item.sys }
          : item
      );
    } else if (v && typeof v === "object" && ((v as any).sys?.type === "Entry" || (v as any).sys?.contentType)) {
      shallowFields[k] = { sys: (v as any).sys };
    } else {
      shallowFields[k] = v;
    }
  }
  return { sys: s.sys, fields: shallowFields };
}

const shallowEntry = {
  sys: publishedEntry.sys,
  fields: { ...publishedEntry.fields, sections: publishedEntry.fields.sections?.map(shallowSection) },
} as unknown as IMyType;
const liveEntry = useContentfulLiveUpdates(shallowEntry) ?? publishedEntry;
```

After getting `liveEntry`, **merge** live changes back with the original fully-resolved data. Build a deep map of every entry in the server-fetched tree, then use it to resolve bare sys stubs that live preview returns for linked entries:

```tsx
// Index every resolved entry in the server-fetched tree by sys.id.
// Only recurses into arrays and entry `fields` — NOT into arbitrary object values —
// to avoid stack overflow from deeply nested or prototype-chained objects.
function buildResolvedMap(node: any, map: Map<string, any>) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) buildResolvedMap(item, map);
    return;
  }
  if (node.sys?.id && node.fields) {
    if (map.has(node.sys.id)) return; // already visited
    map.set(node.sys.id, node);
    for (const v of Object.values(node.fields as object)) buildResolvedMap(v, map);
  }
}

// Resolve a live value: fill bare stubs from the map, recurse into arrays
function resolveValue(v: any, resolvedById: Map<string, any>): any {
  if (Array.isArray(v)) return v.map((item) => resolveValue(item, resolvedById));
  if (v && typeof v === "object" && v.sys?.id && !v.fields) return resolvedById.get(v.sys.id) ?? v;
  return v;
}

const resolvedById = new Map<string, any>();
buildResolvedMap(publishedEntry, resolvedById);

const sections = liveEntry.fields.sections.map((liveSection) => {
  const original = resolvedById.get(liveSection.sys.id);
  if (!original) return liveSection;
  const mergedFields = { ...original.fields };
  for (const [k, v] of Object.entries(liveSection.fields ?? {})) {
    mergedFields[k] = resolveValue(v, resolvedById); // resolves stubs, keeps scalars
  }
  return { ...original, fields: mergedFields };
});
```

This correctly handles: scalar edits (headline, body), new buttons added (stubs resolved from map), array reordering, and section additions.

**For section-level wrapper components** (multiItemModule, richContentModule, etc.) that receive a single entry with potentially deep JSON fields (e.g. `externalAuctionId` snapshots), pass only `{ sys, fields }`:

```tsx
// CORRECT
const liveEntry = useContentfulLiveUpdates({ sys: rawEntry.sys, fields: rawEntry.fields } as typeof rawEntry);
const entry = liveEntry ?? rawEntry;
```

### Reference implementations
- Page level: `features/contentful/components/contentful-landing-page.tsx`
- Section level: `features/contentful/components/multi-item-module/multi-item-module-wrapper.tsx`

---

## Adding new content types to button targets

When a content type is added as a valid `target` in the `baseButton` Contentful field:

1. Add it to the `IBaseButton.fields.target` union in `features/contentful/type.ts`
2. Add a URL-building case to `extractUrlFromTarget` in `lib/utils.ts`
3. Add it to the function's parameter type union in `lib/utils.ts`

Current target content types: `externalLink`, `landingPage`, `blogPost`, `categoryPage`, `productStory`, `pmsProperty`, `productCategory`, `campaign`, `kbArticle`, `auction`, `lotReference`

---

## Project conventions

- All Contentful types live in `features/contentful/type.ts` — single source of truth
- Section component map: `features/contentful/component-maps/sections.ts`
- URL building for internal paths: `extractUrlFromTarget` in `lib/utils.ts`
- Locale-aware path prefix: `localizeInternalPath` in `lib/utils.ts`
- Default locale (`en-US`) uses clean URLs (no prefix); others are prefixed (e.g. `/da/...`)

---

## Contentful space & environment

**Never hardcode a Contentful environment.** The environment is configuration, not a constant — the same codebase is pointed at different demo environments.

- Space and environment come from env vars: `NEXT_PUBLIC_CTF_SPACE_ID` and `NEXT_PUBLIC_CTF_ENVIRONMENT` (see `.env`)
- `lib/contentful.ts` exports `DEFAULT_CTF_ENVIRONMENT` — the single resolved value (`NEXT_PUBLIC_CTF_ENVIRONMENT || "master"`). Import it instead of re-reading the env var or writing a literal
- `getEntriesInEnvironment({ options, isPreviewEnabled, environment? })` — `environment` is an **optional** override; omit it to use the configured environment
- For a request-scoped environment override (env switcher / preview), use `getClientForEnvironment({ environment, preview })` in `lib/contentful.ts` — do not create ad-hoc `createClient` calls
- When writing to Contentful via the MCP tools, resolve the target environment first (`list_environments`) rather than assuming a name. Note the MCP token may only authorize one environment, and `master` is often an **alias** pointing at the real environment

A hardcoded environment breaks `next build`, not just runtime: if the token cannot
reach the pinned environment, page-data collection for that route fails and the whole
build aborts. The two auction routes used to pin `environment: "christies"` this way
and did exactly that — both now use the configured environment.
