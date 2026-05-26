/**
 * Lightweight validator + normalizer for the `marketOverrides` JSON payload.
 *
 * Used by the Contentful App before persisting, and by the frontend merge
 * utility to safely ignore malformed data instead of crashing renders.
 */

import {
  MARKET_OVERRIDES_SCHEMA_VERSION,
  type MarketOverridesValue,
} from "./types";

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  value: MarketOverridesValue;
}

const EMPTY_VALUE: MarketOverridesValue = {
  version: MARKET_OVERRIDES_SCHEMA_VERSION,
  overrides: {},
};

/**
 * Parse and normalize an unknown value into a {@link MarketOverridesValue}.
 *
 * Drops unknown shapes silently and returns an empty payload so callers can
 * always trust the returned `value` to be schema-conformant.
 */
export function parseMarketOverrides(raw: unknown): MarketOverridesValue {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ...EMPTY_VALUE };

  const r = raw as { version?: unknown; overrides?: unknown };
  const overrides: Record<string, Record<string, string>> = {};

  if (r.overrides && typeof r.overrides === "object" && !Array.isArray(r.overrides)) {
    for (const [marketKey, fields] of Object.entries(r.overrides)) {
      if (!fields || typeof fields !== "object" || Array.isArray(fields)) continue;
      const cleaned: Record<string, string> = {};
      for (const [fieldId, value] of Object.entries(fields as Record<string, unknown>)) {
        if (typeof value === "string") cleaned[fieldId] = value;
      }
      if (Object.keys(cleaned).length > 0) overrides[marketKey] = cleaned;
    }
  }

  return { version: MARKET_OVERRIDES_SCHEMA_VERSION, overrides };
}

/**
 * Validate a payload against the configured markets, content type whitelist,
 * and hard limits. Returns the normalized value plus collected errors.
 */
export function validateMarketOverrides(
  raw: unknown,
  options: {
    allowedMarkets: string[];
    allowedFieldsForContentType: string[];
    protectedFields?: string[];
    maxMarketsPerEntry: number;
    maxOverridesPerMarket: number;
  }
): ValidationResult {
  const value = parseMarketOverrides(raw);
  const errors: string[] = [];

  const allowedMarketSet = new Set(options.allowedMarkets);
  const allowedFieldSet = new Set(options.allowedFieldsForContentType);
  const protectedSet = new Set(options.protectedFields ?? []);

  const marketKeys = Object.keys(value.overrides);
  if (marketKeys.length > options.maxMarketsPerEntry) {
    errors.push(
      `Too many markets (${marketKeys.length}). Max allowed: ${options.maxMarketsPerEntry}.`
    );
  }

  for (const marketKey of marketKeys) {
    if (!allowedMarketSet.has(marketKey)) {
      errors.push(`Market "${marketKey}" is not in the configured market list.`);
    }
    const fields = value.overrides[marketKey];
    const fieldIds = Object.keys(fields);
    if (fieldIds.length > options.maxOverridesPerMarket) {
      errors.push(
        `Market "${marketKey}" has ${fieldIds.length} overrides. Max allowed: ${options.maxOverridesPerMarket}.`
      );
    }
    for (const fieldId of fieldIds) {
      if (protectedSet.has(fieldId)) {
        errors.push(`Field "${fieldId}" is protected and cannot be overridden.`);
      }
      if (!allowedFieldSet.has(fieldId)) {
        errors.push(
          `Field "${fieldId}" is not in the override whitelist for this content type.`
        );
      }
    }
  }

  return { ok: errors.length === 0, errors, value };
}

/**
 * Strip empty market objects and return a fresh payload. If no overrides
 * remain, returns `null` so callers can clear the field entirely.
 */
export function compactMarketOverrides(
  value: MarketOverridesValue
): MarketOverridesValue | null {
  const overrides: Record<string, Record<string, string>> = {};
  for (const [marketKey, fields] of Object.entries(value.overrides)) {
    if (fields && Object.keys(fields).length > 0) overrides[marketKey] = fields;
  }
  if (Object.keys(overrides).length === 0) return null;
  return { version: MARKET_OVERRIDES_SCHEMA_VERSION, overrides };
}
