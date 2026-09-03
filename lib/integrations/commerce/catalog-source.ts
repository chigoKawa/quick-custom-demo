import type { Product } from './commerce.interface';
import { loadMockData } from '../core/config-loader';
import { getMockProductsFromSettings } from '../../site-settings';

/**
 * Resolves the mock product catalogue for the running deployment.
 *
 * Resolution order:
 *   1. `siteSettings.mockProducts` in Contentful — per space / per brand, and
 *      editable without a redeploy.
 *   2. `config.fixtureFile` (config/integrations/commerce.json) or the
 *      `COMMERCE_FIXTURE_FILE` env var — lets a brand branch point at one of the
 *      sibling files in lib/mock-data without pasting JSON into Contentful.
 *   3. `lib/mock-data/products.json` — the original built-in fixture.
 *
 * Tier 1 exists because the catalogue used to be a file in the git tree, which
 * meant every deployment of every brand served the same products.
 */

const DEFAULT_FIXTURE = 'products.json';
const DEFAULT_TTL_MS = 60_000;

export type CatalogOrigin = 'contentful' | 'fixture';

export interface CatalogResult {
  products: Product[];
  origin: CatalogOrigin;
  /** Fixture filename, when `origin` is 'fixture'. */
  fixtureFile?: string;
}

/**
 * Thrown when a catalogue was found but is not usable. Deliberately loud: an
 * authoring mistake in the Contentful field, or a missing fixture file, would
 * otherwise surface as a silently empty shop.
 */
export class CatalogSourceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CatalogSourceError';
  }
}

/**
 * Validate a raw Contentful `Object` value against the `Product` contract.
 *
 * Only the fields the adapter and the product pages actually rely on are
 * required. Anything malformed throws with the offending index and reason, so a
 * bad paste is a visible error rather than a missing product.
 */
export function parseMockProducts(raw: unknown, source: string): Product[] {
  if (!Array.isArray(raw)) {
    throw new CatalogSourceError(
      `${source} must be a JSON array of products, got ${
        raw === null ? 'null' : typeof raw
      }.`
    );
  }

  const problems: string[] = [];
  const seenIds = new Set<string>();

  raw.forEach((item, index) => {
    const at = `[${index}]`;
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      problems.push(`${at} is not an object`);
      return;
    }
    const p = item as Record<string, unknown>;
    const label = typeof p.id === 'string' ? `${at} (id "${p.id}")` : at;

    for (const key of ['id', 'title', 'slug', 'currency'] as const) {
      if (typeof p[key] !== 'string' || (p[key] as string).length === 0) {
        problems.push(`${label} ${key} must be a non-empty string`);
      }
    }
    for (const key of ['price', 'stock'] as const) {
      if (typeof p[key] !== 'number' || Number.isNaN(p[key] as number)) {
        problems.push(`${label} ${key} must be a number`);
      }
    }
    if (!Array.isArray(p.images)) {
      problems.push(`${label} images must be an array`);
    }
    if (typeof p.id === 'string') {
      if (seenIds.has(p.id)) {
        // Duplicate ids make getProduct() non-deterministic.
        problems.push(`${label} duplicate id`);
      }
      seenIds.add(p.id);
    }
  });

  if (problems.length > 0) {
    const shown = problems.slice(0, 10).join('; ');
    const more =
      problems.length > 10 ? ` (+${problems.length - 10} more)` : '';
    throw new CatalogSourceError(
      `${source} contains ${problems.length} invalid product${
        problems.length === 1 ? '' : 's'
      }: ${shown}${more}`
    );
  }

  return raw as Product[];
}

