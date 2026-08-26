/**
 * Build-time redirect snapshot generator.
 *
 * Writes `lib/redirects.generated.json` in the same `{ generatedAt, redirects }`
 * shape that `app/api/redirects/route.ts` returns, so `lib/redirect-lookup.ts`
 * can seed its module-scope cache from a static import and answer request #1 on a
 * cold Edge isolate without waiting for Contentful.
 *
 * This is a *fallback*, not the source of truth — the live map still comes from
 * `/api/redirects` on a ~60s TTL, so redirects published after the build go live
 * without a redeploy.
 *
 * It deliberately re-implements the logic in `lib/redirects.ts` in plain JS: that
 * file is TypeScript and pulls in the Contentful SDK, neither of which a `.mjs`
 * prebuild script can consume. **Keep the two in sync** — `normalizePath`,
 * the exactly-one-of rules, entry→path resolution, and chain collapsing all have
 * a counterpart there (and `normalizePath` also in `lib/redirect-lookup.ts`).
 *
 * Never fails the build: missing credentials, a CDA outage, or a malformed entry
 * all degrade to an empty (or partial) snapshot with a warning. A broken redirect
 * map must not be able to break `next build` — see the CLAUDE.md note on the
 * prebuild chain aborting the whole build.
 */

import dotenv from "dotenv";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const SPACE = process.env.NEXT_PUBLIC_CTF_SPACE_ID;
const TOKEN = process.env.NEXT_PUBLIC_CTF_DELIVERY_TOKEN;
const ENV = process.env.NEXT_PUBLIC_CTF_ENVIRONMENT || "master";

const OUT_FILE = path.join(process.cwd(), "lib", "redirects.generated.json");

const ALLOWED_STATUS_CODES = new Set([301, 302, 307, 308]);
const DEFAULT_STATUS_CODE = 307;
const MAX_CHAIN_HOPS = 5;

/** Content types that can never be a redirect *source* (no local URL of their own). */
const NON_SOURCE_CONTENT_TYPES = new Set(["externalLink"]);

/** `lotReference` has no addressable URL on its own (cf. lib/redirects.ts:39-44). */
const UNRESOLVABLE_CONTENT_TYPES = new Set(["lotReference"]);

/** Write the snapshot. Always called exactly once, on every code path. */
function writeSnapshot(redirects) {
  fs.writeFileSync(
    OUT_FILE,
    `${JSON.stringify(
      { generatedAt: new Date().toISOString(), redirects },
      null,
      2
    )}\n`
  );
  console.log(
    `✅ [redirects] Wrote ${redirects.length} redirect(s) to ${OUT_FILE}`
  );
}

/**
 * Mirror of `normalizePath` in lib/redirects.ts and lib/redirect-lookup.ts.
 * Structural only — case-preserving.
 */
function normalizePath(input) {
  if (typeof input !== "string") return "";
  let p = input.trim();
  if (!p) return "";

  p = p.split("?")[0].split("#")[0];
  if (!p) return "";

  if (!p.startsWith("/")) p = `/${p}`;
  p = p.replace(/\/{2,}/g, "/");
  if (p.length > 1) p = p.replace(/\/+$/, "");

  return p || "/";
}

/**
 * Mirror of `normalizeMatchKey` in lib/redirects.ts and lib/redirect-lookup.ts:
 * the lowercased lookup form, for rule sources only. Destinations keep their
 * case so a case-sensitive segment (auction id, property id) still resolves.
 */
function normalizeMatchKey(input) {
  return normalizePath(input).toLowerCase();
}

