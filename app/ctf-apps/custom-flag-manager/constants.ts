/** Human-facing app name. Shown in the fallback location and the config screen. */
export const APP_NAME = "Custom Flag Manager";

/**
 * Contentful Personalization content types. These are created by the
 * Personalization/Ninetailed integration, not by this repo.
 */
export const CT_EXPERIENCE = "nt_experience";
export const CT_AUDIENCE = "nt_audience";

/** `nt_type` values. This app only ever writes experiments (PLAN.md §6.1). */
export const EXPERIENCE_TYPE_EXPERIMENT = "nt_experiment";

/** The `nt_config.components[].type` that denotes a custom flag. */
export const COMPONENT_TYPE_INLINE_VARIABLE = "InlineVariable";

/** Package the developer handoff snippet imports `useFlag` from (PLAN.md §6.5). */
export const FLAG_SDK_PACKAGE = "@ninetailed/experience.js-react";

/**
 * Docs link used by the empty state's "Learn about custom flags" action (PLAN.md §6.11).
 * Points at the personalization docs root rather than a guessed deep link — contentful.com
 * rate-limits automated requests, so the exact custom-flags page could not be verified.
 */
export const DOCS_CUSTOM_FLAGS =
  "https://www.contentful.com/developers/docs/personalization/";
