/**
 * Optional site (brand) scoping.
 *
 * A single Contentful space normally serves a single brand. When several brands
 * share one space, each brand is represented by a `site` entry and every
 * site-owned entry carries an optional `site` reference. One deployment serves
 * one brand: `SITE_ID` names it.
 *
 * Two modes, and no third:
 *
 *   off   — the default, and what every existing demo runs. Nothing is
 *           injected, nothing is asserted, queries are passed through
 *           untouched. Identical behaviour to before this module existed.
 *   site  — `SITE_ID` is set. Every site-owned query is filtered to that site,
 *           and any query for a content type this module does not recognise
 *           throws instead of quietly returning another brand's content.
 *
 * The mode is derived from the presence of `SITE_ID` rather than from a
 * separate boolean, because two independent switches can contradict each other
 * (`ENABLE_SITES=true` with no id, or an id that is being ignored) and there is
 * no correct behaviour for the contradiction. One variable cannot disagree with
 * itself. A blank or whitespace-only `SITE_ID` is treated as unset — the same
 * as absent — so an empty line in `.env` degrades to the safe default rather
 * than to a mode with no site.
 *
 * Server-only: deliberately not `NEXT_PUBLIC_`. No client component needs the
 * site id — theming and navigation already arrive as resolved props from
 * `siteSettings` — and inlining it would bake one brand into the bundle.
 */

/** Which brand this deployment serves, or `null` for single-site demos. */
export type SiteScope =
  | { mode: "off"; siteId: null }
  | { mode: "site"; siteId: string };

const RAW_SITE_ID = process.env.SITE_ID;

const SCOPE: SiteScope = (() => {
  const siteId = typeof RAW_SITE_ID === "string" ? RAW_SITE_ID.trim() : "";
  if (!siteId) return { mode: "off", siteId: null };
  return { mode: "site", siteId };
})();

export function getSiteScope(): SiteScope {
  return SCOPE;
}

export function isSiteScopingEnabled(): boolean {
  return SCOPE.mode === "site";
}

/**
 * Content types that belong to exactly one site. Each has an optional `site`
 * reference field in Contentful; in `site` mode these queries are filtered by
 * it. Must stay in step with SITE_OWNED_CONTENT_TYPES in
 * scripts/contentful/bootstrap-site-scoping.mjs.
 */
export const SITE_OWNED_CONTENT_TYPES = new Set([
  "landingPage",
  "blogPost",
  "campaign",
  "productStory",
  "redirect",
  "microcopy",
  "kbArticle",
  "categoryPage",
  "productCategory",
  "pmsProperty",
  "auction",
]);

/**
 * Content types deliberately shared across every site in the space, listed
 * explicitly so that "not filtered" is a recorded decision rather than an
 * omission. Adding a content type to the space without classifying it here
 * makes `site`-mode queries for it throw — see `applySiteScope`.
 */
export const GLOBAL_CONTENT_TYPES = new Set([
  // The `site` entry is the thing being selected, not something a site owns, so
  // it is fetched by id. `siteSettings` is reached through it rather than as a
  // singleton in `site` mode — see `getSiteSettingsForSite` in
  // lib/site-settings.ts.
  "site",
  "siteSettings",
  // The market axis is orthogonal to the site axis: markets and their field
  // overrides apply within whichever site is being served.
  "market",
  "marketOverride",
  // Reached only as children of a site-owned parent (auction → lotReference),
  // so the parent's filter already scopes them.
  "lotReference",
  "bookReference",
  // Personalization primitives, owned by the Ninetailed tenant rather than by
  // a brand.
  "nt_experience",
  "nt_audience",
  // Editorial/preview artifacts with no public route of their own.
  "socialVariant",
  "notificationTemplate",
  // Mock-app content, served from /mock rather than from a brand site.
  "appScreen",
]);

/**
 * Opt-out marker. Admin, seeding and preview-registry surfaces intentionally
 * read across every site; they set this so the closed-world assertion does not
 * fire and no filter is injected. Stripped before the query reaches Contentful.
 */
export const SITE_SCOPE_EXEMPT = "__siteScopeExempt" as const;

export type SiteScopedOptions = Record<string, unknown> & {
  [SITE_SCOPE_EXEMPT]?: boolean;
};

/** Marks a query as intentionally unscoped (reads across all sites). */
export function unscoped<T extends Record<string, unknown>>(
  options: T
): T & { [SITE_SCOPE_EXEMPT]: true } {
  return { ...options, [SITE_SCOPE_EXEMPT]: true };
}

export class SiteScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SiteScopeError";
  }
}

