/**
 * Redirect map builder — **Node runtime only**.
 *
 * Reads `redirect` entries from Contentful and turns them into a flat list of
 * plain `{ from, to, code }` rules that the Edge middleware can consume without
 * touching the Contentful SDK.
 *
 * Do NOT import this from `middleware.ts` or any other Edge-runtime code: it
 * pulls in `lib/contentful.ts` (which calls `createClient()` at module scope)
 * and `lib/utils.ts` (which imports from `contentful`). The Edge side lives in
 * `lib/redirect-lookup.ts` and talks to `app/api/redirects/route.ts` instead.
 *
 * Rules are locale- and market-agnostic: paths here never carry a locale prefix
 * or a `/market/<code>` segment. Middleware re-applies both to the destination.
 */

import { DEFAULT_CTF_ENVIRONMENT, getEntriesInEnvironment } from "./contentful";
import { extractUrlFromTarget } from "./utils";
import type { IRedirect, RedirectSkeleton } from "@/features/contentful/type";

export type RedirectRule = {
  /** Normalised, locale-less source path, e.g. `/old-campaign`. */
  from: string;
  /** Normalised destination path, or an absolute `http(s)://` URL. */
  to: string;
  /** One of 301 / 302 / 307 / 308. */
  code: number;
};

const ALLOWED_STATUS_CODES = new Set([301, 302, 307, 308]);
const DEFAULT_STATUS_CODE = 307;

/** Guard for `A → B → C` collapsing. Beyond this we emit and warn. */
const MAX_CHAIN_HOPS = 5;

/** Content types that can never be a redirect *source* (they have no local URL). */
const NON_SOURCE_CONTENT_TYPES = new Set(["externalLink"]);

/**
 * `lotReference` has no resolvable URL on its own: the real route is
 * `/auctions/[id]/lot/[lotNumber]`, but the entry does not store its parent
 * auction, and `extractUrlFromTarget` emits a dead `/lot/{id}` (lib/utils.ts:146).
 */
const UNRESOLVABLE_CONTENT_TYPES = new Set(["lotReference"]);

/** True for an absolute `http://` / `https://` URL. */
export function isAbsoluteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

/**
 * Structural canonical form for a redirect path. **Case-preserving** — see
 * `normalizeMatchKey` for the comparison form. Kept deliberately in sync with
 * the copy in `lib/redirect-lookup.ts` — that file must not import this one
 * (Edge boundary).
 *
 * - guarantees a leading slash
 * - drops query string and fragment
 * - collapses duplicate slashes
 * - strips the trailing slash (except for the root)
 */
export function normalizePath(input: string | null | undefined): string {
  if (typeof input !== "string") return "";
  let path = input.trim();
  if (!path) return "";

  path = path.split("?")[0].split("#")[0];
  if (!path) return "";

  if (!path.startsWith("/")) path = `/${path}`;
  path = path.replace(/\/{2,}/g, "/");
  if (path.length > 1) path = path.replace(/\/+$/, "");

  return path || "/";
}

/**
 * Lookup form for a redirect path: `normalizePath` plus lowercasing, so that a
 * request for `/Campaigns/Foo` matches a rule authored as `/campaigns/foo`.
 *
 * Applied to rule *sources* only. Destinations keep their original case: a
 * `toEntry` can resolve to a case-sensitive segment (an auction
 * `externalAuctionId`, a `pmsProperty` id), and lowercasing that would send the
 * visitor to a 404.
 */
export function normalizeMatchKey(input: string | null | undefined): string {
  return normalizePath(input).toLowerCase();
}

/**
 * Resolve a linked page entry to a locale-less path (or absolute URL for
 * `externalLink`). Returns `null` when the entry has no usable URL.
 *
 * Wraps `extractUrlFromTarget` rather than replacing it, fixing one gap:
 * nested `landingPage` / `blogPost` entries resolve through
 * `app/(site)/[locale]/[...path]/page.tsx` on `fields.fullPath`, but
 * `extractUrlFromTarget` only ever returns the flat `/{slug}` form — so a
 * nested destination would otherwise redirect straight into a 404.
 */