/** Tier 2 + 3: read a fixture file off disk. */
async function loadFixture(configuredFile?: string): Promise<CatalogResult> {
  const preferred =
    process.env.COMMERCE_FIXTURE_FILE?.trim() ||
    configuredFile?.trim() ||
    DEFAULT_FIXTURE;

  const candidates =
    preferred === DEFAULT_FIXTURE ? [preferred] : [preferred, DEFAULT_FIXTURE];

  let lastError: unknown;
  for (const file of candidates) {
    try {
      const raw = await loadMockData<unknown>(file);
      return {
        products: parseMockProducts(raw, `Mock fixture "${file}"`),
        origin: 'fixture',
        fixtureFile: file,
      };
    } catch (error) {
      lastError = error;
      // A malformed file is an error worth surfacing even if a fallback exists.
      if (error instanceof CatalogSourceError) throw error;
    }
  }

  // Never return an empty catalogue: with no Contentful value and no readable
  // fixture there is nothing to render, and an empty shop looks identical to a
  // working one with no stock.
  throw new CatalogSourceError(
    `No usable mock catalogue. Tried ${candidates
      .map((f) => `"${f}"`)
      .join(', ')} in lib/mock-data. Last error: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}

export interface ResolveCatalogOptions {
  /** `fixtureFile` from config/integrations/commerce.json. */
  fixtureFile?: string;
  locale?: string;
  preview?: boolean;
  /** Injected by tests; defaults to the Contentful-backed reader. */
  readSettings?: typeof getMockProductsFromSettings;
  onLog?: (level: 'info' | 'warn', message: string) => void;
}

/** Resolve the catalogue once, without caching. */
export async function resolveCatalog(
  opts: ResolveCatalogOptions = {}
): Promise<CatalogResult> {
  const read = opts.readSettings ?? getMockProductsFromSettings;
  const log = opts.onLog ?? (() => {});

  let raw: unknown;
  try {
    raw = await read({ locale: opts.locale, preview: opts.preview });
  } catch (error) {
    // Transport/scope failure. The fixture file is the intended fallback, so
    // this is a degradation the operator should see but not a hard stop.
    log(
      'warn',
      `Could not read siteSettings.mockProducts, falling back to fixture: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return loadFixture(opts.fixtureFile);
  }

  // Absent or blank field is the expected state in spaces that have not been
  // migrated, and in spaces that intentionally use the fixture.
  const isBlank =
    raw === undefined ||
    raw === null ||
    (Array.isArray(raw) && raw.length === 0) ||
    (typeof raw === 'object' && !Array.isArray(raw) && Object.keys(raw as object).length === 0);

  if (isBlank) {
    return loadFixture(opts.fixtureFile);
  }

  // Present but malformed is an authoring error — let it throw rather than
  // quietly serving the wrong brand's products from the fixture.
  const products = parseMockProducts(raw, 'siteSettings.mockProducts');
  return { products, origin: 'contentful' };
}

type CacheEntry = { at: number; result: CatalogResult };
const cache = new Map<string, CacheEntry>();

function ttlMs(configured?: number): number {
  const fromEnv = Number(process.env.COMMERCE_CATALOG_TTL_MS);
  if (Number.isFinite(fromEnv) && fromEnv >= 0) return fromEnv;
  if (typeof configured === 'number' && Number.isFinite(configured) && configured >= 0) {
    return configured;
  }
  return DEFAULT_TTL_MS;
}

/**
 * Resolve the catalogue with a short TTL.
 *
 * The TTL is what makes the Contentful field actually editable: `IntegrationFactory`
 * caches adapter instances in a module-level Map for the life of the server
 * process, so a catalogue loaded in `initialize()` would be frozen until the next
 * deploy. A TTL also keeps a category page with three product shelves from firing
 * three Contentful requests per view.
 */
export async function resolveCatalogCached(
  opts: ResolveCatalogOptions & { catalogTtlMs?: number } = {}
): Promise<CatalogResult> {
  const ttl = ttlMs(opts.catalogTtlMs);
  const key = `${opts.fixtureFile ?? DEFAULT_FIXTURE}|${opts.locale ?? ''}|${
    opts.preview ? 'preview' : 'published'
  }`;

  const hit = cache.get(key);
  if (hit && ttl > 0 && Date.now() - hit.at < ttl) return hit.result;

  const result = await resolveCatalog(opts);
  cache.set(key, { at: Date.now(), result });
  return result;
}

/** Test/dev helper — drops the TTL cache. */
export function clearCatalogCache(): void {
  cache.clear();
}
