/**
 * Helpers for Contentful Live Preview: strip fields that create circular
 * references (nt_experiences ↔ nt_experience ↔ variants) before
 * useContentfulLiveUpdates or postMessage serialization.
 */

const NT_FIELDS = new Set(["nt_experiences", "nt_variants"]);

/**
 * Make mapped Ninetailed experiences JSON-safe before they reach the
 * NinetailedPreviewPlugin (which serializes them over zoid / postMessage).
 *
 * The mapped shape from ExperienceMapper.mapExperience is:
 *   { id, type, audience, distribution, components: [{ baseline, variants: [{ id, sys, fields }] }] }
 *
 * The circular reference is the standard A/B model: a variant's `fields`
 * contains `nt_experiences` → the experiment entry → `nt_variants` → the same
 * variant entry (Contentful resolves these into shared instances at include≥2).
 *
 * This deep-clones each experience while (a) dropping the `nt_experiences` /
 * `nt_variants` keys at every depth — which is exactly where the cycle lives —
 * and (b) guarding against any residual ancestor cycle. The mapped structure
 * itself (`components`, `variants`, `fields`, etc.) is preserved, so the preview
 * plugin still renders and applies variants correctly.
 */
export function stripNtFromMappedExperiences(mapped: unknown[]): unknown[] {
  return mapped.map((exp) => deepStripNt(exp, new Set<object>()));
}

function deepStripNt(value: unknown, ancestors: Set<object>): unknown {
  if (value === null || typeof value !== "object") return value;

  const obj = value as Record<string, unknown>;

  // Residual cycle safety net: preserve as a bare link stub when possible.
  if (ancestors.has(obj)) {
    const sys = obj.sys as unknown;
    return sys ? { sys } : null;
  }

  ancestors.add(obj);

  let result: unknown;
  if (Array.isArray(obj)) {
    result = obj.map((item) => deepStripNt(item, ancestors));
  } else {
    const cloned: Record<string, unknown> = {};
    for (const key of Object.keys(obj)) {
      // The cycle is reached exclusively through these keys — drop them entirely.
      if (NT_FIELDS.has(key)) continue;
      cloned[key] = deepStripNt(obj[key], ancestors);
    }
    result = cloned;
  }

  ancestors.delete(obj);
  return result;
}

function isEntryLink(v: unknown): v is { sys: { type?: string; contentType?: unknown; id?: string } } {
  if (!v || typeof v !== "object") return false;
  const sys = (v as { sys?: { type?: string; contentType?: unknown } }).sys;
  return sys?.type === "Entry" || Boolean(sys?.contentType);
}

/** Replace linked entries with bare sys stubs; omit Ninetailed experience fields. */
export function shallowEntryFields(fields: Record<string, unknown>): Record<string, unknown> {
  const shallow: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (NT_FIELDS.has(k)) continue;
    if (Array.isArray(v)) {
      shallow[k] = v.map((item) => (isEntryLink(item) ? { sys: item.sys } : item));
    } else if (isEntryLink(v)) {
      shallow[k] = { sys: (v as { sys: unknown }).sys };
    } else {
      shallow[k] = v;
    }
  }
  return shallow;
}

/** Shallow entry for useContentfulLiveUpdates (sys + scalar/stub fields only). */
export function shallowEntryForLivePreview<T extends { sys?: unknown; fields?: Record<string, unknown> }>(
  entry: T | null | undefined
): T | null {
  if (!entry?.sys || !entry.fields) return entry ?? null;
  return {
    ...entry,
    fields: shallowEntryFields(entry.fields),
  } as T;
}

/** Site chrome: drop only Ninetailed fields so nav targets keep slug (include depth ≤ 3). */
export function stripNtFieldsForLivePreview<T extends { sys?: unknown; fields?: Record<string, unknown> }>(
  entry: T | null | undefined
): T | null {
  if (!entry?.sys || !entry.fields) return entry ?? null;
  const fields = { ...entry.fields };
  for (const k of NT_FIELDS) delete fields[k];
  return { ...entry, fields } as T;
}
