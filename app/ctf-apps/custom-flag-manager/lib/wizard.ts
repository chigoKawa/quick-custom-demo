/**
 * The create-wizard draft and its rules (PLAN.md §1.7–1.9).
 *
 * Pure module: no React, no SDK. Everything the frame needs to decide — which steps are
 * reachable, whether `Continue` is blocked and why, whether submitting is safe — is a function
 * of the draft, so the rules can be read in one place instead of being spread across five step
 * components.
 *
 * Percentages stay percentages here. Conversion to the stored 0–1 fractions happens only in
 * `nt-config.ts` (risk 2).
 */

import { evenSplitPercents, isAtParity, type FlagFormat } from "./nt-config";
import {
  type JsonNode,
  nodeErrors,
  nodesFromValue,
  valueFromNodes,
} from "./json-tree";

/* ------------------------------------------------------------------ *
 * Steps
 * ------------------------------------------------------------------ */

export interface WizardStep {
  n: number;
  label: string;
}

/**
 * Five steps, and step 4 is always Delivery. The mock switched that label to `Audience` for a
 * personalization; creation here is experiments-only (§1.8 scope), so the branch is gone.
 */
export const WIZARD_STEPS: WizardStep[] = [
  { n: 1, label: "Basics" },
  { n: 2, label: "Flag definition" },
  { n: 3, label: "Values" },
  { n: 4, label: "Delivery" },
  { n: 5, label: "Review" },
];

export const FIRST_STEP = 1;
export const LAST_STEP = WIZARD_STEPS.length;

/* ------------------------------------------------------------------ *
 * The draft
 * ------------------------------------------------------------------ */

/** The baseline column always exists and is always first. */
export const BASELINE_ID = "baseline";

/**
 * One value column: the baseline, then one per variant.
 *
 * `value` is `undefined` until the author enters something — which is not the same as a value of
 * `false` or `0`, so `dirty` is tracked separately. The format-change confirm (§1.9) exists
 * because switching format has to clear these.
 */
export interface ValueColumn {
  id: string;
  /** `Baseline`, `Variant A`, … — the label the Values step and the review show. */
  label: string;
  value: unknown;
  dirty: boolean;
  /**
   * The raw text in a `Number` input while it is being typed. `""`, `"-"` and `"1."` are all
   * legitimate mid-typing states that are not numbers, so the text cannot live in `value` —
   * `value` holds the parsed number and goes `undefined` the moment the text stops parsing.
   * Unused by the other three formats: for `String` the text *is* the value, and `Boolean` has
   * no text state at all.
   */
  text?: string;
  /**
   * `JSON` only: the builder's tree (`lib/json-tree.ts`). `value` stays derived from this on
   * every edit, so the write path never reads `nodes`.
   *
   * It lives on the draft rather than in the step component because the wizard unmounts each
   * step on navigation — a tree held in component state would lose its expand/collapse state,
   * its ids and its mid-typing text the moment the author stepped back to check the flag key.
   */
  nodes?: JsonNode[];
  /** `JSON` only: which side of the Builder/Code toggle this column is showing. */
  view?: JsonView;
}

/** The two sides of the step-3 JSON toggle. */
export type JsonView = "builder" | "code";

export interface FlagDraft {
  name: string;
  description: string;
  key: string;
  format: FlagFormat;
  /** Field errors stay hidden until the author has been in the field once. */
  nameTouched: boolean;
  keyTouched: boolean;
  /** Acknowledgement that the key is already claimed elsewhere — required before submit (§1.9). */
  collisionAck: boolean;
  columns: ValueColumn[];
  /** `null` means an even split; step 4 replaces it with explicit percentages (phase 10). */
  distributionPcts: number[] | null;
  trafficPct: number;
  audienceId: string | null;
  primaryMetric: string | null;
}

/** Baseline plus one variant — the smallest experiment that is still an experiment. */
export function newColumns(): ValueColumn[] {
  return [
    { id: BASELINE_ID, label: "Baseline", value: undefined, dirty: false },
    { id: "variant-1", label: variantLabel(1), value: undefined, dirty: false },
  ];
}

/**
 * The first `Variant X` not already on a column. Counting columns instead would repeat a letter
 * after a removal — delete `Variant A` from a two-variant flag and the next `Add variant` would
 * produce a second `Variant B`.
 */
function nextVariantLabel(columns: ValueColumn[]): string {
  const taken = new Set(columns.map((column) => column.label));
  for (let index = 1; index <= 26; index += 1) {
    const label = variantLabel(index);
    if (!taken.has(label)) return label;
  }
  return variantLabel(columns.length);
}