function resolveEntryPath(entry: unknown, redirectId: string): string | null {
  const candidate = entry as {
    sys?: { contentType?: { sys?: { id?: string } } };
    fields?: Record<string, unknown>;
  };
  const contentType = candidate?.sys?.contentType?.sys?.id;

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
    const url = candidate.fields?.url;
    if (typeof url === "string" && isAbsoluteUrl(url)) return url;
    console.warn(
      `[redirects] ${redirectId}: externalLink has no absolute http(s) url — skipping.`
    );
    return null;
  }

  // Prefer `fullPath` only when the entry is genuinely nested (2+ segments).
  // For a flat entry `fullPath` is just `/{slug}`, which the dedicated routes
  // (`/blog/{slug}` etc.) already handle via extractUrlFromTarget.
  if (contentType === "landingPage" || contentType === "blogPost") {
    const fullPath = candidate.fields?.fullPath;
    if (typeof fullPath === "string") {
      const normalized = normalizePath(fullPath);
      const segments = normalized.split("/").filter(Boolean);
      if (segments.length >= 2) return normalized;
    }
  }

  // No locale ⇒ `localizeInternalPath` returns an unprefixed path (lib/utils.ts:63),
  // which is exactly what a locale-agnostic map needs.
  const url = extractUrlFromTarget(
    entry as Parameters<typeof extractUrlFromTarget>[0]
  );
  if (!url) {
    console.warn(
      `[redirects] ${redirectId}: could not resolve a URL for "${contentType}" — skipping.`
    );
    return null;
  }

  return isAbsoluteUrl(url) ? url : normalizePath(url);
}

/** Resolve the source side of a redirect entry, enforcing exactly-one-of. */
function resolveSource(entry: IRedirect, redirectId: string): string | null {
  const rawPath =
    typeof entry.fields.fromPath === "string" ? entry.fields.fromPath.trim() : "";
  const hasPath = rawPath.length > 0;
  const hasEntry = Boolean(entry.fields.fromEntry);

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
    const normalized = normalizeMatchKey(rawPath);
    return normalized || null;
  }

  const source = resolveEntryPath(entry.fields.fromEntry, redirectId);
  if (source && isAbsoluteUrl(source)) {
    console.warn(
      `[redirects] ${redirectId}: cannot redirect away from an external URL — skipping.`
    );
    return null;
  }
  const sourceType = (
    entry.fields.fromEntry as { sys?: { contentType?: { sys?: { id?: string } } } }
  )?.sys?.contentType?.sys?.id;
  if (sourceType && NON_SOURCE_CONTENT_TYPES.has(sourceType)) return null;

  // Sources are keys, so they are lowercased; `resolveEntryPath` preserves case
  // because the same helper also resolves destinations.
  return source ? normalizeMatchKey(source) : null;
}

/** Resolve the destination side of a redirect entry, enforcing exactly-one-of. */
function resolveDestination(entry: IRedirect, redirectId: string): string | null {
  const rawUrl =
    typeof entry.fields.toExternalUrl === "string"
      ? entry.fields.toExternalUrl.trim()
      : "";
  const hasUrl = rawUrl.length > 0;
  const hasEntry = Boolean(entry.fields.toEntry);

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

  return resolveEntryPath(entry.fields.toEntry, redirectId);
}

function resolveStatusCode(entry: IRedirect, redirectId: string): number {
  const code = Number(entry.fields.statusCode);
  if (ALLOWED_STATUS_CODES.has(code)) return code;
  console.warn(
    `[redirects] ${redirectId}: statusCode "${entry.fields.statusCode}" is not one of 301/302/307/308 — falling back to ${DEFAULT_STATUS_CODE}.`
  );
  return DEFAULT_STATUS_CODE;
}

/**
 * Follow `A → B → C` and emit `A → C` so a visitor never pays for more than one
 * round trip. The originating entry's status code wins — that is the editor's
 * stated intent for that source. Rules whose chain loops back on themselves are
 * dropped entirely rather than emitted half-collapsed.
 */
function collapseChains(
  byFrom: Map<string, { to: string; code: number; id: string }>
): RedirectRule[] {
  const collapsed: RedirectRule[] = [];

  for (const [from, rule] of byFrom) {
    let to = rule.to;
    let hops = 0;
    let looped = false;
    const seen = new Set<string>([from]);

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

/**
 * Build the full redirect map for an environment.
 *
 * Never throws: a broken redirect map must not be able to break the site, so any
 * failure yields an empty list and a logged error.
 */
export async function buildRedirectMap(
  environment: string = DEFAULT_CTF_ENVIRONMENT
): Promise<RedirectRule[]> {
  let entries: IRedirect[] = [];

  try {
    entries = (await getEntriesInEnvironment<RedirectSkeleton>({
      options: {
        content_type: "redirect",
        include: 1,
        limit: 1000,
      },
      isPreviewEnabled: false,
      environment,
    })) as unknown as IRedirect[];
  } catch (error) {
    console.error("[redirects] Failed to fetch redirect entries:", error);
    return [];
  }

  const byFrom = new Map<string, { to: string; code: number; id: string }>();

  for (const entry of entries) {
    const redirectId = entry?.sys?.id ?? "<unknown>";

    // Unpublished entries never reach the CDA; `status` is the second,
    // reversible gate an editor can flip without deleting the entry.
    if (entry?.fields?.status !== "active") continue;

    const from = resolveSource(entry, redirectId);
    if (!from) continue;

    const to = resolveDestination(entry, redirectId);
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

    byFrom.set(from, { to, code: resolveStatusCode(entry, redirectId), id: redirectId });
  }

  return collapseChains(byFrom);
}
