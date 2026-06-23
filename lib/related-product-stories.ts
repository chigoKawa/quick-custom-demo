import { getEntries } from "./contentful";
import type {
  IProductStory,
  ProductStorySkeleton,
} from "@/features/contentful/type";
import { extractPrimaryProduct } from "./product-story";

export interface RelatedProductStory {
  id: string;
  slug: string;
  /** Title shown on the card: productName override if set, else primaryProduct.title. */
  title: string;
  productImage?: string;
  productCategory?: string;
  price?: number;
  storyAngles?: string[];
  locale: string;
  defaultLocale: string;
}

interface FetchRelatedProductStoriesParams {
  entry: IProductStory;
  locale: string;
  defaultLocale: string;
  isPreview: boolean;
  timelineToken?: string | null;
  environmentId?: string | null;
  /** Max number of related stories to return. */
  limit?: number;
}

/**
 * Fetch product stories that share at least one taxonomy concept with the
 * given product story, excluding the entry itself. Returns an empty array
 * if the entry has no concepts.
 *
 * Uses Contentful CDA's `metadata.concepts.sys.id[in]` filter (same pattern
 * as `fetchRelatedBlogPosts`).
 */
export async function fetchRelatedProductStories({
  entry,
  locale,
  defaultLocale,
  isPreview,
  timelineToken,
  environmentId,
  limit = 6,
}: FetchRelatedProductStoriesParams): Promise<RelatedProductStory[]> {
  const conceptIds: string[] = (
    (entry as unknown as { metadata?: { concepts?: Array<{ sys?: { id?: string } }> } })
      ?.metadata?.concepts ?? []
  )
    .map((c) => c?.sys?.id)
    .filter((id): id is string => Boolean(id));

  if (conceptIds.length === 0) return [];

  try {
    const stories = (await getEntries<ProductStorySkeleton>(
      {
        content_type: "productStory",
        "metadata.concepts.sys.id[in]": conceptIds.join(","),
        // Need include:2 so any linked entries (e.g. images) come along
        // without bloating the payload like the full PDP fetch.
        include: 2,
        locale,
        // Fetch one extra so we can still return `limit` results after
        // dropping the current entry.
        limit: limit + 1,
      } as unknown as Record<string, unknown>,
      isPreview,
      timelineToken,
      environmentId
    )) as unknown as IProductStory[];

    return stories
      .filter((s) => s?.sys?.id !== entry?.sys?.id)
      .filter((s) => s?.fields?.slug)
      .slice(0, limit)
      .map((s) => {
        const product = extractPrimaryProduct(s.fields.primaryProduct);
        const productNameOverride =
          typeof s.fields.productName === "string" &&
          (s.fields.productName as string).length > 0
            ? (s.fields.productName as string)
            : null;
        const title =
          productNameOverride ??
          product?.title ??
          (s.fields.internalName as string) ??
          (s.fields.slug as string);

        return {
          id: s.sys.id,
          slug: s.fields.slug as string,
          title,
          productImage: product?.image,
          productCategory: product?.category,
          price: typeof product?.price === "number" ? product.price : undefined,
          storyAngles: Array.isArray(s.fields.storyAngle)
            ? (s.fields.storyAngle as string[])
            : undefined,
          locale,
          defaultLocale,
        } satisfies RelatedProductStory;
      });
  } catch (err) {
    console.error("[related-product-stories] fetch error", err);
    return [];
  }
}
