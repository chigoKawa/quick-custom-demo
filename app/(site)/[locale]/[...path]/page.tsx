/**
 * Catch-all route for nested landing pages resolved by `fullPath`.
 *
 * Handles URLs like /en-US/benefit/child/grandchild where the landing page
 * entry has `fullPath = "/benefit/child/grandchild"`.
 *
 * Resolution strategy:
 *  1. Query by `fields.fullPath` matching the joined path segments.
 *  2. If nothing found, try `fields.slug` with the last path segment (legacy).
 *  3. If still nothing, 404.
 *
 * This route coexists with [slug] — Next.js prefers more-specific routes,
 * so single-segment paths still hit [slug]/page.tsx first.
 */

import { Locale, getI18nConfig } from "@/i18n-config";
import { getEntries } from "@/lib/contentful";
import ContentfulLandingPage from "@/features/contentful/components/contentful-landing-page";
import ContentfulBlogPage from "@/features/contentful/components/contentful-blog-page";
import {
  IBlogPostPage,
  BlogPostPageSkeleton,
  ILandingPage,
  LandingPageSkeleton,
} from "@/features/contentful/type";
import type { Asset, Entry } from "contentful";
import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { extractContentfulAssetUrl, isPreviewEnabled, getTimelineToken } from "@/lib/utils";
import LivePreviewProviderWrapper from "@/features/contentful/live-preview-provider-wrapper";
import { mapLandingPageToProps, mapBlogPostToProps } from "@/lib/contentful-mappers";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const INCLUDES_COUNT = 6;

