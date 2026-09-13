/**
 * Catalogue reader for the Contentful app iframe.
 *
 * The app is deployed once and installed in many spaces, so the product picker
 * must read the catalogue from the space it is *installed in* — not from the
 * space the deployment happens to be configured for. `sdk.cma` is already
 * authenticated and scoped to the installing space, so no token, key pair or
 * per-space configuration is needed.
 *
 * The server-side path (`/api/integrations/products`, used by the storefront) is
 * deliberately untouched: the deployed site *is* its own space, so resolving
 * from the deployment's credentials is correct there.
 *
 * Filtering, sorting and category derivation are reimplemented here because that
 * logic lived behind the API route. They mirror `lib/integrations/commerce/
 * mock.adapter.ts` exactly so the picker behaves as it always did.
 */
import fallbackProducts from "@/lib/mock-data/products.json";
import type { Product, ProductCategory } from "@/lib/integrations/commerce/commerce.interface";

export type CatalogOrigin = "space" | "fallback";

export type CatalogResult = {
  products: Product[];
  origin: CatalogOrigin;
  /**
   * Set when the fallback is in use for a reason the editor should see — a read
   * failure or malformed JSON. An absent/blank field is the expected state in a
   * space that has not been populated, so that case carries no warning.
   */
  warning?: string;
};

const SETTINGS_CONTENT_TYPE = "siteSettings";
const PRODUCTS_FIELD = "mockProducts";

/** The subset of the App SDK this module needs. Keeps it testable. */
type CatalogSdk = {
  cma: {
    entry: {
      getMany: (args: { query?: Record<string, unknown> }) => Promise<{
        items: Array<{ fields?: Record<string, unknown> }>;
      }>;
    };
  };
  locales?: { default?: string };
};

/**
 * CMA entries are locale-keyed (`fields.x = { "en-US": value }`), unlike the CDA
 * shape the server reads. Same unwrap idiom as
 * app/ctf-apps/custom-flag-manager/lib/registry.ts.
 */
function getLocalized(field: unknown, locale?: string): unknown {
  if (!field || typeof field !== "object" || Array.isArray(field)) return field;
  const map = field as Record<string, unknown>;
  if (locale && map[locale] !== undefined) return map[locale];
  if (map["en-US"] !== undefined) return map["en-US"];
  return Object.values(map)[0];
}

/**
 * Validation rules copied from `parseMockProducts` in
 * lib/integrations/commerce/catalog-source.ts. Copied rather than imported: that
 * module pulls in `../core/config-loader`, which imports `fs` and cannot be
 * bundled for the browser.
 *
 * Returns a problem list instead of throwing — the caller degrades to the
 * fallback catalogue so an editor mid-selection is never left with an empty
 * picker. (The server deliberately throws instead, because silently serving
 * another brand's products from a page render would be worse.)
 */
export function validateProducts(raw: unknown, source: string): string[] {
  if (!Array.isArray(raw)) {
    return [`${source} must be a JSON array of products, got ${raw === null ? "null" : typeof raw}.`];
  }

  const problems: string[] = [];
  const seenIds = new Set<string>();

  raw.forEach((item, index) => {
    const at = `[${index}]`;
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      problems.push(`${at} is not an object`);
      return;
    }
    const p = item as Record<string, unknown>;
    const label = typeof p.id === "string" ? `${at} (id "${p.id}")` : at;

    for (const key of ["id", "title", "slug", "currency"] as const) {
      if (typeof p[key] !== "string" || (p[key] as string).length === 0) {
        problems.push(`${label} ${key} must be a non-empty string`);
      }
    }
    for (const key of ["price", "stock"] as const) {
      if (typeof p[key] !== "number" || Number.isNaN(p[key] as number)) {
        problems.push(`${label} ${key} must be a number`);
      }
    }
    if (!Array.isArray(p.images)) {
      problems.push(`${label} images must be an array`);
    }
    if (typeof p.id === "string") {
      if (seenIds.has(p.id)) problems.push(`${label} duplicate id`);
      seenIds.add(p.id);
    }
  });

  return problems;
}

function summarise(problems: string[]): string {
  const shown = problems.slice(0, 10).join("; ");
  const more = problems.length > 10 ? ` (+${problems.length - 10} more)` : "";
  return `${shown}${more}`;
}

function fallback(warning?: string): CatalogResult {
  return { products: fallbackProducts as Product[], origin: "fallback", warning };
}

/**
 * Read the installing space's catalogue, falling back to the deployment's
 * bundled fixture.
 *
 * Reads drafts, by design: `sdk.cma` returns the entry as saved, so a pasted
 * catalogue is pickable without publishing first. The storefront still renders
 * published content — a deliberate, visible divergence.
 */
