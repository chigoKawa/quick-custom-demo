/**
 * Storefront-side helpers for fetching market entries from Contentful.
 *
 * Lives alongside the rest of the CDA wrappers (not under
 * `lib/market-overrides/`) because it talks to Contentful — not part of the
 * pure merge contract.
 */

import { notFound } from "next/navigation";
import type { Asset, Entry, EntryFieldTypes, EntrySkeletonType } from "contentful";
import { getEntries } from "@/lib/contentful";
import { getActiveMarketCode } from "@/lib/market-overrides/server";

interface MarketFields {
  internalName: EntryFieldTypes.Symbol;
  code: EntryFieldTypes.Symbol;
  description?: EntryFieldTypes.Text;
  locales?: EntryFieldTypes.Array<EntryFieldTypes.Symbol>;
  flag?: Asset;
}

export type MarketSkeleton = EntrySkeletonType<MarketFields, "market">;
export type IMarket = Entry<MarketSkeleton>;

/** Storefront-facing market summary used by the switcher and validators. */
export interface MarketSummary {
  /** Contentful sys.id. */
  id: string;
  /** Stable code field (preserves the editor's casing). */
  code: string;
  /** Lowercased code used for case-insensitive comparisons. */
  codeLower: string;
  /** Editor-facing label. */
  label: string;
  /** Resolved flag image URL, if a flag asset is linked. */
  flagUrl?: string;
}

function normalizeAssetUrl(url: string | undefined): string | undefined {
  if (typeof url !== "string" || url.length === 0) return undefined;
  return url.startsWith("//") ? `https:${url}` : url;
}

function toSummary(entry: IMarket): MarketSummary | null {
  const code = entry.fields?.code;
  if (typeof code !== "string" || code.length === 0) return null;
  const label =
    typeof entry.fields?.internalName === "string" && entry.fields.internalName.length > 0
      ? entry.fields.internalName
      : code;
  const flagAsset = entry.fields?.flag as Asset | undefined;
  const flagUrl = normalizeAssetUrl(flagAsset?.fields?.file?.url as string | undefined);
  return {
    id: entry.sys.id,
    code,
    codeLower: code.toLowerCase(),
    label,
    flagUrl,
  };
}

interface FetchMarketsOptions {
  locale?: string;
  isPreview?: boolean;
  timelineToken?: string | null;
  environmentId?: string | null;
}

/**
 * Fetch all published market entries (or draft + published when preview is
 * enabled). Linked flag assets are returned in `Asset` form by Contentful's
 * SDK when `include` is set, so we avoid an extra request.
 */
export async function getMarkets(
  options: FetchMarketsOptions = {}
): Promise<MarketSummary[]> {
  try {
    const entries = await getEntries<MarketSkeleton>(
      {
        content_type: "market",
        include: 1,
        limit: 200,
        order: "fields.internalName",
        ...(options.locale ? { locale: options.locale } : {}),
      },
      Boolean(options.isPreview),
      options.timelineToken ?? null,
      options.environmentId ?? null
    );
    return (entries as IMarket[])
      .map(toSummary)
      .filter((m): m is MarketSummary => Boolean(m));
  } catch (err) {
    console.error("[markets] getMarkets failed", err);
    return [];
  }
}

/**
 * Read the active market code from request headers, validate it against
 * published market entries, and 404 if it's not a known code. When no
 * market segment is present in the URL, returns `null` (no-op).
 *
 * Call at the top of any page that should accept `/market/<code>/...`
 * traffic. Preview mode bypasses validation if `bypassInPreview` is set,
 * which is useful when editors are testing draft markets.
 */
export async function requireValidActiveMarket(
  options: { isPreview?: boolean; bypassInPreview?: boolean } = {}
): Promise<MarketSummary | null> {
  const code = await getActiveMarketCode();
  if (!code) return null;

  if (options.isPreview && options.bypassInPreview) {
    // Preview editors may be staging a brand-new market entry; don't 404.
    return null;
  }

  const markets = await getMarkets({ isPreview: options.isPreview });
  const lower = code.toLowerCase();
  const match = markets.find((m) => m.codeLower === lower);
  if (!match) notFound();
  return match;
}
