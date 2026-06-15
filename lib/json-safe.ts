/**
 * toJsonSafe — convert an arbitrary value into a JSON-safe, plain-object graph.
 *
 * Contentful's Delivery SDK resolves linked entries into *shared* object
 * references. Perfectly valid content models can therefore produce **true
 * circular references** in the resolved graph. The canonical example is the
 * standard Ninetailed A/B model: an experiment lists its baseline inside
 * `nt_variants`, and that baseline links back to the experiment via
 * `nt_experiences` (baseline → nt_experiences → experiment → nt_variants →
 * baseline). Any `JSON.stringify` over such a graph — React/Next prop
 * serialization, Contentful Live Preview's postMessage, the Ninetailed preview
 * plugin's zoid channel — throws "Converting circular structure to JSON".
 *
 * This walks the graph once and:
 *  - reuses already-cloned nodes (preserves shared references → no size blow-up),
 *  - replaces a back-edge to an ancestor on the current path (a true cycle)
 *    with a bare `{ sys }` link stub so ids stay resolvable while the cycle is
 *    severed; the fully-resolved node still exists elsewhere in the graph.
 *
 * The result is a directed acyclic graph of plain objects that is always safe to
 * serialize. It is intentionally content-model agnostic: it neutralizes any
 * cycle introduced by any entry, on any page, regardless of how an editor wires
 * experiences, references, or navigation. Nothing here is page- or brand-specific.
 */
export function toJsonSafe<T>(value: T): T {
  return sanitize(value, new WeakMap<object, unknown>(), new Set<object>()) as T;
}

function isPlainTraversable(value: object): boolean {
  // Don't deep-clone exotic objects (Date, RegExp, etc.) — pass them through.
  if (value instanceof Date) return false;
  if (value instanceof RegExp) return false;
  return true;
}

function sanitize(
  value: unknown,
  cloned: WeakMap<object, unknown>,
  pathStack: Set<object>
): unknown {
  if (value === null || typeof value !== "object") return value;

  const obj = value as Record<string, unknown>;

  if (!isPlainTraversable(obj)) return obj;

  // Back-edge to an ancestor on the current traversal path → true cycle.
  // Sever it, keeping a resolvable link stub where possible.
  if (pathStack.has(obj)) {
    const sys = (obj as { sys?: unknown }).sys;
    return sys ? { sys } : null;
  }

  // Shared (non-ancestor) reference already cloned → reuse the same clone so
  // the output mirrors the input's sharing instead of duplicating subtrees.
  const existing = cloned.get(obj);
  if (existing !== undefined) return existing;

  pathStack.add(obj);

  let result: unknown;
  if (Array.isArray(obj)) {
    const arr: unknown[] = [];
    cloned.set(obj, arr);
    for (const item of obj) arr.push(sanitize(item, cloned, pathStack));
    result = arr;
  } else {
    const out: Record<string, unknown> = {};
    cloned.set(obj, out);
    for (const key of Object.keys(obj)) {
      out[key] = sanitize(obj[key], cloned, pathStack);
    }
    result = out;
  }

  pathStack.delete(obj);
  return result;
}
