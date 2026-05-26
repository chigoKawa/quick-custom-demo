/**
 * Shared types for the Market Override Helper.
 *
 * These types are consumed by both the Contentful App (under
 * `app/ctf-apps/market-override-helper/`) and the storefront frontend so
 * that the merge contract is identical in preview and production.
 */

export const MARKET_OVERRIDES_SCHEMA_VERSION = 1 as const;

/**
 * Default field ID expected on overrideable entries. Matches what's currently
 * configured on the `heroModule` content type. Override per-call site if you
 * use a different field ID; keep this constant in sync if the convention
 * changes.
 */
export const MARKET_OVERRIDE_FIELD_ID = "marketOverride" as const;

/** Field types supported as overrideable in v1. */
export const SUPPORTED_FIELD_TYPES_V1 = ["Symbol", "Text"] as const;
export type SupportedFieldType = (typeof SUPPORTED_FIELD_TYPES_V1)[number];

/** Merge precedence rule. v1 always resolves the market value over base. */
export type MergePrecedence = "marketOverrideThenBase";

/**
 * Value stored in the `marketOverrides` JSON Object field on an entry.
 * Only field IDs whitelisted for the entry's content type may appear here.
 */
export interface MarketOverridesValue {
  version: typeof MARKET_OVERRIDES_SCHEMA_VERSION;
  /** Keyed by market key (e.g. "ng", "uk"). Each value maps fieldId -> override. */
  overrides: Record<string, Record<string, string>>;
}

/**
 * Configuration of the Contentful content type that represents a market.
 * The actual market list lives in Contentful as entries of this type;
 * editors pick them in the field editor.
 */
export interface MarketContentTypeMapping {
  /** Content type ID (e.g. "market"). */
  id: string;
  /** Field ID on the market content type that stores the stable market code (Symbol). */
  codeFieldId: string;
  /** Field ID used for the editor-facing label (typically the content type's displayField). */
  displayFieldId: string;
  /** Optional field ID linking to an image asset used as the flag. */
  flagFieldId?: string;
}

/** Per content type, which fields editors may override. */
export interface ContentTypeOverrideConfig {
  /** Whitelisted field IDs for this content type. */
  fields: string[];
  /** Optional per-type override of supported field types. */
  fieldTypes?: SupportedFieldType[];
}

export interface OverrideLimits {
  maxMarketsPerEntry: number;
  maxOverridesPerMarket: number;
}

/**
 * Installation parameters persisted on the app. Stored under
 * `sdk.parameters.installation`. The list of markets is sourced at
 * runtime by reading entries of {@link marketContentType}.
 */
export interface MarketOverrideInstallationParameters {
  marketContentType: MarketContentTypeMapping;
  contentTypes: Record<string, ContentTypeOverrideConfig>;
  /** Default supported types for content types that don't declare their own. */
  supportedFieldTypes: SupportedFieldType[];
  /** Field IDs that must never be overrideable, even if listed in a content type config. */
  protectedFields?: string[];
  limits: OverrideLimits;
  mergePrecedence: MergePrecedence;
}
