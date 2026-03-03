/**
 * Locale-based publish / unpublish with reference traversal.
 *
 * Policy A:
 *   - publish  → publishes the entry + referenced entries & assets (bounded depth)
 *             → only the specified locales are published (not all)
 *   - unpublish → unpublishes only the target entry, only the specified locales
 *
 * IMPORTANT: The standard contentful-management SDK `entry.publish()` publishes
 * ALL locales. To publish only specific locales we must use the CMA REST API
 * directly with the locale-based publishing body format:
 *
 *   Publish locales:
 *     PUT /spaces/{s}/environments/{e}/entries/{id}/published
 *     body: { "add": { "fields": { "*": ["en-US", "de"] } } }
 *
 *   Unpublish locales:
 *     PUT /spaces/{s}/environments/{e}/entries/{id}/published
 *     body: { "remove": { "fields": { "*": ["en-US", "de"] } } }
 *
 * Same pattern applies to assets.
 * Each call requires `X-Contentful-Version` header (optimistic locking).
 */

import type { PlainClientAPI } from "contentful-management";
import { getCmaToken } from "./cma-client";

const MAX_DEPTH = 3;
const LOG_PREFIX = "[SidebarScheduler:publish]";
const CMA_BASE = "https://api.contentful.com";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PublishResult {
  ok: boolean;
  publishedEntries: string[];
  publishedAssets: string[];
  errors: Array<{ id: string; type: "Entry" | "Asset"; error: string }>;
}

interface LinkRef {
  id: string;
  type: "Entry" | "Asset";
}

// ---------------------------------------------------------------------------
// Low-level CMA REST helpers for locale-based publish/unpublish
// ---------------------------------------------------------------------------

/**
 * Publish specific locales of an entry via CMA REST API.
 * Uses the locale-based publishing body: { "add": { "fields": { "*": locales } } }
 */
async function cmaPublishEntryLocales(
  token: string,
  spaceId: string,
  environmentId: string,
  entryId: string,
  version: number,
  locales: string[],
): Promise<void> {
  const url = `${CMA_BASE}/spaces/${spaceId}/environments/${environmentId}/entries/${entryId}/published`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/vnd.contentful.management.v1+json",
      "X-Contentful-Version": String(version),
    },
    body: JSON.stringify({ add: { fields: { "*": locales } } }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`CMA publish entry ${entryId} locales=[${locales}] failed (${res.status}): ${body}`);
  }
}

/**
 * Unpublish specific locales of an entry via CMA REST API.
 * Uses the locale-based publishing body: { "remove": { "fields": { "*": locales } } }
 */
async function cmaUnpublishEntryLocales(
  token: string,
  spaceId: string,
  environmentId: string,
  entryId: string,
  version: number,
  locales: string[],
): Promise<void> {
  const url = `${CMA_BASE}/spaces/${spaceId}/environments/${environmentId}/entries/${entryId}/published`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/vnd.contentful.management.v1+json",
      "X-Contentful-Version": String(version),
    },
    body: JSON.stringify({ remove: { fields: { "*": locales } } }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`CMA unpublish entry ${entryId} locales=[${locales}] failed (${res.status}): ${body}`);
  }
}

/**
 * Publish specific locales of an asset via CMA REST API.
 * Uses the locale-based publishing body: { "add": { "fields": { "*": locales } } }
 */
async function cmaPublishAssetLocales(
  token: string,
  spaceId: string,
  environmentId: string,
  assetId: string,
  version: number,
  locales: string[],
): Promise<void> {
  const url = `${CMA_BASE}/spaces/${spaceId}/environments/${environmentId}/assets/${assetId}/published`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/vnd.contentful.management.v1+json",
      "X-Contentful-Version": String(version),
    },
    body: JSON.stringify({ add: { fields: { "*": locales } } }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`CMA publish asset ${assetId} locales=[${locales}] failed (${res.status}): ${body}`);
  }
}

// ---------------------------------------------------------------------------
// Link extraction & reference traversal (unchanged)
// ---------------------------------------------------------------------------

/**
 * Extract all Entry and Asset link references from an entry's fields,
 * scoped to the given locales only.
 */
function extractLinks(
  fields: Record<string, Record<string, unknown>>,
  locales: string[],
): LinkRef[] {
  const refs: LinkRef[] = [];
  const seen = new Set<string>();

  function walk(value: unknown): void {
    if (!value || typeof value !== "object") return;

    if (Array.isArray(value)) {
      for (const item of value) walk(item);
      return;
    }

    const obj = value as Record<string, unknown>;

    // Contentful link shape: { sys: { type: "Link", linkType: "Entry"|"Asset", id: "..." } }
    const sys = obj.sys as Record<string, unknown> | undefined;
    if (sys && sys.type === "Link" && typeof sys.id === "string") {
      const linkType = sys.linkType as string;
      if ((linkType === "Entry" || linkType === "Asset") && !seen.has(sys.id as string)) {
        seen.add(sys.id as string);
        refs.push({ id: sys.id as string, type: linkType });
      }
      return;
    }

    // Rich-text content nodes may contain embedded entries/assets
    if (obj.nodeType && Array.isArray(obj.content)) {
      // Check data.target for embedded entries/assets
      const data = obj.data as Record<string, unknown> | undefined;
      if (data?.target) walk(data.target);
      for (const child of obj.content as unknown[]) walk(child);
      return;
    }

    // Generic object – recurse values
    for (const v of Object.values(obj)) walk(v);
  }

  for (const fieldId of Object.keys(fields)) {
    const fieldLocales = fields[fieldId];
    if (!fieldLocales || typeof fieldLocales !== "object") continue;
    for (const locale of locales) {
      const localeValue = fieldLocales[locale];
      if (localeValue !== undefined) walk(localeValue);
    }
  }

  return refs;
}