/**
 * Injects the site filter into a Contentful query.
 *
 * In `off` mode this is the identity function apart from stripping the opt-out
 * marker — it cannot throw, so no existing demo can be broken by it.
 *
 * In `site` mode:
 *  - a site-owned content type gains `fields.site.sys.id`;
 *  - a globally-shared content type is passed through;
 *  - anything else throws. That is the point: a content type added later and
 *    never classified must fail loudly on the first request rather than serve
 *    another brand's entries. There is no permissive fallback.
 *
 * The filter is exact rather than "this site or unassigned": the Delivery API
 * cannot express OR across fields, so the alternative would be two queries
 * merged in application code, and any bug in the merge shows up as mixed-brand
 * content. An entry with no `site` reference therefore belongs to no site and
 * is invisible in `site` mode — visible, and fixable by an editor, in a way a
 * silent merge would not be.
 */
export function applySiteScope<T extends Record<string, unknown>>(
  options: T
): Record<string, unknown> {
  const { [SITE_SCOPE_EXEMPT]: exempt, ...query } = options as SiteScopedOptions;

  if (SCOPE.mode === "off" || exempt === true) return query;

  const contentType = query.content_type;

  if (typeof contentType !== "string" || contentType.length === 0) {
    // Without a content type there is nothing to classify, so the query could
    // return entries of any type from any site.
    throw new SiteScopeError(
      "Site scoping is enabled (SITE_ID is set) but a Contentful query was made " +
        "without a `content_type`. Add one, or mark the query with `unscoped()` " +
        "if it is meant to read across every site."
    );
  }

  if (SITE_OWNED_CONTENT_TYPES.has(contentType)) {
    return { ...query, "fields.site.sys.id": SCOPE.siteId };
  }

  if (GLOBAL_CONTENT_TYPES.has(contentType)) return query;

  throw new SiteScopeError(
    `Site scoping is enabled (SITE_ID=${SCOPE.siteId}) but the content type ` +
      `"${contentType}" is not classified in lib/site-scope.ts. Add it to ` +
      `SITE_OWNED_CONTENT_TYPES (and give it a \`site\` field via ` +
      `scripts/contentful/bootstrap-site-scoping.mjs) if it belongs to one ` +
      `brand, or to GLOBAL_CONTENT_TYPES if it is shared by every brand. ` +
      `Refusing to query rather than risk serving another brand's content.`
  );
}

/**
 * Query keys that mean "resolve the one page addressed by this URL". A query
 * carrying one of these is a resolver, not a listing: the caller takes
 * `entries[0]` and renders it. `fields.fullPath[exists]` and friends are
 * deliberately absent — those are listings, and a different key string.
 */
const RESOLVER_KEYS = ["fields.slug", "fields.fullPath"] as const;

/**
 * Names the resolver key in a query, or `null` if this is not a
 * resolve-one-page-by-address query.
 *
 * Returns `null` in `off` mode regardless of the query, so the guard below is
 * inert for every single-site demo — no extra request, no new failure mode, no
 * behavioural difference of any kind.
 */
export function resolverKey(query: Record<string, unknown>): string | null {
  if (SCOPE.mode !== "site") return null;
  for (const key of RESOLVER_KEYS) {
    const value = query[key];
    if (typeof value === "string" && value.length > 0) return key;
  }
  return null;
}

/**
 * Fails when an address resolves to more than one entry.
 *
 * Contentful currently carries `unique: true` on `slug` for every routed
 * content type, so within one space an address is unambiguous and this never
 * fires. It exists for the moment that constraint is relaxed to let two brands
 * both own `/about`: uniqueness would then be scoped by convention only, and
 * `unique` cannot express "unique per site" — Contentful has no composite or
 * scoped uniqueness. At that point the only thing standing between a
 * mis-assigned `site` reference and one brand serving another brand's page is
 * this check.
 *
 * `total` is the count of all matches, not of the returned page, so this reads
 * the true cardinality without altering the caller's `limit` and without a
 * second request.
 *
 * Throwing rather than picking the first match is the point: the queries behind
 * this pass no `order`, so "the first match" is whatever Contentful returns
 * today. An editor can fix a duplicate slug; nobody can debug a page that
 * silently renders the wrong brand.
 */
export function assertSingleResolverMatch(
  key: string,
  query: Record<string, unknown>,
  total: number | undefined
): void {
  if (typeof total !== "number" || total <= 1) return;

  const contentType = String(query.content_type ?? "unknown");
  const value = String(query[key]);

  throw new SiteScopeError(
    `Ambiguous ${contentType} address: ${key}="${value}" matches ${total} entries ` +
      `within site "${SCOPE.siteId}". A URL must resolve to exactly one entry, and ` +
      `these queries pass no \`order\`, so picking one would be arbitrary and could ` +
      `serve another brand's page. Give each entry a distinct slug, or check that ` +
      `every duplicate carries the right \`site\` reference.`
  );
}