/** `1 → Variant A`, `2 → Variant B`, … as in the mock. Past 26 it falls back to a number. */
export function variantLabel(index: number): string {
  if (index < 1 || index > 26) return `Variant ${index}`;
  return `Variant ${String.fromCharCode(64 + index)}`;
}

export function emptyDraft(): FlagDraft {
  return {
    name: "",
    description: "",
    key: "",
    format: "JSON",
    nameTouched: false,
    keyTouched: false,
    collisionAck: false,
    columns: newColumns(),
    distributionPcts: null,
    trafficPct: 100,
    audienceId: null,
    primaryMetric: null,
  };
}

/** The percentages actually in force: explicit if step 4 set them, otherwise an even split. */
export function distributionOf(draft: FlagDraft): number[] {
  return draft.distributionPcts ?? evenSplitPercents(draft.columns.length);
}

/** True when a format change would discard work the author has done (§1.9). */
export function hasEnteredValues(draft: FlagDraft): boolean {
  return draft.columns.some((column) => column.dirty);
}

/** Clears every column's value, keeping the columns themselves. */
export function clearValues(draft: FlagDraft): FlagDraft {
  return {
    ...draft,
    columns: draft.columns.map((column) => ({
      ...column,
      value: undefined,
      dirty: false,
      text: undefined,
      nodes: undefined,
      view: undefined,
    })),
  };
}

/* ------------------------------------------------------------------ *
 * Column operations (step 3)
 * ------------------------------------------------------------------ */

/**
 * Adds a variant, seeded from the baseline as the mock does — a variant that starts life as a
 * copy of the baseline is easier to edit into a difference than an empty one is to fill.
 *
 * The id is derived from the highest existing suffix rather than the column count, so removing
 * `variant-1` and adding another cannot reuse a live id. Labels are author-editable, so a manual
 * share is seeded at 0 (§1.10) and existing labels are left alone.
 */
export function addVariantColumn(draft: FlagDraft): FlagDraft {
  const suffixes = draft.columns
    .map((column) => Number(column.id.replace("variant-", "")))
    .filter((n) => Number.isFinite(n));
  const nextSuffix = (suffixes.length ? Math.max(...suffixes) : 0) + 1;
  const baseline = draft.columns.find((column) => column.id === BASELINE_ID);
  const seedValue = cloneValue(baseline?.value);

  return {
    ...draft,
    columns: [
      ...draft.columns,
      {
        id: `variant-${nextSuffix}`,
        label: nextVariantLabel(draft.columns),
        value: seedValue,
        dirty: baseline?.dirty ?? false,
        text: baseline?.text,
        // Rebuilt from the value rather than deep-copied, so the new column gets fresh node ids
        // (ids address mutations — two columns sharing one would edit in lockstep) and starts
        // fully expanded regardless of how the baseline was folded up.
        nodes: baseline?.nodes ? nodesFromValue(seedValue) : undefined,
        view: baseline?.view,
      },
    ],
    distributionPcts: draft.distributionPcts
      ? [...draft.distributionPcts, 0]
      : null,
  };
}

/** Removes a variant and its distribution slot. The baseline cannot be removed. */
export function removeVariantColumn(draft: FlagDraft, id: string): FlagDraft {
  if (id === BASELINE_ID) return draft;
  const index = draft.columns.findIndex((column) => column.id === id);
  if (index < 0) return draft;

  return {
    ...draft,
    columns: draft.columns.filter((column) => column.id !== id),
    // Labels are not re-lettered: the author may have renamed them, and silently renaming
    // `Variant C` to `Variant B` because something above it was deleted loses that intent.
    distributionPcts:
      draft.distributionPcts?.filter((_, i) => i !== index) ?? null,
  };
}

/** Writes a column's value. `text` carries the raw input for `Number` (see `ValueColumn.text`). */
export function setColumnValue(
  draft: FlagDraft,
  id: string,
  value: unknown,
  text?: string,
): FlagDraft {
  return {
    ...draft,
    columns: draft.columns.map((column) =>
      column.id === id ? { ...column, value, dirty: true, text } : column,
    ),
  };
}

/**
 * Writes a column's JSON tree and re-derives its value.
 *
 * `dirty` is set unconditionally: unlike the scalar editors, reaching the builder at all means
 * the author has seen and accepted the shape, and an empty object is a legitimate flag value.
 */
