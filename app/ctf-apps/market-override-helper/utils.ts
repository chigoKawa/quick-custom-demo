import {
  SUPPORTED_FIELD_TYPES_V1,
  type ContentTypeOverrideConfig,
  type MarketContentTypeMapping,
  type MarketOverrideInstallationParameters,
  type SupportedFieldType,
} from "@/lib/market-overrides";
import { defaultInstallationParameters, DEFAULT_MARKET_CONTENT_TYPE } from "./constants";

/**
 * Read installation parameters from the SDK and patch in defaults so the
 * rest of the app can assume a fully-populated shape.
 *
 * Also migrates legacy v0 configs that used inline `markets: {key,label}[]`
 * by silently dropping that field. The configured content type defaults to
 * "market" with the canonical field IDs.
 */
export function resolveInstallationParameters(
  raw: unknown
): MarketOverrideInstallationParameters {
  const defaults = defaultInstallationParameters();
  if (!raw || typeof raw !== "object") return defaults;

  const r = raw as Partial<MarketOverrideInstallationParameters> & {
    markets?: unknown; // legacy v0 field, ignored
  };

  const rawMapping = (r.marketContentType ?? {}) as Partial<MarketContentTypeMapping>;
  const marketContentType: MarketContentTypeMapping = {
    id: typeof rawMapping.id === "string" && rawMapping.id.length > 0
      ? rawMapping.id
      : DEFAULT_MARKET_CONTENT_TYPE.id,
    codeFieldId:
      typeof rawMapping.codeFieldId === "string" && rawMapping.codeFieldId.length > 0
        ? rawMapping.codeFieldId
        : DEFAULT_MARKET_CONTENT_TYPE.codeFieldId,
    displayFieldId:
      typeof rawMapping.displayFieldId === "string" && rawMapping.displayFieldId.length > 0
        ? rawMapping.displayFieldId
        : DEFAULT_MARKET_CONTENT_TYPE.displayFieldId,
    flagFieldId:
      typeof rawMapping.flagFieldId === "string" && rawMapping.flagFieldId.length > 0
        ? rawMapping.flagFieldId
        : DEFAULT_MARKET_CONTENT_TYPE.flagFieldId,
  };

  const contentTypes: Record<string, ContentTypeOverrideConfig> = {};
  if (r.contentTypes && typeof r.contentTypes === "object") {
    for (const [ctId, cfg] of Object.entries(r.contentTypes)) {
      if (!cfg || typeof cfg !== "object") continue;
      const fields = Array.isArray((cfg as ContentTypeOverrideConfig).fields)
        ? (cfg as ContentTypeOverrideConfig).fields.filter((f) => typeof f === "string")
        : [];
      const fieldTypes = Array.isArray((cfg as ContentTypeOverrideConfig).fieldTypes)
        ? (cfg as ContentTypeOverrideConfig).fieldTypes!.filter(
            (t): t is SupportedFieldType =>
              (SUPPORTED_FIELD_TYPES_V1 as readonly string[]).includes(t)
          )
        : undefined;
      contentTypes[ctId] = { fields, fieldTypes };
    }
  }

  const supportedFieldTypes =
    Array.isArray(r.supportedFieldTypes) && r.supportedFieldTypes.length > 0
      ? r.supportedFieldTypes.filter((t): t is SupportedFieldType =>
          (SUPPORTED_FIELD_TYPES_V1 as readonly string[]).includes(t)
        )
      : defaults.supportedFieldTypes;

  return {
    marketContentType,
    contentTypes,
    supportedFieldTypes:
      supportedFieldTypes.length > 0 ? supportedFieldTypes : defaults.supportedFieldTypes,
    protectedFields: Array.isArray(r.protectedFields)
      ? r.protectedFields.filter((f) => typeof f === "string")
      : [],
    limits: {
      maxMarketsPerEntry:
        typeof r.limits?.maxMarketsPerEntry === "number" && r.limits.maxMarketsPerEntry > 0
          ? r.limits.maxMarketsPerEntry
          : defaults.limits.maxMarketsPerEntry,
      maxOverridesPerMarket:
        typeof r.limits?.maxOverridesPerMarket === "number" &&
        r.limits.maxOverridesPerMarket > 0
          ? r.limits.maxOverridesPerMarket
          : defaults.limits.maxOverridesPerMarket,
    },
    mergePrecedence: "marketOverrideThenBase",
  };
}

/**
 * Resolve which fields are actually overrideable for a content type.
 * Filters the whitelist by what still exists on the model, by supported
 * field types, and by the global protectedFields blacklist.
 *
 * Generic over the input field shape so callers keep `name`, `localized`, etc.
 */
