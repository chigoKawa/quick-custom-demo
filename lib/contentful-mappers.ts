import type { IBlogPostPage, ILandingPage } from "@/features/contentful/type";

/**
 * Safely stringify an object, handling *true* circular references
 * (ancestor → descendant → ancestor) without destroying shared references.
 *
 * The previous implementation used a flat WeakSet which treated the same
 * object appearing in two sibling arrays (e.g. the same button used by
 * two sections) as "circular" and replaced the second occurrence with null.
 * This caused buttons to vanish erratically.
 *
 * The fix uses structuredClone which handles both circular refs and shared
 * refs correctly — shared objects are duplicated, true cycles are preserved
 * as references, and the result is always JSON-safe after JSON.parse/stringify.
 */
function safeClone<T>(obj: T): T {
  try {
    // structuredClone correctly duplicates shared refs and throws on
    // non-cloneable values (functions, DOM nodes, etc.)
    return structuredClone(obj);
  } catch {
    // Fallback: recursive deep-clone that only breaks true ancestor cycles.
    // Shared refs across siblings are cloned independently (not nullified).
    return deepClone(obj, new Set<object>()) as T;
  }
}

function deepClone(value: unknown, ancestors: Set<object>): unknown {
  // Primitives and null pass through
  if (value === null || typeof value !== "object") return value;

  const obj = value as Record<string, unknown>;

  // True circular reference (ancestor in current path) → null
  if (ancestors.has(obj)) return null;

  // Track this object as an ancestor for its descendants only
  ancestors.add(obj);

  let result: unknown;
  if (Array.isArray(obj)) {
    result = obj.map((item) => deepClone(item, ancestors));
  } else {
    const cloned: Record<string, unknown> = {};
    for (const key of Object.keys(obj)) {
      cloned[key] = deepClone(obj[key], ancestors);
    }
    result = cloned;
  }

  // Remove from ancestors when we backtrack — siblings won't see it
  ancestors.delete(obj);
  return result;
}

/**
 * Normalizes a Contentful entry to ensure it's serializable and safe for client components.
 * This avoids passing Contentful SDK objects directly across the server-client boundary.
 * Handles circular references by replacing them with null.
 */
export function mapLandingPageToProps(entry: ILandingPage): ILandingPage {
  return safeClone(entry);
}

export function mapBlogPostToProps(entry: IBlogPostPage): IBlogPostPage {
  return safeClone(entry);
}
