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
import { ILandingPage, LandingPageSkeleton } from "@/features/contentful/type";
import type { Asset } from "contentful";
import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { extractContentfulAssetUrl, isPreviewEnabled, getTimelineToken } from "@/lib/utils";
import LivePreviewProviderWrapper from "@/features/contentful/live-preview-provider-wrapper";
import { mapLandingPageToProps } from "@/lib/contentful-mappers";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const INCLUDES_COUNT = 6;

type Props = {
  params: Promise<{ locale: Locale; path: string[] }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

/**
 * Resolve a landing page entry given path segments and locale.
 * Tries fullPath first, then falls back to last-segment slug.
 */
async function resolveLandingPage(
  pathSegments: string[],
  locale: string,
  isPreview: boolean,
  timelineToken?: string | null
): Promise<ILandingPage | undefined> {
  // Only handle multi-segment paths — single segments belong to [slug]
  if (pathSegments.length < 2) return undefined;

  const fullPath = "/" + pathSegments.join("/");

  // 1. Query by fullPath field
  try {
    const byFullPath = await getEntries<LandingPageSkeleton>(
      {
        content_type: "landingPage",
        "fields.fullPath": fullPath,
        include: INCLUDES_COUNT,
        locale,
        limit: 1,
      },
      isPreview,
      timelineToken
    );
    if (byFullPath[0]) return byFullPath[0] as ILandingPage;
  } catch {
    // fall through
  }

  // 2. Fallback: query by last segment slug (handles pages where fullPath hasn't been written yet)
  const lastSlug = pathSegments[pathSegments.length - 1];
  try {
    const bySlug = await getEntries<LandingPageSkeleton>(
      {
        content_type: "landingPage",
        "fields.slug": lastSlug,
        include: INCLUDES_COUNT,
        locale,
        limit: 1,
      },
      isPreview,
      timelineToken
    );
    if (bySlug[0]) return bySlug[0] as ILandingPage;
  } catch {
    // fall through
  }

  return undefined;
}

export default async function NestedLandingPage({ params, searchParams }: Props) {
  const resolvedSp = await searchParams;
  const isPreview = isPreviewEnabled(resolvedSp);
  const timelineToken = getTimelineToken(resolvedSp);
  const { locale, path: pathSegments } = await params;

  const pageEntry = await resolveLandingPage(pathSegments, locale, !!isPreview, timelineToken);

  if (!pageEntry) notFound();

  const pageData = mapLandingPageToProps(pageEntry);

  return (
    <div>
      <LivePreviewProviderWrapper locale={locale} isPreviewEnabled={!!isPreview}>
        <ContentfulLandingPage entry={pageData} />
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

  const pageEntry = await resolveLandingPage(pathSegments, locale, !!isPreview, timelineToken);
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

  // Fetch all entries that have a fullPath set
  const entries = await getEntries<LandingPageSkeleton>(
    {
      content_type: "landingPage",
      "fields.fullPath[exists]": true,
      select: "fields.fullPath",
      limit: 1000,
    },
    false
  ) as ILandingPage[];

  const paths: { locale: string; path: string[] }[] = [];

  for (const entry of entries) {
    const fullPath = entry.fields.fullPath;
    if (!fullPath || fullPath === "/") continue;

    // "/benefit/child" → ["benefit", "child"]
    const segments = fullPath.replace(/^\//, "").split("/").filter(Boolean);
    if (segments.length < 2) continue; // single-segment handled by [slug]

    for (const locale of locales) {
      paths.push({ locale, path: segments });
    }
  }

  return paths;
}