export function setColumnNodes(
  draft: FlagDraft,
  id: string,
  nodes: JsonNode[],
): FlagDraft {
  return {
    ...draft,
    columns: draft.columns.map((column) =>
      column.id === id
        ? { ...column, nodes, value: valueFromNodes(nodes), dirty: true }
        : column,
    ),
  };
}

/** Flips one column between the builder and the code editor. Not a value change. */
export function setColumnView(
  draft: FlagDraft,
  id: string,
  view: JsonView,
): FlagDraft {
  return {
    ...draft,
    columns: draft.columns.map((column) =>
      column.id === id ? { ...column, view } : column,
    ),
  };
}

/** Renames a variant column. */
export function renameColumn(
  draft: FlagDraft,
  id: string,
  label: string,
): FlagDraft {
  return {
    ...draft,
    columns: draft.columns.map((column) =>
      column.id === id ? { ...column, label } : column,
    ),
  };
}

function cloneValue(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  return JSON.parse(JSON.stringify(value));
}

/* ------------------------------------------------------------------ *
 * Values (step 3)
 * ------------------------------------------------------------------ */

export const NUMBER_ERROR = "Enter a number";

/**
 * The value to persist for a column.
 *
 * The one place the write path reads a column, so an untouched column cannot reach `buildConfig`
 * as `undefined` and be dropped by `JSON.stringify` — which would write `baseline: {}` rather
 * than a value. An untouched `Boolean` is `false` (the switch shows off, so that is what the
 * author sees) and an untouched `String` is `""`. `Number` is gated instead: there is no sensible
 * default number, so step 3 blocks until one is entered.
 */
export function resolvedColumnValue(
  column: ValueColumn,
  format: FlagFormat,
): unknown {
  switch (format) {
    case "Boolean":
      return column.value === true;
    case "String":
      return typeof column.value === "string" ? column.value : "";
    case "JSON":
      // Derived, not read from `value`: an untouched JSON column has never been through
      // `setColumnNodes`, and `undefined` would be dropped by `JSON.stringify` on the way into
      // the entry. `{}` is what the empty builder shows, so `{}` is what gets written.
      return valueFromNodes(column.nodes ?? []);
    default:
      return column.value;
  }
}

/** `Enter a number` when the text in a `Number` input does not parse, else `null`. */
export function numberError(
  column: ValueColumn,
  format: FlagFormat,
): string | null {
  if (format !== "Number") return null;
  const text = column.text ?? "";
  if (text.trim().length === 0) return null;
  return typeof column.value === "number" ? null : NUMBER_ERROR;
}

/**
 * Which variants currently say the same thing as the baseline (§1.10).
 *
 * Not an error — a variant at parity is legal, it just produces no observable change, which is
 * almost always a mistake the author wants to see before they ship it.
 */
export function parityNotes(
  draft: FlagDraft,
): Array<{ id: string; label: string; same: boolean }> {
  const baseline = draft.columns.find((column) => column.id === BASELINE_ID);
  const baselineValue = baseline
    ? resolvedColumnValue(baseline, draft.format)
    : undefined;

  return draft.columns
    .filter((column) => column.id !== BASELINE_ID)
    .map((column) => ({
      id: column.id,
      label: column.label,
      same: isAtParity(resolvedColumnValue(column, draft.format), baselineValue),
    }));
}

/**
 * Why step 3 blocks, or `null`.
 *
 * `Boolean` always has a value and an empty `String` is a legitimate string, so those two never
 * block. The mock had no step-3 gate at all because it shipped prefilled demo values and never
 * wrote anything; this app writes, and a `Number` flag whose value is not a number — or a JSON
 * flag with an empty or duplicated key — is a broken entry.
 *
 * A column left in Code view holding unparseable text is deliberately *not* blocked: the code
 * editor only ever propagates a successful parse, so the tree still holds the last valid value
 * and whatever is written is valid JSON. The editor shows its own parse error meanwhile.
 */
export function valuesBlockedReason(draft: FlagDraft): string | null {
  if (draft.format === "JSON") {
    const broken = draft.columns.some(
      (column) => nodeErrors(column.nodes ?? []).size > 0,
    );
    return broken ? "Fix the highlighted fields in the JSON builder." : null;
  }
  if (draft.format !== "Number") return null;
  const complete = draft.columns.every(
    (column) => typeof column.value === "number",
  );
  return complete ? null : "Enter a number for the baseline and every variant.";
}

/* ------------------------------------------------------------------ *
 * Validation
 * ------------------------------------------------------------------ */

