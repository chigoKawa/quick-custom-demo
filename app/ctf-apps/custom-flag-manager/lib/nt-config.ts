/**
 * Everything this app knows about the shape of `nt_experience.nt_config`.
 *
 * `nt_config` is an internal contract owned by the Personalization integration, not by us
 * (PLAN.md risk 1). It is already observably inconsistent in the wild — some entries store
 * `components` as an object rather than an array — and it will drift again. So all shape
 * knowledge lives here, in `parseConfig` and `buildConfig`, and nowhere else.
 *
 * Two rules that the rest of the app depends on:
 *
 * 1. `parseConfig` keeps the **raw** object. Every write spreads it and overwrites only the keys
 *    this app owns, so documented-but-unseen keys (`sticky`) survive a read-modify-write instead
 *    of being silently dropped (risk 4b). Never build a config from scratch when updating.
 * 2. Percentages cross the persistence boundary in exactly two functions — `pctToFraction` and
 *    `fractionToPct`. `traffic` and `distribution` are stored as 0–1 fractions and shown as
 *    integer percentages (risk 2). No inline `/ 100` anywhere else in the codebase.
 */

import { COMPONENT_TYPE_INLINE_VARIABLE } from "../constants";

/* ------------------------------------------------------------------ *
 * Value formats
 * ------------------------------------------------------------------ */

/** The four formats a custom flag value can take. All are supported by the API (PLAN.md §6.7). */
export type FlagFormat = "String" | "JSON" | "Number" | "Boolean";

export const FLAG_FORMATS: FlagFormat[] = ["String", "JSON", "Number", "Boolean"];

/** The `valueType` written into `nt_config` for each format. One table, used in both directions. */
const VALUE_TYPE_BY_FORMAT: Record<FlagFormat, string> = {
  JSON: "Object",
  String: "String",
  Number: "Number",
  Boolean: "Boolean",
};

const FORMAT_BY_VALUE_TYPE: Record<string, FlagFormat> = Object.fromEntries(
  Object.entries(VALUE_TYPE_BY_FORMAT).map(([format, valueType]) => [
    valueType,
    format as FlagFormat,
  ])
) as Record<string, FlagFormat>;

export function valueTypeForFormat(format: FlagFormat): string {
  return VALUE_TYPE_BY_FORMAT[format];
}

/**
 * `valueType` → format, with a `typeof` fallback so an entry written by a newer Personalization
 * release using a `valueType` this table does not know still gets a correct badge rather than a
 * blank one (PLAN.md §3.3).
 */
export function formatFromValueType(
  valueType: unknown,
  baselineValue?: unknown
): FlagFormat {
  if (typeof valueType === "string" && FORMAT_BY_VALUE_TYPE[valueType]) {
    return FORMAT_BY_VALUE_TYPE[valueType];
  }
  switch (typeof baselineValue) {
    case "boolean":
      return "Boolean";
    case "number":
      return "Number";
    case "string":
      return "String";
    default:
      return "JSON";
  }
}

/* ------------------------------------------------------------------ *
 * The percent / fraction boundary — the only two places it is crossed
 * ------------------------------------------------------------------ */

/** Integer percent (0–100) → stored fraction (0–1). */
export function pctToFraction(pct: number): number {
  return Math.round(pct) / 100;
}

/** Stored fraction (0–1) → integer percent (0–100). */
export function fractionToPct(fraction: number): number {
  return Math.round((Number(fraction) || 0) * 100);
}

/**
 * A distribution of integer percents → fractions that sum to exactly 1.
 *
 * Rounding each slice independently can miss 1 by a cent, and a distribution that does not sum to 1
 * is the failure that silently breaks an experiment. The last slice absorbs the remainder.
 */
export function percentsToFractions(percents: number[]): number[] {
  if (percents.length === 0) return [];
  const fractions = percents.map(pctToFraction);
  const head = fractions.slice(0, -1);
  const sumOfHead = head.reduce((a, b) => a + b, 0);
  // Keep two decimals: integer percents can never need more.
  const last = Math.round((1 - sumOfHead) * 100) / 100;
  return [...head, last];
}

/** Stored fractions → integer percents, for display. */
export function fractionsToPercents(fractions: unknown): number[] {
  if (!Array.isArray(fractions)) return [];
  return fractions.map((f) => fractionToPct(f as number));
}

/* ------------------------------------------------------------------ *
 * Semantic comparison
 * ------------------------------------------------------------------ */

/**
 * Canonical stringification: recursively key-sorted, so `{a:1,b:2}` and `{b:2,a:1}` compare equal.
 * Two flag values are at parity when their canonical forms match.
 */
export function canon(value: unknown): string {
  return JSON.stringify(sortDeep(value));
}

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === "object") {
    const source = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      sorted[key] = sortDeep(source[key]);
    }
    return sorted;
  }
  return value;
}

/** True when a variant value is indistinguishable from the baseline. */
export function isAtParity(variantValue: unknown, baselineValue: unknown): boolean {
  return canon(variantValue) === canon(baselineValue);
}

/* ------------------------------------------------------------------ *
 * Parsing
 * ------------------------------------------------------------------ */

/** A `components[]` entry that carries a custom flag. */
export interface InlineVariableComponent {
  type: string;
  key: string;
  valueType?: string;
  baseline?: { value?: unknown };
  variants?: Array<{ value?: unknown }>;
}

