/**
 * Redirect lookup — **Edge runtime safe**.
 *
 * This is the half of the redirect feature that `middleware.ts` imports, so it
 * must stay free of the Contentful SDK. It deliberately imports nothing from
 * `lib/contentful.ts`, `lib/utils.ts`, or `contentful` — see the header of
 * `lib/redirects.ts` for why (module-scope `createClient()`).
 *
 * All it does is fetch the pre-resolved `{ from, to, code }` list from
 * `app/api/redirects/route.ts`, hold it in a module-scope TTL cache, and answer
 * O(1) `Map` lookups.
 *
 * Cache behaviour:
 *   fresh  → return immediately
 *   stale  → return the stale map and refresh in the background (SWR)
 *   empty  → await the refresh, bounded by an 800ms timeout
 *
 * `lib/redirects.generated.json` (written at build time by
 * `scripts/generate-redirects.mjs`) seeds the cache so a cold isolate has a
 * usable map on request #1 without paying for the fetch.
 */

import bakedSnapshot from "./redirects.generated.json";

export type RedirectRule = {
  /** Normalised, locale-less source path, e.g. `/old-campaign`. */
  from: string;
  /** Normalised destination path, or an absolute `http(s)://` URL. */
  to: string;
  /** One of 301 / 302 / 307 / 308. */
  code: number;
};

/** How long a successfully fetched map is considered fresh. */
const TTL_MS = 60_000;

/** Back-off after a failed refresh, so a dead endpoint can't stall every request. */
const FAILURE_TTL_MS = 10_000;

/** Upper bound on the blocking cold-start fetch. */
const FETCH_TIMEOUT_MS = 800;

const ALLOWED_STATUS_CODES = new Set([301, 302, 307, 308]);
const DEFAULT_STATUS_CODE = 307;

/** True for an absolute `http://` / `https://` URL. */
export function isAbsoluteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

/**
 * Structural canonical form for a redirect path. **Case-preserving** — see
 * `normalizeMatchKey` for the comparison form.
 *
 * **Kept intentionally identical to `normalizePath` in `lib/redirects.ts`.** The
 * two cannot share an implementation because that file is Node-only, so if you
 * change the rules here, change them there too — a mismatch silently stops
 * redirects from matching.
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
 * Lookup form for a redirect path: `normalizePath` plus lowercasing, so that
 * `/Campaigns/Foo` matches a rule authored as `/campaigns/foo`.
 *
 * Only ever applied to *keys* (rule sources and the incoming request path) —
 * never to a destination, which may contain case-sensitive segments such as an
 * auction `externalAuctionId` or a `pmsProperty` id.
 */
export function normalizeMatchKey(input: string | null | undefined): string {
  return normalizePath(input).toLowerCase();
}

/**
 * Split a leading `/<locale>` segment off a pathname.
 *
 * `middleware.ts` only ever *detected* a locale prefix (and stripped the default
 * locale inline); redirect matching needs the locale-less remainder for every
 * locale, so the split lives here.
 *
 * `/da/old-campaign` → `{ locale: "da", rest: "/old-campaign" }`
 * `/da`              → `{ locale: "da", rest: "/" }`
 * `/old-campaign`    → `{ locale: null, rest: "/old-campaign" }`
 */
export function stripLocalePrefix(
  pathname: string,
  locales: readonly string[]
): { locale: string | null; rest: string } {
  for (const locale of locales) {
    if (pathname === `/${locale}`) return { locale, rest: "/" };
    if (pathname.startsWith(`/${locale}/`)) {
      return { locale, rest: pathname.slice(locale.length + 1) };
    }
  }
  return { locale: null, rest: pathname };
}

/**
 * Turn an `/api/redirects` (or baked snapshot) payload into a lookup map,
 * discarding anything malformed rather than trusting the wire format.
 */