export const KEY_PATTERN = /^[a-z0-9_-]+$/;

export const NAME_REQUIRED_ERROR = "This field is required";
export const NAME_TAKEN_ERROR =
  "An optimization with this name already exists.";
export const KEY_FORMAT_ERROR =
  "Use lowercase letters, numbers, underscores or hyphens only. No spaces.";
export const KEY_TAKEN_WARNING = "Use a unique key";

/**
 * What the registry contributes to validation: every flag key in the space, and every experience
 * name. Names are compared case-insensitively even though `nt_name` uniqueness is exact — a
 * near-duplicate name is a usability problem for the author either way.
 */
export interface WizardContext {
  /** Flag key → the experiences that already define it, so the warning can name them. */
  keyOwners: Map<string, string[]>;
  existingNames: Set<string>;
}

export const EMPTY_CONTEXT: WizardContext = {
  keyOwners: new Map(),
  existingNames: new Set(),
};

/** `nt_name` is unique — a duplicate 422s at submit, after the whole wizard (risk 3). */
export function isNameTaken(draft: FlagDraft, context: WizardContext): boolean {
  const name = draft.name.trim().toLowerCase();
  return name.length > 0 && context.existingNames.has(name);
}

/** The error to show under the Name field, or `null`. */
export function nameError(
  draft: FlagDraft,
  context: WizardContext,
): string | null {
  if (draft.nameTouched && draft.name.trim().length === 0)
    return NAME_REQUIRED_ERROR;
  if (isNameTaken(draft, context)) return NAME_TAKEN_ERROR;
  return null;
}

/** The error to show under the Flag key field, or `null`. */
export function keyError(draft: FlagDraft): string | null {
  if (!draft.keyTouched || draft.key.length === 0) return null;
  return KEY_PATTERN.test(draft.key) ? null : KEY_FORMAT_ERROR;
}

/**
 * True when another experience already claims this key. Not an error: it is legal, it just makes
 * resolution non-deterministic, so the author has to acknowledge it before submitting.
 */
export function isKeyClaimed(
  draft: FlagDraft,
  context: WizardContext,
): boolean {
  return draft.key.length > 0 && context.keyOwners.has(draft.key);
}

/** The experiences already using this key, in registry order. */
export function keyOwnersOf(
  draft: FlagDraft,
  context: WizardContext,
): string[] {
  return context.keyOwners.get(draft.key) ?? [];
}

/* ------------------------------------------------------------------ *
 * Frame rules
 * ------------------------------------------------------------------ */

/**
 * Why `Continue` is disabled on this step, or `null` if it is not.
 *
 * The three messages from the mock, plus one for a duplicate name: the mock had no name
 * uniqueness check, but skipping it means the author discovers the clash as a 422 after five
 * steps (risk 3).
 */
export function blockedReason(
  step: number,
  draft: FlagDraft,
  context: WizardContext,
): string | null {
  switch (step) {
    case 1:
      if (draft.name.trim().length === 0) return "Name is required.";
      if (isNameTaken(draft, context)) return "Choose a unique name.";
      return null;
    case 2:
      if (!KEY_PATTERN.test(draft.key)) return "Enter a valid flag key.";
      return null;
    case 3:
      return valuesBlockedReason(draft);
    case 4: {
      const sum = distributionOf(draft).reduce((total, pct) => total + pct, 0);
      return Math.round(sum) === 100 ? null : "Distribution must sum to 100%.";
    }
    default:
      // Step 5 gates on `submitBlockedReason`.
      return null;
  }
}

/** Why submit is disabled on the review step, or `null`. */
export function submitBlockedReason(
  draft: FlagDraft,
  context: WizardContext,
): string | null {
  for (const step of [1, 2, 3, 4]) {
    const reason = blockedReason(step, draft, context);
    if (reason) return reason;
  }
  if (isKeyClaimed(draft, context) && !draft.collisionAck) {
    return "Acknowledge the duplicate key to continue.";
  }
  return null;
}

/**
 * The furthest step the author may jump to: the one after the last step that validates.
 *
 * Steps beyond it are locked rather than merely invalid, which is what the stepper renders at
 * `opacity 0.55`. Walking forward from step 1 means fixing step 1 re-locks nothing that was
 * already reachable.
 */
export function maxReachableStep(
  draft: FlagDraft,
  context: WizardContext,
): number {
  let step = FIRST_STEP;
  while (step < LAST_STEP && blockedReason(step, draft, context) === null) {
    step += 1;
  }
  return step;
}