export async function loadCatalog(sdk: CatalogSdk): Promise<CatalogResult> {
  let raw: unknown;

  try {
    const res = await sdk.cma.entry.getMany({
      query: {
        content_type: SETTINGS_CONTENT_TYPE,
        // Oldest-wins, matching getMockProductsFromSettings in
        // lib/site-settings.ts. A space may hold several siteSettings entries,
        // and this keeps the picker on the same one the storefront reads.
        order: "sys.createdAt",
        limit: 1,
        // No `select` here on purpose: `select: "fields.mockProducts"` returns
        // 422 UnknownField in spaces where the field does not exist yet.
      },
    });

    const settings = res?.items?.[0];
    if (!settings) return fallback();

    raw = getLocalized(settings.fields?.[PRODUCTS_FIELD], sdk.locales?.default);
  } catch (error) {
    return fallback(
      `Could not read ${SETTINGS_CONTENT_TYPE}.${PRODUCTS_FIELD}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  // Absent or blank is the expected state in a space that has not been
  // populated — fall back quietly.
  const isBlank =
    raw === undefined ||
    raw === null ||
    (Array.isArray(raw) && raw.length === 0) ||
    (typeof raw === "object" && !Array.isArray(raw) && Object.keys(raw as object).length === 0);
  if (isBlank) return fallback();

  const problems = validateProducts(raw, `${SETTINGS_CONTENT_TYPE}.${PRODUCTS_FIELD}`);
  if (problems.length > 0) {
    return fallback(
      `${SETTINGS_CONTENT_TYPE}.${PRODUCTS_FIELD} contains ${problems.length} invalid product${
        problems.length === 1 ? "" : "s"
      }: ${summarise(problems)}`
    );
  }

  return { products: raw as Product[], origin: "space" };
}

/* ------------------------------------------------------------------------- *
 * Filtering / sorting — mirrors mock.adapter.ts getProducts()
 * ------------------------------------------------------------------------- */

export type ClientFilters = {
  /** Free-text search. Not supported by the API route, so this is new behaviour. */
  search?: string;
  category?: string;
  tags?: string[];
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  limit?: number;
  offset?: number;
  sort?: "price_asc" | "price_desc" | "popular" | "newest";
};

/**
 * Legacy aliases some Contentful category entries still use. Kept for parity
 * with mock.adapter.ts, which resolves them before comparing.
 */
const CATEGORY_ALIASES: Record<string, string> = {
  "cat-pots-planters": "outdoor-pots",
  "cat-outdoor-lighting": "leisure-outdoor",
  "cat-storage": "outdoor-storage",
};

export function filterProducts(all: Product[], filters: ClientFilters = {}): Product[] {
  let filtered = [...all];

  // Search is implemented here only. The field has always sent `search=`, but
  // neither the API route nor ProductFilters ever read it, so the box did
  // nothing. Covers articleNumber because `sku` is unset on every product.
  if (filters.search) {
    const q = filters.search.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter((p) => {
        const meta = (p.metadata ?? {}) as Record<string, unknown>;
        const haystack = [
          p.title,
          p.description,
          p.category,
          p.sku,
          typeof meta.articleNumber === "string" ? meta.articleNumber : "",
          ...(p.tags ?? []),
        ];
        return haystack.some((v) => typeof v === "string" && v.toLowerCase().includes(q));
      });
    }
  }

  if (filters.category) {
    const resolved = CATEGORY_ALIASES[filters.category] ?? filters.category;
    filtered = filtered.filter((p) => p.category === resolved);
  }

  if (filters.tags && filters.tags.length > 0) {
    filtered = filtered.filter((p) => filters.tags!.some((tag) => p.tags?.includes(tag)));
  }

  // `!== undefined` so a 0 bound is honoured.
  if (filters.minPrice !== undefined) {
    filtered = filtered.filter((p) => p.price >= filters.minPrice!);
  }
  if (filters.maxPrice !== undefined) {
    filtered = filtered.filter((p) => p.price <= filters.maxPrice!);
  }

  // Truthy-only, like the adapter: `inStock: false` skips the filter rather
  // than selecting out-of-stock items.
  if (filters.inStock) {
    filtered = filtered.filter((p) => p.stock > 0);
  }

  switch (filters.sort) {
    case "price_asc":
      filtered.sort((a, b) => a.price - b.price);
      break;
    case "price_desc":
      filtered.sort((a, b) => b.price - a.price);
      break;
    case "popular":
      filtered.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
      break;
    case "newest":
      // No-op: the catalogue is assumed to be in newest-first order already.
      break;
    default:
      break;
  }

  // offset before limit, matching the adapter.
  if (filters.offset !== undefined) filtered = filtered.slice(filters.offset);
  if (filters.limit !== undefined) filtered = filtered.slice(0, filters.limit);

  return filtered;
}

/**
 * Categories are derived, not stored — there is no `categories` key in the
 * catalogue JSON. Mirrors mock.adapter.ts getCategories(), including the
 * descending-count sort.
 */
export function deriveCategories(all: Product[]): ProductCategory[] {
  const counts = new Map<string, number>();
  for (const p of all) {
    if (p.category) counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([id, productCount]) => ({
      id,
      name: id
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" "),
      slug: id,
      productCount,
    }))
    .sort((a, b) => b.productCount - a.productCount);
}
