import { getEntries } from "@/lib/contentful";
import { unscoped } from "@/lib/site-scope";
import { mapLandingPageToProps } from "@/lib/contentful-mappers";
import type { ILandingPage, LandingPageSkeleton } from "@/features/contentful/type";

const INCLUDES_COUNT = 6;

export type PreviewFetchResult = {
  contentTypeId: string;
  entry: unknown;
  title: string;
};

type PreviewFetcher = (params: {
  entryId?: string;
  slug?: string;
  locale: string;
  isPreview: boolean;
}) => Promise<PreviewFetchResult | null>;

/**
 * Fetch a landingPage entry by entryId or slug, serialize it for client boundary.
 */
const fetchLandingPage: PreviewFetcher = async ({ entryId, slug, locale, isPreview }) => {
  const query: Record<string, unknown> = {
    content_type: "landingPage",
    include: INCLUDES_COUNT,
    locale,
  };

  if (entryId) {
    query["sys.id"] = entryId;
  } else if (slug) {
    query["fields.slug"] = slug;
  } else {
    return null;
  }

  // The platform preview harness previews whatever entry an editor opened,
  // which may belong to any site in the space.
  const entries = await getEntries<LandingPageSkeleton>(unscoped(query), isPreview);
  const raw = entries[0] as ILandingPage | undefined;
  if (!raw) return null;

  return {
    contentTypeId: "landingPage",
    entry: mapLandingPageToProps(raw),
    title: (raw.fields?.title as string) || (raw.fields?.internalName as string) || "Landing Page",
  };
};

/**
 * Registry mapping content type IDs to their fetcher functions.
 * Add new content types here as they become supported.
 */
const registry: Record<string, PreviewFetcher> = {
  landingPage: fetchLandingPage,
};

/**
 * Resolve a preview request to fetched + serialized entry data.
 * Returns null if the type is unsupported or the entry wasn't found.
 */
export async function resolvePreviewEntry(params: {
  type: string;
  entryId?: string;
  slug?: string;
  locale: string;
  isPreview: boolean;
}): Promise<PreviewFetchResult | null> {
  const fetcher = registry[params.type];
  if (!fetcher) return null;

  try {
    return await fetcher(params);
  } catch (err) {
    console.error("[preview-registry] fetch error", { ...params, err });
    return null;
  }
}

/** List of supported content type IDs for preview */
export const supportedTypes = Object.keys(registry);