export interface ParsedConfig {
  /** The untouched config object. Spread this on every write so unknown keys survive. */
  raw: Record<string, unknown>;
  /** `components`, normalised to an array — some live entries store it as a bare object. */
  components: InlineVariableComponent[];
  /** Only the components that are custom flags. */
  inlineVariables: InlineVariableComponent[];
  /** Traffic as an integer percent. Absent traffic means 100% — the value every live entry has. */
  trafficPct: number;
  /** Distribution as integer percents, baseline first. */
  distributionPcts: number[];
  distributionType: string | null;
  primaryMetric: string | null;
}

/**
 * Read a raw `nt_config` into something the UI can use, tolerating every drift observed in the
 * space: `components` as an object, `components` missing, `primaryMetric` as `null` or `""`.
 */
export function parseConfig(rawConfig: unknown): ParsedConfig {
  const raw = (rawConfig && typeof rawConfig === "object" ? rawConfig : {}) as Record<
    string,
    unknown
  >;

  const components = normaliseComponents(raw.components);
  const primaryMetric =
    typeof raw.primaryMetric === "string" && raw.primaryMetric.length > 0
      ? raw.primaryMetric
      : null;

  return {
    raw,
    components,
    inlineVariables: components.filter(
      (component) => component.type === COMPONENT_TYPE_INLINE_VARIABLE
    ),
    trafficPct: raw.traffic === undefined ? 100 : fractionToPct(raw.traffic as number),
    distributionPcts: fractionsToPercents(raw.distribution),
    distributionType:
      typeof raw.distributionType === "string" ? raw.distributionType : null,
    primaryMetric,
  };
}

/**
 * `components` is an array in most entries and a bare object in four of them — real drift, observed
 * in this space (PLAN.md §3.1). Normalise once, here.
 */
function normaliseComponents(components: unknown): InlineVariableComponent[] {
  if (Array.isArray(components)) {
    return components.filter(isComponentLike);
  }
  if (components && typeof components === "object") {
    // An object-shaped `components` may be a single component, or a numeric-keyed map of them.
    const asComponent = components as Record<string, unknown>;
    if (isComponentLike(asComponent)) return [asComponent as unknown as InlineVariableComponent];
    return Object.values(asComponent).filter(isComponentLike);
  }
  return [];
}

function isComponentLike(value: unknown): value is InlineVariableComponent {
  return Boolean(value && typeof value === "object" && "type" in (value as object));
}

/** Variants normalised to an array — same drift guard as components. */
export function normaliseVariants(
  variants: unknown
): Array<{ value?: unknown }> {
  if (Array.isArray(variants)) return variants;
  if (variants && typeof variants === "object") {
    return Object.values(variants as Record<string, { value?: unknown }>);
  }
  return [];
}

/**
 * The value a component's baseline or variant actually carries.
 *
 * Every live custom flag stores it wrapped — `{ value: … }` — so that is what we build. Reading is
 * lenient: if a future or hand-edited entry stores the value bare, take it as-is rather than
 * rendering `undefined` (PLAN.md §6, "the one thing left to observe").
 */
export function unwrapValue(slot: unknown): unknown {
  if (slot && typeof slot === "object" && "value" in (slot as object)) {
    return (slot as { value?: unknown }).value;
  }
  return slot;
}

/* ------------------------------------------------------------------ *
 * Building
 * ------------------------------------------------------------------ */

export interface BuildConfigInput {
  key: string;
  format: FlagFormat;
  baselineValue: unknown;
  variantValues: unknown[];
  /** Integer percents, baseline first. Must sum to 100. */
  distributionPcts: number[];
  /** Integer percent of qualifying visitors entering the experiment. */
  trafficPct: number;
  distributionType: "even-split" | "manual";
  primaryMetric?: string | null;
  /**
   * The existing config when updating an entry. Spread so keys this app does not own — `sticky`,
   * or anything a newer release adds — are preserved rather than dropped (risk 4b).
   */
  existingConfig?: Record<string, unknown>;
}

export function buildConfig(input: BuildConfigInput): Record<string, unknown> {
  // Validate the *percents*, not the fractions. `percentsToFractions` makes the last
  // slice absorb the rounding remainder, so its output always sums to 1 — checking
  // there would be dead code that lets a bad manual split through silently.
  const pctSum = input.distributionPcts.reduce((a, b) => a + b, 0);
  if (input.distributionPcts.length === 0 || Math.round(pctSum) !== 100) {
    throw new Error(
      `Distribution must sum to 100%. Got ${input.distributionPcts.join(" + ")} = ${pctSum}%.`
    );
  }

  const distribution = percentsToFractions(input.distributionPcts);

  const component: InlineVariableComponent = {
    type: COMPONENT_TYPE_INLINE_VARIABLE,
    key: input.key,
    valueType: valueTypeForFormat(input.format),
    baseline: { value: input.baselineValue },
    variants: input.variantValues.map((value) => ({ value })),
  };

  return {
    ...(input.existingConfig ?? {}),
    components: [component],
    distribution,
    traffic: pctToFraction(input.trafficPct),
    distributionType: input.distributionType,
    ...(input.primaryMetric ? { primaryMetric: input.primaryMetric } : {}),
  };
}

/** An even split across `count` arms, as integer percents summing to exactly 100. */
export function evenSplitPercents(count: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor(100 / count);
  const percents = new Array(count).fill(base);
  let remainder = 100 - base * count;
  for (let i = 0; remainder > 0; i += 1, remainder -= 1) {
    percents[i % count] += 1;
  }
  return percents;
}