type Props = {
  params: Promise<{ locale: Locale; path: string[] }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

type ResolvedPage =
  | { contentType: "landingPage"; entry: ILandingPage }
  | { contentType: "blogPost"; entry: IBlogPostPage };

/**
 * Try to resolve an entry of a given content type by fullPath, then by slug.
 */
async function tryContentType<S extends { contentTypeId: string; fields: Record<string, unknown> }>(
  contentType: string,
  fullPath: string,
  lastSlug: string,
  locale: string,
  isPreview: boolean,
  timelineToken?: string | null
): Promise<Entry<S> | undefined> {
  try {
    const byFullPath = await getEntries<S>(
      {
        content_type: contentType,
        "fields.fullPath": fullPath,
        include: INCLUDES_COUNT,
        locale,
        limit: 1,
      },
      isPreview,
      timelineToken
    );
    if (byFullPath[0]) return byFullPath[0];
  } catch {
    // fall through
  }

  try {
    const bySlug = await getEntries<S>(
      {
        content_type: contentType,
        "fields.slug": lastSlug,
        include: INCLUDES_COUNT,
        locale,
        limit: 1,
      },
      isPreview,
      timelineToken
    );
    if (bySlug[0]) return bySlug[0];
  } catch {
    // fall through
  }

  return undefined;
}

/**
 * Resolve a page entry given path segments and locale.
 * Tries landingPage first, then blogPost. Each is checked by
 * fullPath, then by last-segment slug.
 */
async function resolvePageEntry(
  pathSegments: string[],
  locale: string,
  isPreview: boolean,
  timelineToken?: string | null
): Promise<ResolvedPage | undefined> {
  if (pathSegments.length < 2) return undefined;

  const fullPath = "/" + pathSegments.join("/");
  const lastSlug = pathSegments[pathSegments.length - 1];

  const landing = await tryContentType<LandingPageSkeleton>(
    "landingPage", fullPath, lastSlug, locale, isPreview, timelineToken
  );
  if (landing) return { contentType: "landingPage", entry: landing as ILandingPage };

  const blog = await tryContentType<BlogPostPageSkeleton>(
    "blogPost", fullPath, lastSlug, locale, isPreview, timelineToken
  );
  if (blog) return { contentType: "blogPost", entry: blog as IBlogPostPage };

  return undefined;
}

export default async function NestedPage({ params, searchParams }: Props) {
  const resolvedSp = await searchParams;
  const isPreview = isPreviewEnabled(resolvedSp);
  const timelineToken = getTimelineToken(resolvedSp);
  const { locale, path: pathSegments } = await params;

  const resolved = await resolvePageEntry(pathSegments, locale, !!isPreview, timelineToken);

  if (!resolved) notFound();

  return (
    <div>
      <LivePreviewProviderWrapper locale={locale} isPreviewEnabled={!!isPreview}>
        {resolved.contentType === "blogPost" ? (
          <ContentfulBlogPage entry={mapBlogPostToProps(resolved.entry)} />
        ) : (
          <ContentfulLandingPage entry={mapLandingPageToProps(resolved.entry)} />
        )}
      </LivePreviewProviderWrapper>
    </div>
  );
}

export async function generateMetadata(
  { params, searchParams }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const resolvedSp = await searchParams;
  const isPreview = isPreviewEnabled(resolvedSp);
  const timelineToken = getTimelineToken(resolvedSp);
  const { locale, path: pathSegments } = await params;

  const resolved = await resolvePageEntry(pathSegments, locale, !!isPreview, timelineToken);
  const pageEntry = resolved?.entry;
  const previousImages = (await parent).openGraph?.images || [];

  const joinedPath = "/" + pathSegments.join("/");
  const pageTitle = `${pageEntry?.fields?.title ?? joinedPath} | Contentful Site`;
  const seoTitle = pageEntry?.fields?.seoMetadata?.fields?.title || pageTitle;
  const seoDescription = pageEntry?.fields?.seoMetadata?.fields?.description || "";

  const ogAsset = (pageEntry?.fields?.seoMetadata?.fields?.ogImage ?? null) as Asset | null;
  const seoOgImage = extractContentfulAssetUrl(ogAsset);
  const fullImageUrl = seoOgImage ? `${seoOgImage}?w=1200&h=630` : null;
  const images = fullImageUrl ? [fullImageUrl, ...previousImages] : [...previousImages];

  const seoNoIndex = pageEntry?.fields?.seoMetadata?.fields?.noIndex || false;
  const seoNoFollow = pageEntry?.fields?.seoMetadata?.fields?.noFollow || false;

  const metadataBase = process.env.VERCEL_URL
    ? new URL(`https://${process.env.VERCEL_URL}`)
    : new URL(process.env.NEXT_PUBLIC_SITE_URL || `http://localhost:${process.env.PORT || 3000}`);

  const { defaultLocale } = await getI18nConfig();
  const canonicalPath = locale === defaultLocale ? joinedPath : `/${locale}${joinedPath}`;

  return {
    title: seoTitle,
    description: seoDescription,
    openGraph: { images },
    robots: { index: !seoNoIndex, follow: !seoNoFollow },
    metadataBase,
    alternates: { canonical: canonicalPath },
  };
}

export const dynamicParams = true;

export async function generateStaticParams() {
  const { locales } = await getI18nConfig();

  const [landingPages, blogPosts] = await Promise.all([
    getEntries<LandingPageSkeleton>(
      {
        content_type: "landingPage",
        "fields.fullPath[exists]": true,
        select: "fields.fullPath",
        limit: 1000,
      },
      false
    ).then((r) => r as ILandingPage[]),
    getEntries<BlogPostPageSkeleton>(
      {
        content_type: "blogPost",
        "fields.fullPath[exists]": true,
        select: "fields.fullPath",
        limit: 1000,
      },
      false
    )
      .then((r) => r as IBlogPostPage[])
      .catch(() => [] as IBlogPostPage[]),
  ]);

  const allEntries = [...landingPages, ...blogPosts];
  const paths: { locale: string; path: string[] }[] = [];

  for (const entry of allEntries) {
    const fullPath = entry.fields.fullPath;
    if (!fullPath || fullPath === "/") continue;

    const segments = fullPath.replace(/^\//, "").split("/").filter(Boolean);
    if (segments.length < 2) continue;

    for (const locale of locales) {
      paths.push({ locale, path: segments });
    }
  }

  return paths;
}
