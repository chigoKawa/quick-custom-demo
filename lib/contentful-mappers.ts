import type { IBlogPostPage, ILandingPage } from "@/features/contentful/type";
import { toJsonSafe } from "./json-safe";

/**
 * Normalizes a Contentful entry to a JSON-safe, plain-object graph for client
 * components. Entries fetched via `getEntries`/`getEntriesInEnvironment` are
 * already sanitized at the fetch boundary, so these are thin, idempotent
 * wrappers kept for call-site clarity.
 */
export function mapLandingPageToProps(entry: ILandingPage): ILandingPage {
  return toJsonSafe(entry);
}

export function mapBlogPostToProps(entry: IBlogPostPage): IBlogPostPage {
  return toJsonSafe(entry);
}
