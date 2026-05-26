/**
 * Single source of truth for resolving entry fields against market-specific
 * overrides. Imported by both the storefront frontend (preview + production)
 * and the Contentful App's effective-value preview.
 *
 * Precedence: market override -> base value -> caller-provided fallback.
 */

import { parseMarketOverrides } from "./schema";
import type { MarketOverridesValue } from "./types";

/**
 * Locate a market bucket case-insensitively. Editors sometimes save codes
 * as "NG" while URLs are conventionally lowercase ("/market/ng/..."); this
 * lookup matches either way so the merge layer doesn't silently miss
 * overrides. Exact-case matches still take precedence (cheaper + stable).
 */
function findMarketBucket(
  overrides: Record<string, Record<string, string>>,
  marketKey: string
): Record<string, string> | undefined {
  const direct = overrides[marketKey];
  if (direct) return direct;
  const lower = marketKey.toLowerCase();
  for (const [key, value] of Object.entries(overrides)) {
    if (key.toLowerCase() === lower) return value;
  }
  return undefined;
}

/**
 * Resolve a single field value for a given market.
 *
 * @param baseValue The entry's base field value.
 * @param overrides Raw value of the entry's `marketOverride` JSON field.
 * @param fieldId   The field ID to resolve (must match the entry's field ID).
 * @param marketKey Active market (e.g. "ng"). If undefined, returns base.
 */
export function resolveFieldForMarket<T = unknown>(
  baseValue: T,
  overrides: unknown,
  fieldId: string,
  marketKey: string | undefined
): T {
  if (!marketKey) return baseValue;
  const parsed: MarketOverridesValue = parseMarketOverrides(overrides);
  const marketBucket = findMarketBucket(parsed.overrides, marketKey);
  if (!marketBucket) return baseValue;
  if (!(fieldId in marketBucket)) return baseValue;
  return marketBucket[fieldId] as unknown as T;
}

/**
 * Resolve an entire fields object against a market. Returns a new object
 * with the same keys; values not present in the override are returned
 * untouched.
 */
export function resolveFieldsForMarket<T extends Record<string, unknown>>(
  baseFields: T,
  overrides: unknown,
  marketKey: string | undefined
): T {
  if (!marketKey) return baseFields;
  const parsed: MarketOverridesValue = parseMarketOverrides(overrides);
  const marketBucket = findMarketBucket(parsed.overrides, marketKey);
  if (!marketBucket || Object.keys(marketBucket).length === 0) return baseFields;

  const next: Record<string, unknown> = { ...baseFields };
  for (const [fieldId, value] of Object.entries(marketBucket)) {
    if (fieldId in next) next[fieldId] = value;
  }
  return next as T;
}

/**
 * Convenience helper that mirrors {@link resolveFieldForMarket} but accepts
 * an explicit fallback value used when both override and base are absent.
 */
export function resolveFieldWithFallback<T>(
  baseValue: T | undefined,
  overrides: unknown,
  fieldId: string,
  marketKey: string | undefined,
  fallback: T
): T {
  const resolved = resolveFieldForMarket<T | undefined>(
    baseValue,
    overrides,
    fieldId,
    marketKey
  );
  return resolved === undefined || resolved === null || resolved === ""
    ? fallback
    : (resolved as T);
}
