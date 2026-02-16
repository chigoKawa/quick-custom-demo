import type { ILandingPage } from "@/features/contentful/type";

/**
 * Safely stringify an object, handling circular references by replacing them with null.
 */
function safeStringify(obj: unknown): string {
  const seen = new WeakSet();
  return JSON.stringify(obj, (_key, value) => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) {
        // Circular reference found, replace with null
        return null;
      }
      seen.add(value);
    }
    return value;
  });
}

/**
 * Normalizes a Contentful entry to ensure it's serializable and safe for client components.
 * This avoids passing Contentful SDK objects directly across the server-client boundary.
 * Handles circular references by replacing them with null.
 */
export function mapLandingPageToProps(entry: ILandingPage): ILandingPage {
  // Use safe JSON serialization to create a plain object copy
  // This strips any prototype methods, handles circular refs, and ensures serializability
  return JSON.parse(safeStringify(entry));
}
