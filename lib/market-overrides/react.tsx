"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import {
  resolveFieldForMarket,
  resolveFieldsForMarket,
} from "./merge";
import { MARKET_OVERRIDE_FIELD_ID } from "./types";

const MarketContext = createContext<string | null>(null);

/**
 * Client-side provider for the active market code. Mount once at the site
 * root; the value is read from the `x-market-code` request header by a
 * server-rendered bridge component.
 */
export function MarketProvider({
  marketCode,
  children,
}: {
  marketCode: string | null;
  children: ReactNode;
}) {
  return (
    <MarketContext.Provider value={marketCode}>{children}</MarketContext.Provider>
  );
}

/** Returns the active market code, or `null` outside `/market/<code>/...` URLs. */
export function useActiveMarket(): string | null {
  return useContext(MarketContext);
}

/**
 * Resolve a single Contentful entry's fields against the active market.
 *
 * Reads the `marketOverride` sibling field of the entry by default. Returns
 * the original fields object untouched when no market is active or the
 * entry has no overrides for the active market.
 */
export function useMarketResolvedFields<T extends Record<string, unknown>>(
  entry: { fields: T } | null | undefined,
  options: { fieldId?: string } = {}
): T | undefined {
  const market = useActiveMarket();
  const fieldId = options.fieldId ?? MARKET_OVERRIDE_FIELD_ID;
  return useMemo(() => {
    if (!entry?.fields) return undefined;
    if (!market) return entry.fields;
    const overrides = (entry.fields as Record<string, unknown>)[fieldId];
    return resolveFieldsForMarket(entry.fields, overrides, market);
  }, [entry, market, fieldId]);
}

/**
 * Resolve a single field value against the active market.
 *
 * Useful when you need the overridden value for one specific field rather
 * than the full fields object. The base value is returned when no market is
 * active or no override exists.
 */
export function useMarketResolvedValue<T>(
  baseValue: T,
  overrides: unknown,
  fieldId: string
): T {
  const market = useActiveMarket();
  return useMemo(
    () => resolveFieldForMarket(baseValue, overrides, fieldId, market ?? undefined),
    [baseValue, overrides, fieldId, market]
  );
}