function isAbsoluteUrl(value) {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

/**
 * Mirror of `extractUrlFromTarget` (lib/utils.ts:73) called with no locale, plus
 * the two fixes `resolveEntryPath` in lib/redirects.ts applies on top of it:
 * `fullPath` for nested landingPage/blogPost, and skipping `lotReference`.
 */
function resolveEntryPath(entry, redirectId) {
  const contentType = entry?.sys?.contentType?.sys?.id;
  const fields = entry?.fields ?? {};

  if (!contentType) {
    console.warn(
      `[redirects] ${redirectId}: linked entry is an unresolved link (no contentType) — skipping.`
    );
    return null;
  }

  if (UNRESOLVABLE_CONTENT_TYPES.has(contentType)) {
    console.warn(
      `[redirects] ${redirectId}: "${contentType}" has no addressable URL of its own — skipping.`
    );
    return null;
  }

  if (contentType === "externalLink") {
    if (isAbsoluteUrl(fields.url)) return fields.url;
    console.warn(
      `[redirects] ${redirectId}: externalLink has no absolute http(s) url — skipping.`
    );
    return null;
  }

  // Nested pages resolve through app/(site)/[locale]/[...path]/page.tsx on
  // `fields.fullPath`; a flat entry's fullPath is just `/{slug}`, which the
  // dedicated routes below already produce.
  if (contentType === "landingPage" || contentType === "blogPost") {
    const full = normalizePath(fields.fullPath);
    if (full && full.split("/").filter(Boolean).length >= 2) return full;
  }

  const slug = fields.slug;

  switch (contentType) {
    case "landingPage":
      if (!slug) break;
      return slug === "homepage" || slug === "home" ? "/" : normalizePath(`/${slug}`);
    case "blogPost":
      if (!slug) break;
      return normalizePath(`/blog/${slug}`);
    case "categoryPage":
      if (!slug) break;
      return normalizePath(`/category/${slug}`);
    case "productStory":
      if (!slug) break;
      return normalizePath(`/stories/${slug}`);
    case "pmsProperty": {
      const id = fields.propertyId ?? slug;
      if (!id) break;
      return normalizePath(`/properties/${id}`);
    }
    case "productCategory":
      if (!slug) break;
      return normalizePath(`/products/category/${slug}`);
    case "campaign":
      if (!slug) break;
      return normalizePath(`/campaigns/${slug}`);
    case "kbArticle":
      if (!slug) break;
      return normalizePath(`/knowledge-base/${slug}`);
    case "auction": {
      // externalAuctionId is an Object field holding the full auction snapshot;
      // the ID string lives at snap.externalAuctionId (cf. lib/utils.ts:130-137).
      const id = fields.externalAuctionId?.externalAuctionId;
      if (!id) break;
      return normalizePath(`/auctions/${id}`);
    }
    default:
      console.warn(
        `[redirects] ${redirectId}: no URL rule for content type "${contentType}" — skipping.`
      );
      return null;
  }

  console.warn(
    `[redirects] ${redirectId}: "${contentType}" entry is missing the field needed to build its URL — skipping.`
  );
  return null;
}

/** Hydrate a `{ sys: { type: "Link" } }` reference from the `includes` payload. */
function hydrate(link, includedById) {
  if (!link?.sys?.id) return null;
  return includedById.get(link.sys.id) ?? null;
}

function resolveSource(fields, includedById, redirectId) {
  const rawPath = typeof fields.fromPath === "string" ? fields.fromPath.trim() : "";
  const hasPath = rawPath.length > 0;
  const hasEntry = Boolean(fields.fromEntry);

  if (hasPath && hasEntry) {
    console.warn(
      `[redirects] ${redirectId}: both fromPath and fromEntry are set — set exactly one. Skipping.`
    );
    return null;
  }
  if (!hasPath && !hasEntry) {
    console.warn(
      `[redirects] ${redirectId}: neither fromPath nor fromEntry is set — skipping.`
    );
    return null;
  }

  if (hasPath) {
    if (isAbsoluteUrl(rawPath)) {
      console.warn(
        `[redirects] ${redirectId}: fromPath must be a site-relative path, not an absolute URL. Skipping.`
      );
      return null;
    }
    return normalizeMatchKey(rawPath) || null;
  }

  const entry = hydrate(fields.fromEntry, includedById);
  if (!entry) {
    console.warn(
      `[redirects] ${redirectId}: fromEntry could not be resolved from the CDA includes (unpublished?) — skipping.`
    );
    return null;
  }

  const contentType = entry?.sys?.contentType?.sys?.id;
  if (contentType && NON_SOURCE_CONTENT_TYPES.has(contentType)) {
    console.warn(
      `[redirects] ${redirectId}: cannot redirect away from a "${contentType}" — skipping.`
    );
    return null;
  }

  const source = resolveEntryPath(entry, redirectId);
  if (source && isAbsoluteUrl(source)) {
    console.warn(
      `[redirects] ${redirectId}: cannot redirect away from an external URL — skipping.`
    );
    return null;
  }
  // Sources are keys, so they are lowercased; `resolveEntryPath` preserves case
  // because the same helper also resolves destinations.
  return source ? normalizeMatchKey(source) : null;
}

function resolveDestination(fields, includedById, redirectId) {
  const rawUrl =
    typeof fields.toExternalUrl === "string" ? fields.toExternalUrl.trim() : "";
  const hasUrl = rawUrl.length > 0;
  const hasEntry = Boolean(fields.toEntry);

  if (hasUrl && hasEntry) {
    console.warn(
      `[redirects] ${redirectId}: both toEntry and toExternalUrl are set — set exactly one. Skipping.`
    );
    return null;
  }
  if (!hasUrl && !hasEntry) {
    console.warn(
      `[redirects] ${redirectId}: neither toEntry nor toExternalUrl is set — skipping.`
    );
    return null;
  }

  if (hasUrl) {
    if (!isAbsoluteUrl(rawUrl)) {
      console.warn(
        `[redirects] ${redirectId}: toExternalUrl must be an absolute http(s) URL. Skipping.`
      );
      return null;
    }
    return rawUrl;
  }

  const entry = hydrate(fields.toEntry, includedById);
  if (!entry) {
    console.warn(
      `[redirects] ${redirectId}: toEntry could not be resolved from the CDA includes (unpublished?) — skipping.`
    );
    return null;
  }
  return resolveEntryPath(entry, redirectId);
}

function resolveStatusCode(fields, redirectId) {
  const code = Number(fields.statusCode);
  if (ALLOWED_STATUS_CODES.has(code)) return code;
  console.warn(
    `[redirects] ${redirectId}: statusCode "${fields.statusCode}" is not one of 301/302/307/308 — falling back to ${DEFAULT_STATUS_CODE}.`
  );
  return DEFAULT_STATUS_CODE;
}

/** Mirror of `collapseChains` in lib/redirects.ts: A→B→C becomes A→C. */
function collapseChains(byFrom) {
  const collapsed = [];

  for (const [from, rule] of byFrom) {
    let to = rule.to;
    let hops = 0;
    let looped = false;
    const seen = new Set([from]);

    while (!isAbsoluteUrl(to)) {
      const key = normalizeMatchKey(to);
      const next = byFrom.get(key);
      if (!next) break;

      if (seen.has(key)) {
        console.warn(
          `[redirects] ${rule.id}: redirect chain from "${from}" loops back on itself — dropping.`
        );
        looped = true;
        break;
      }
      if (hops >= MAX_CHAIN_HOPS) {
        console.warn(
          `[redirects] ${rule.id}: redirect chain from "${from}" is longer than ${MAX_CHAIN_HOPS} hops — emitting partially collapsed.`
        );
        break;
      }
      seen.add(key);
      to = next.to;
      hops++;
    }

    if (looped) continue;

    if (!isAbsoluteUrl(to) && normalizeMatchKey(to) === from) {
      console.warn(
        `[redirects] ${rule.id}: "${from}" resolves to itself — dropping to avoid a redirect loop.`
      );
      continue;
    }

    collapsed.push({ from, to, code: rule.code });
  }

  return collapsed;
}

async function fetchRedirectEntries() {
  const params = new URLSearchParams({
    content_type: "redirect",
    include: "1",
    limit: "1000",
  });
  const url = `https://cdn.contentful.com/spaces/${SPACE}/environments/${ENV}/entries?${params.toString()}`;

  const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });

  if (!res.ok) {
    // A 404 here usually means the `redirect` content type does not exist in this
    // environment yet — expected on a space that has not been migrated.
    console.warn(
      `[redirects] Failed to fetch redirect entries (${res.status} ${res.statusText}). Writing an empty snapshot.`
    );
    return { items: [], includedById: new Map() };
  }

  const data = await res.json();
  const items = Array.isArray(data.items) ? data.items : [];

  // Raw CDA does NOT resolve links the way the SDK does — build the lookup
  // ourselves from `includes.Entry` (cf. scripts/kb/build-kb-index.mjs:54-58).
  const includedById = new Map();
  for (const inc of Array.isArray(data.includes?.Entry) ? data.includes.Entry : []) {
    if (inc?.sys?.id) includedById.set(inc.sys.id, inc);
  }

  return { items, includedById };
}

