import {
  SUPPORTED_FIELD_TYPES_V1,
  type MarketContentTypeMapping,
  type MarketOverrideInstallationParameters,
} from "@/lib/market-overrides";

export const APP_NAME = "Market Override Helper";

export const DEFAULT_MAX_MARKETS_PER_ENTRY = 10;
export const DEFAULT_MAX_OVERRIDES_PER_MARKET = 8;

/** Defaults match the canonical `market` content type schema. */
export const DEFAULT_MARKET_CONTENT_TYPE: MarketContentTypeMapping = {
  id: "market",
  codeFieldId: "code",
  displayFieldId: "internalName",
  flagFieldId: "flag",
};

/** Factory for a fresh, valid installation parameters object. */
export function defaultInstallationParameters(): MarketOverrideInstallationParameters {
  return {
    marketContentType: { ...DEFAULT_MARKET_CONTENT_TYPE },
    contentTypes: {
      // Sensible defaults so freshly-installed spaces don't see "not configured"
      // notices on the content types we ship with override support out of the
      // box. Admins can edit these in the app config screen.
      heroModule: { fields: ["headline", "subCopy"] },
      productStory: { fields: ["productName"] },
      baseButton: { fields: ["label"] },
    },
    supportedFieldTypes: [...SUPPORTED_FIELD_TYPES_V1],
    protectedFields: [],
    limits: {
      maxMarketsPerEntry: DEFAULT_MAX_MARKETS_PER_ENTRY,
      maxOverridesPerMarket: DEFAULT_MAX_OVERRIDES_PER_MARKET,
    },
    mergePrecedence: "marketOverrideThenBase",
  };
}