/**
 * Recursively collect all entry and asset IDs reachable from `entryId`,
 * scoped to the specified locales, up to MAX_DEPTH.
 */
async function collectReferences(
  cma: PlainClientAPI,
  spaceId: string,
  environmentId: string,
  entryId: string,
  locales: string[],
): Promise<{ entryIds: string[]; assetIds: string[] }> {
  const visitedEntries = new Set<string>();
  const visitedAssets = new Set<string>();

  async function traverse(id: string, depth: number): Promise<void> {
    if (depth > MAX_DEPTH) return;
    if (visitedEntries.has(id)) return;
    visitedEntries.add(id);

    try {
      const entry = await cma.entry.get({ spaceId, environmentId, entryId: id });
      const links = extractLinks(entry.fields, locales);

      for (const link of links) {
        if (link.type === "Asset") {
          visitedAssets.add(link.id);
        } else if (link.type === "Entry" && !visitedEntries.has(link.id)) {
          await traverse(link.id, depth + 1);
        }
      }
    } catch (err) {
      // Entry might be deleted / inaccessible – skip silently
      console.warn(`${LOG_PREFIX} Could not fetch entry ${id}: ${err}`);
    }
  }

  await traverse(entryId, 0);

  // Remove the root entry from the set (we publish it separately to report order)
  visitedEntries.delete(entryId);

  return {
    entryIds: Array.from(visitedEntries),
    assetIds: Array.from(visitedAssets),
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Publish an entry (and optionally its references) for the given locales ONLY.
 *
 * Uses direct CMA REST calls (not the SDK publish()) to ensure only the
 * specified locales are published, not all locales on the entry.
 */
export async function publishEntryLocales(
  cma: PlainClientAPI,
  spaceId: string,
  environmentId: string,
  entryId: string,
  locales: string[],
  includeReferences: boolean,
): Promise<PublishResult> {
  const token = getCmaToken();
  const result: PublishResult = {
    ok: true,
    publishedEntries: [],
    publishedAssets: [],
    errors: [],
  };

  // 1. Collect references if needed
  let refEntryIds: string[] = [];
  let refAssetIds: string[] = [];

  if (includeReferences) {
    console.log(`${LOG_PREFIX} Collecting references for ${entryId} (maxDepth=${MAX_DEPTH})`);
    const refs = await collectReferences(cma, spaceId, environmentId, entryId, locales);
    refEntryIds = refs.entryIds;
    refAssetIds = refs.assetIds;
    console.log(
      `${LOG_PREFIX} Found ${refEntryIds.length} referenced entries, ${refAssetIds.length} assets`,
    );
  }

  // 2. Publish referenced assets first (they must be published before entries that link to them)
  for (const assetId of refAssetIds) {
    try {
      const asset = await cma.asset.get({ spaceId, environmentId, assetId });
      await cmaPublishAssetLocales(token, spaceId, environmentId, assetId, asset.sys.version, locales);
      result.publishedAssets.push(assetId);
      console.log(`${LOG_PREFIX} Published asset ${assetId} for locales=[${locales}]`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`${LOG_PREFIX} Failed to publish asset ${assetId}: ${msg}`);
      result.errors.push({ id: assetId, type: "Asset", error: msg });
    }
  }

  // 3. Publish referenced entries
  for (const refId of refEntryIds) {
    try {
      const entry = await cma.entry.get({ spaceId, environmentId, entryId: refId });
      await cmaPublishEntryLocales(token, spaceId, environmentId, refId, entry.sys.version, locales);
      result.publishedEntries.push(refId);
      console.log(`${LOG_PREFIX} Published ref entry ${refId} for locales=[${locales}]`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`${LOG_PREFIX} Failed to publish referenced entry ${refId}: ${msg}`);
      result.errors.push({ id: refId, type: "Entry", error: msg });
    }
  }

  // 4. Publish the root entry
  try {
    const rootEntry = await cma.entry.get({ spaceId, environmentId, entryId });
    await cmaPublishEntryLocales(token, spaceId, environmentId, entryId, rootEntry.sys.version, locales);
    result.publishedEntries.unshift(entryId); // root first in the list
    console.log(`${LOG_PREFIX} Published root entry ${entryId} for locales=[${locales}]`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`${LOG_PREFIX} Failed to publish root entry ${entryId}: ${msg}`);
    result.errors.push({ id: entryId, type: "Entry", error: msg });
    result.ok = false; // root failure = overall failure
  }

  if (result.errors.length > 0) {
    result.ok = false;
  }

  return result;
}

/**
 * Unpublish an entry for the given locales ONLY.
 * Policy A: only the target entry is unpublished (no cascade to references).
 *
 * Uses direct CMA REST call (not the SDK unpublish()) to ensure only the
 * specified locales are unpublished, not all locales on the entry.
 */
export async function unpublishEntryLocales(
  cma: PlainClientAPI,
  spaceId: string,
  environmentId: string,
  entryId: string,
  locales: string[],
): Promise<PublishResult> {
  const token = getCmaToken();
  const result: PublishResult = {
    ok: true,
    publishedEntries: [],
    publishedAssets: [],
    errors: [],
  };

  try {
    const entry = await cma.entry.get({ spaceId, environmentId, entryId });
    await cmaUnpublishEntryLocales(token, spaceId, environmentId, entryId, entry.sys.version, locales);
    result.publishedEntries.push(entryId);
    console.log(`${LOG_PREFIX} Unpublished entry ${entryId} for locales=[${locales}]`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`${LOG_PREFIX} Failed to unpublish entry ${entryId}: ${msg}`);
    result.errors.push({ id: entryId, type: "Entry", error: msg });
    result.ok = false;
  }

  return result;
}