function parseRules(payload: unknown): Map<string, RedirectRule> {
  const map = new Map<string, RedirectRule>();

  const items = (payload as { redirects?: unknown })?.redirects;
  if (!Array.isArray(items)) return map;

  for (const item of items) {
    const candidate = item as Partial<RedirectRule> | null;
    if (!candidate || typeof candidate !== "object") continue;

    const from = normalizeMatchKey(
      typeof candidate.from === "string" ? candidate.from : ""
    );
    if (!from) continue;

    const rawTo = typeof candidate.to === "string" ? candidate.to.trim() : "";
    if (!rawTo) continue;
    const to = isAbsoluteUrl(rawTo) ? rawTo : normalizePath(rawTo);
    if (!to) continue;
    // Compare case-insensitively: `to` keeps its case, `from` is a match key.
    if (!isAbsoluteUrl(to) && normalizeMatchKey(to) === from) continue;

    const code = Number(candidate.code);
    map.set(from, {
      from,
      to,
      code: ALLOWED_STATUS_CODES.has(code) ? code : DEFAULT_STATUS_CODE,
    });
  }

  return map;
}

type CacheState = {
  rules: Map<string, RedirectRule>;
  /** Epoch ms after which `rules` is stale. `0` = the baked snapshot, always stale. */
  expiresAt: number;
  /**
   * True once a live refresh has succeeded. Distinguishes "no rules because we
   * have not fetched yet" (block once) from "no rules because there genuinely
   * are none" (serve empty, refresh in the background) — without it a site with
   * zero redirects would pay a blocking fetch on every TTL expiry.
   */
  hydrated: boolean;
  /** In-flight refresh, so concurrent requests share one fetch. */
  inflight: Promise<Map<string, RedirectRule>> | null;
};

let cache: CacheState = {
  rules: parseRules(bakedSnapshot),
  expiresAt: 0,
  hydrated: false,
  inflight: null,
};

/** `AbortSignal.timeout` is available on Edge, but never let a polyfill gap throw. */
function timeoutSignal(ms: number): AbortSignal | undefined {
  try {
    return AbortSignal.timeout(ms);
  } catch {
    return undefined;
  }
}

/** Fetch a fresh map. Never rejects — a failure keeps the previous map. */
function refresh(origin: string): Promise<Map<string, RedirectRule>> {
  if (cache.inflight) return cache.inflight;

  const inflight = (async () => {
    try {
      const res = await fetch(`${origin}/api/redirects`, {
        // Edge fetch caching is not dependable inside middleware; the TTL cache
        // above is the real cache (cf. i18n-config.ts:60).
        cache: "no-store",
        headers: { accept: "application/json" },
        signal: timeoutSignal(FETCH_TIMEOUT_MS),
      });
      if (!res.ok) {
        throw new Error(`/api/redirects responded ${res.status}`);
      }
      const rules = parseRules(await res.json());
      cache = {
        rules,
        expiresAt: Date.now() + TTL_MS,
        hydrated: true,
        inflight: null,
      };
      return rules;
    } catch (error) {
      console.warn("[redirects] could not refresh the redirect map:", error);
      // Keep whatever we already have — the baked snapshot on a cold isolate —
      // and back off briefly rather than retrying on every single request.
      cache = {
        rules: cache.rules,
        expiresAt: Date.now() + FAILURE_TTL_MS,
        hydrated: cache.hydrated,
        inflight: null,
      };
      return cache.rules;
    }
  })();

  cache = { ...cache, inflight };
  return inflight;
}

/**
 * Get the current redirect map. Blocks only on the first request of a cold
 * isolate that has neither a baked snapshot nor a successful refresh behind it.
 *
 * @param origin absolute origin of the current request (`request.nextUrl.origin`)
 */
export async function getRedirectMap(
  origin: string
): Promise<Map<string, RedirectRule>> {
  if (Date.now() < cache.expiresAt) return cache.rules;

  if (cache.hydrated || cache.rules.size > 0) {
    // Stale-while-revalidate: the visitor is never made to wait for Contentful.
    void refresh(origin);
    return cache.rules;
  }

  return refresh(origin);
}

/** O(1) exact-match lookup on the normalised, locale-less path. */
export function resolveRedirect(
  map: Map<string, RedirectRule>,
  path: string
): RedirectRule | null {
  const key = normalizeMatchKey(path);
  if (!key) return null;
  return map.get(key) ?? null;
}