async function main() {
  if (!SPACE || !TOKEN) {
    console.warn(
      "[redirects] Missing Contentful credentials. Writing an empty redirect snapshot."
    );
    writeSnapshot([]);
    return;
  }

  const { items, includedById } = await fetchRedirectEntries();
  const byFrom = new Map();

  for (const entry of items) {
    const redirectId = entry?.sys?.id ?? "<unknown>";
    const fields = entry?.fields ?? {};

    // Unpublished entries never reach the CDA; `status` is the second,
    // reversible gate an editor can flip without deleting the entry.
    if (fields.status !== "active") continue;

    const from = resolveSource(fields, includedById, redirectId);
    if (!from) continue;

    const to = resolveDestination(fields, includedById, redirectId);
    if (!to) continue;

    if (!isAbsoluteUrl(to) && normalizeMatchKey(to) === from) {
      console.warn(
        `[redirects] ${redirectId}: source and destination are identical ("${from}") — skipping.`
      );
      continue;
    }

    const existing = byFrom.get(from);
    if (existing) {
      console.warn(
        `[redirects] ${redirectId}: duplicate source "${from}" (already claimed by ${existing.id}) — keeping the first.`
      );
      continue;
    }

    byFrom.set(from, { to, code: resolveStatusCode(fields, redirectId), id: redirectId });
  }

  writeSnapshot(collapseChains(byFrom));
}

main().catch((err) => {
  // Soft-fail: the snapshot is only a cold-start optimisation, so a failure here
  // must not abort the build. The live map still comes from /api/redirects.
  console.warn("[redirects] Snapshot build failed, writing an empty snapshot:", err);
  try {
    writeSnapshot([]);
  } catch (writeErr) {
    console.warn("[redirects] Could not write the snapshot file either:", writeErr);
  }
});
