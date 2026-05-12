import { getEntries } from "./contentful";
import type { ILandingPage, IBlogPostPage, BlogPostPageSkeleton } from "@/features/contentful/type";
import type { RelatedStoryPost } from "@/features/contentful/components/landing-page/related-stories-section";

interface FetchRelatedBlogPostsParams {
  entry: ILandingPage;
  locale: string;
  defaultLocale: string;
  isPreview: boolean;
  timelineToken?: string | null;
}

/**
 * Fetches blog posts that share at least one taxonomy concept with the given
 * landing page entry. Returns an empty array if the page has no concepts.
 */
export async function fetchRelatedBlogPosts({
  entry,
  locale,
  defaultLocale,
  isPreview,
  timelineToken,
}: FetchRelatedBlogPostsParams): Promise<RelatedStoryPost[]> {
  const conceptIds: string[] = ((entry as any).metadata?.concepts ?? [])
    .map((c: any) => c?.sys?.id)
    .filter(Boolean);

  if (conceptIds.length === 0) return [];

  try {
    // Fetch all blog posts with matching concepts.
    // Contentful CDA supports `metadata.concepts.sys.id[in]` filtering.
    const posts = await getEntries<BlogPostPageSkeleton>(
      {
        content_type: "blogPost",
        "metadata.concepts.sys.id[in]": conceptIds.join(","),
        include: 1,
        locale,
        limit: 6,
      },
      isPreview,
      timelineToken
    ) as unknown as IBlogPostPage[];

    return posts
      .filter((p) => p?.fields?.slug && p?.fields?.title)
      .map((p) => {
        const image = p.fields.featuredImage as any;
        const imageUrl = image?.fields?.file?.url
          ? `https:${image.fields.file.url}`
          : undefined;

        // summary may be a RichText node — extract plain text from first paragraph
        let summary: string | undefined;
        const rawSummary = p.fields.summary as any;
        if (typeof rawSummary === "string") {
          summary = rawSummary;
        } else if (rawSummary?.content) {
          const firstPara = rawSummary.content.find(
            (node: any) => node.nodeType === "paragraph"
          );
          if (firstPara) {
            summary = firstPara.content
              ?.filter((n: any) => n.nodeType === "text")
              .map((n: any) => n.value)
              .join("") || undefined;
          }
        }

        return {
          id: p.sys.id,
          title: p.fields.title,
          slug: p.fields.slug,
          fullPath: p.fields.fullPath ?? undefined,
          publishedDate: p.fields.publishedDate ?? undefined,
          summary,
          imageUrl,
          locale,
          defaultLocale,
        } satisfies RelatedStoryPost;
      });
  } catch {
    return [];
  }
}