export function getOverrideableFields<F extends { id: string; type: string }>(
  params: MarketOverrideInstallationParameters,
  contentTypeId: string,
  contentTypeFields: ReadonlyArray<F>
): F[] {
  const ctConfig = params.contentTypes[contentTypeId];
  if (!ctConfig) return [];

  const allowed = new Set(ctConfig.fields);
  const protectedSet = new Set(params.protectedFields ?? []);
  const supportedTypes = new Set<string>(
    ctConfig.fieldTypes && ctConfig.fieldTypes.length > 0
      ? ctConfig.fieldTypes
      : params.supportedFieldTypes
  );

  return contentTypeFields.filter(
    (f) => allowed.has(f.id) && supportedTypes.has(f.type) && !protectedSet.has(f.id)
  );
}

/** True when the current content type has any field whitelisted. */
export function isContentTypeSupported(
  params: MarketOverrideInstallationParameters,
  contentTypeId: string
): boolean {
  const ct = params.contentTypes[contentTypeId];
  return Boolean(ct && ct.fields.length > 0);
}

// ─── Market entry fetching ────────────────────────────────────────────

export interface MarketEntry {
  /** Contentful sys.id of the market entry. */
  id: string;
  /** Value of the configured `codeFieldId`. Used as the JSON key in overrides. */
  code: string;
  /** Value of the configured `displayFieldId`. */
  label: string;
  /** Resolved flag image URL, if a flag asset is linked and has a file. */
  flagUrl?: string;
  /** True when the entry is published (not draft). */
  published: boolean;
}

interface FetchMarketsOptions {
  cma: any;
  environmentId: string;
  defaultLocale: string;
  mapping: MarketContentTypeMapping;
}

function readLocalized<T>(
  field: Record<string, T> | undefined,
  defaultLocale: string
): T | undefined {
  if (!field) return undefined;
  return field[defaultLocale] ?? Object.values(field)[0];
}

/**
 * Fetch market entries via CMA, resolve flag assets in a single batch, and
 * normalize into a flat list usable by the field editor.
 *
 * Throws when the configured content type doesn't exist — callers should
 * handle the error and surface a friendly message.
 */
export async function fetchMarketEntries(
  options: FetchMarketsOptions
): Promise<MarketEntry[]> {
  const { cma, environmentId, defaultLocale, mapping } = options;

  const response = await cma.entry.getMany({
    environmentId,
    query: {
      content_type: mapping.id,
      limit: 200,
      order: `fields.${mapping.codeFieldId}`,
    },
  });

  const items: any[] = response?.items ?? [];

  // Collect flag asset IDs for a single batched fetch.
  const flagAssetIds = new Set<string>();
  if (mapping.flagFieldId) {
    for (const item of items) {
      const flagLink = readLocalized<any>(
        item.fields?.[mapping.flagFieldId],
        defaultLocale
      );
      const id = flagLink?.sys?.id;
      if (typeof id === "string") flagAssetIds.add(id);
    }
  }

  const assetsById = new Map<string, any>();
  if (flagAssetIds.size > 0) {
    try {
      const assetsResp = await cma.asset.getMany({
        environmentId,
        query: { "sys.id[in]": Array.from(flagAssetIds).join(",") },
      });
      for (const asset of (assetsResp?.items ?? []) as any[]) {
        if (asset?.sys?.id) assetsById.set(asset.sys.id, asset);
      }
    } catch {
      // Non-fatal — flags just won't render.
    }
  }

  const markets: MarketEntry[] = [];
  for (const item of items) {
    const code = readLocalized<string>(
      item.fields?.[mapping.codeFieldId],
      defaultLocale
    );
    if (typeof code !== "string" || code.length === 0) continue;

    const label =
      readLocalized<string>(item.fields?.[mapping.displayFieldId], defaultLocale) ??
      code;

    let flagUrl: string | undefined;
    if (mapping.flagFieldId) {
      const flagLink = readLocalized<any>(
        item.fields?.[mapping.flagFieldId],
        defaultLocale
      );
      const assetId = flagLink?.sys?.id;
      if (assetId) {
        const asset = assetsById.get(assetId);
        const url = readLocalized<{ url?: string }>(asset?.fields?.file, defaultLocale)?.url;
        if (typeof url === "string") {
          flagUrl = url.startsWith("//") ? `https:${url}` : url;
        }
      }
    }

    markets.push({
      id: item.sys.id,
      code,
      label,
      flagUrl,
      published: Boolean(item.sys.publishedAt),
    });
  }

  return markets;
}
