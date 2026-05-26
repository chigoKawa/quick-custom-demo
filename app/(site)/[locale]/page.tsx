import { Locale, getI18nConfig } from "@/i18n-config"; // Import locale type for internationalization
import { getEntries } from "@/lib/contentful"; // Function to fetch data from Contentful
import ContentfulLandingPage from "@/features/contentful/components/contentful-landing-page"; // Component to render the landing page
import { ILandingPage, LandingPageSkeleton } from "@/features/contentful/type"; // Types for Contentful landing page entries
import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { extractContentfulAssetUrl } from "@/lib/utils";
import { resolvePreviewMode } from "@/lib/preview";
import LivePreviewProviderWrapper from "@/features/contentful/live-preview-provider-wrapper";
import { fetchRelatedBlogPosts } from "@/lib/related-stories";
import { requireValidActiveMarket } from "@/lib/markets";

// Get the homepage slug from environment variables
const PAGE_SLUG = process.env.NEXT_PUBLIC_HOMEPAGE_SLUG! || "home";
const INCLUDES_COUNT = 6;

type Props = {
  params: Promise<{ locale: Locale; slug: string }>; // Extract locale from the URL params
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>; // Extract preview from the URL search params

  // searchParams: { preview?: string };
};

export default async function IndexPage({ params, searchParams }: Props) {
  const { locale } = await params;

  const resolvedSearchParams = await searchParams;
  const { isPreview, timelineToken } = await resolvePreviewMode(resolvedSearchParams);
  await requireValidActiveMarket({ isPreview, bypassInPreview: true });

  const entries = await getEntries<LandingPageSkeleton>(
    {
      content_type: "landingPage",
      "fields.slug": PAGE_SLUG,
      include: INCLUDES_COUNT,
      locale,
    },
    isPreview,
    timelineToken
  );

  // Get the first entry and cast it to ILandingPage type
  const pageEntry = entries[0] as ILandingPage;
  if (!pageEntry) {
    notFound();
  }

  const { defaultLocale } = await getI18nConfig();
  const relatedPosts = await fetchRelatedBlogPosts({ entry: pageEntry, locale, defaultLocale, isPreview, timelineToken });

  return (
    <div>
      {/* Render the landing page component with the fetched data */}
      <LivePreviewProviderWrapper
        locale={locale}
        isPreviewEnabled={isPreview}
      >
        <ContentfulLandingPage entry={pageEntry} relatedPosts={relatedPosts} />
      </LivePreviewProviderWrapper>
    </div>
  );
}

// metadata for SEO
export async function generateMetadata(
  { params, searchParams }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const sp = await searchParams;
  const { isPreview, timelineToken } = await resolvePreviewMode(sp);
  const { locale } = await params;

  const entries = await getEntries<LandingPageSkeleton>(
    {
      content_type: "landingPage",
      "fields.slug": PAGE_SLUG,
      include: INCLUDES_COUNT,
      locale,
    },
    isPreview,
    timelineToken
  );

  // Get the first entry and cast it to ILandingPage type
  const pageEntry = entries[0] as ILandingPage;
  const previousImages = (await parent).openGraph?.images || [];
  const pageTitle = `${pageEntry?.fields?.title} | Contentful Site`;
  const seoTitle = pageEntry?.fields?.seoMetadata?.fields?.title || pageTitle;
  const seoDescription =
    pageEntry?.fields?.seoMetadata?.fields?.description || "";

  const seoOgImage = extractContentfulAssetUrl(
    pageEntry?.fields?.seoMetadata?.fields?.ogImage || null
  );

  const fullImageUrl = seoOgImage ? `${seoOgImage}?w=1200&h=630` : null;

  const images = fullImageUrl
    ? [fullImageUrl, ...previousImages]
    : [...previousImages];

  const seoNoIndex = pageEntry?.fields?.seoMetadata?.fields?.noIndex || false;
  const seoNoFollow = pageEntry?.fields?.seoMetadata?.fields?.noFollow || false;

  // Determine the metadata base URL (Vercel's URL or localhost for development)
  const metadataBase = process.env.VERCEL_URL
    ? new URL(`https://${process.env.VERCEL_URL}`)
    : new URL(
        process.env.NEXT_PUBLIC_SITE_URL ||
          `http://localhost:${process.env.PORT || 3000}`
      );

  // Canonical URL should be clean for default locale, prefixed for others
  const { defaultLocale } = await getI18nConfig();
  const canonicalPath = locale === defaultLocale ? `/` : `/${locale}`;

  return {
    title: seoTitle,
    description: seoDescription,
    openGraph: {
      images: images,
    },
    robots: {
      index: !seoNoIndex,
      follow: !seoNoFollow,
    },
    metadataBase,
    alternates: {
      canonical: canonicalPath,
    },
  };
}
