/**
 * The developer handoff snippet (PLAN.md §6.5).
 *
 * Lives in `lib/` rather than in the review step because the registry's row menu offers
 * `Copy developer snippet` on flags that already exist — the same snippet, built from a
 * `FlagRow` instead of a draft.
 *
 * Two deliberate divergences from the design mock:
 *
 * 1. The mock imports from `@contentful/personalization-react`, which does not exist on npm.
 *    The GA `@contentful/optimization-*` line (1.2.0) ships no custom-flag API at all — there is
 *    no `useFlag` in its typings. `useFlag` lives in `@ninetailed/experience.js-react`, which is
 *    what Personalization actually installs, so that is what the snippet imports
 *    (`FLAG_SDK_PACKAGE`).
 * 2. The mock writes `const x = useFlag(...)`. The real hook returns
 *    `{ status, value, error }`, so a bare assignment would hand the developer the wrapper and
 *    they would discover it at runtime. The snippet destructures `value`.
 *
 * The mock also re-indents a multi-line JSON default by two spaces, which lands the inner keys at
 * four and the closing brace at two. Since the statement starts at column 0, plain
 * `JSON.stringify(…, null, 2)` is already the indentation a developer would have typed, so the
 * re-indent is dropped.
 */

import { FLAG_SDK_PACKAGE } from "../constants";
import type { FlagFormat } from "./nt-config";

export interface SnippetInput {
  key: string;
  format: FlagFormat;
  /** The baseline value — what the frontend falls back to before assignment. */
  baselineValue: unknown;
}

/** `hero_layout` / `hero-layout` → `heroLayout`. A flag key is not a valid identifier. */
export function camelCaseKey(key: string): string {
  const camel = key.replace(/[-_](.)/g, (_match, char: string) =>
    char.toUpperCase(),
  );
  // A key may legally start with a digit; an identifier may not.
  return /^[0-9]/.test(camel) ? `flag${camel}` : camel || "flagValue";
}

/**
 * The baseline rendered as the source literal a developer would type.
 *
 * Keys are *not* canonically sorted here even though the app compares values that way: the
 * snippet should read back the shape the author built, in the order they built it.
 */
export function defaultLiteral(value: unknown, format: FlagFormat): string {
  switch (format) {
    case "String":
      return JSON.stringify(typeof value === "string" ? value : "");
    case "Number":
      return String(typeof value === "number" ? value : 0);
    case "Boolean":
      return String(value === true);
    default:
      return JSON.stringify(value ?? {}, null, 2);
  }
}

/** The whole snippet, ready for the code block and the clipboard. */
export function buildFlagSnippet({
  key,
  format,
  baselineValue,
}: SnippetInput): string {
  const variable = camelCaseKey(key);
  const fallback = defaultLiteral(baselineValue, format);

  return [
    `import { useFlag } from '${FLAG_SDK_PACKAGE}';`,
    "",
    `// \`value\` is this default until the visitor is assigned a variant.`,
    `const { value: ${variable} } = useFlag('${key}', ${fallback});`,
  ].join("\n");
}
