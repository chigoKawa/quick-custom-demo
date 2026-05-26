import { Locale, getI18nConfig } from "@/i18n-config";
import { getEntries, getAllPageSlugs } from "@/lib/contentful";
import ContentfulLandingPage from "@/features/contentful/components/contentful-landing-page";
import ContentfulBlogPage from "@/features/contentful/components/contentful-blog-page";
import {
  IBlogPostPage,
  BlogPostPageSkeleton,
  ILandingPage,
  LandingPageSkeleton,
} from "@/features/contentful/type";
import { fetchRelatedBlogPosts } from "@/lib/related-stories";
import type { Asset } from "contentful";
import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { extractContentfulAssetUrl } from "@/lib/utils";
import { resolvePreviewMode } from "@/lib/preview";
import LivePreviewProviderWrapper from "@/features/contentful/live-preview-provider-wrapper";
import { mapLandingPageToProps, mapBlogPostToProps } from "@/lib/contentful-mappers";
import { getActiveMarketCode } from "@/lib/market-overrides/server";
import { requireValidActiveMarket } from "@/lib/markets";

const INCLUDES_COUNT = 6;

// Safe stopgap: force dynamic rendering and disable caching on this route to avoid
// DYNAMIC_SERVER_USAGE during server component render while we validate upstream data.
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type Props = {
  params: Promise<{ locale: Locale; slug: string }>; // Extract locale from the URL params
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>; // Extract preview from the URL search params

  // searchParams: { preview?: string };
};

export default async function IndexPage({ params, searchParams }: Props) {
  const resolvedSearchParams = await searchParams;
  const { isPreview, timelineToken } = await resolvePreviewMode(resolvedSearchParams);
  await requireValidActiveMarket({ isPreview, bypassInPreview: true });

  const { locale, slug } = await params;

  let landingPage: ILandingPage | undefined;
  let blogPost: IBlogPostPage | undefined;

  try {
    const entries = await getEntries<LandingPageSkeleton>(
      {
        content_type: "landingPage",
        "fields.slug": slug,
        include: INCLUDES_COUNT,
        locale,
      },
      isPreview,
      timelineToken
    );
    landingPage = entries[0] as ILandingPage | undefined;
  } catch (err) {
    console.error("[slug] getEntries landingPage error", { slug, locale, err });
  }

  if (!landingPage) {
    try {
      const entries = await getEntries<BlogPostPageSkeleton>(
        {
          content_type: "blogPost",
          "fields.slug": slug,
          include: INCLUDES_COUNT,
          locale,
        },
        isPreview,
        timelineToken
      );
      blogPost = entries[0] as IBlogPostPage | undefined;
    } catch (err) {
      console.error("[slug] getEntries blogPost error", { slug, locale, err });
    }
  }

  if (!landingPage && !blogPost) {
    notFound();
  }

  const { defaultLocale } = await getI18nConfig();
  const relatedPosts = landingPage
    ? await fetchRelatedBlogPosts({ entry: landingPage, locale, defaultLocale, isPreview, timelineToken })
    : undefined;

  return (
    <div>
      <LivePreviewProviderWrapper
        locale={locale}
        isPreviewEnabled={isPreview}
      >
        {blogPost ? (
          <ContentfulBlogPage entry={mapBlogPostToProps(blogPost)} />
        ) : (
          <ContentfulLandingPage entry={mapLandingPageToProps(landingPage!)} relatedPosts={relatedPosts} />
        )}
      </LivePreviewProviderWrapper>
    </div>
  );
}

// metadata for SEO
export async function generateMetadata(
  { params, searchParams }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const resolvedSp = await searchParams;
  const { isPreview, timelineToken } = await resolvePreviewMode(resolvedSp);
  const { locale, slug } = await params;

  let pageEntry: ILandingPage | IBlogPostPage | undefined;
  try {
    const entries = await getEntries<LandingPageSkeleton>(
      {
        content_type: "landingPage",
        "fields.slug": slug,
        include: INCLUDES_COUNT,
        locale,
      },
      isPreview,
      timelineToken
    );
    pageEntry = entries[0] as ILandingPage | undefined;
  } catch (err) {
    console.error("[slug] generateMetadata landingPage error", { slug, locale, err });
  }

  if (!pageEntry) {
    try {
      const entries = await getEntries<BlogPostPageSkeleton>(
        {
          content_type: "blogPost",
          "fields.slug": slug,
          include: INCLUDES_COUNT,
          locale,
        },
        isPreview,
        timelineToken
      );
      pageEntry = entries[0] as IBlogPostPage | undefined;
    } catch (err) {
      console.error("[slug] generateMetadata blogPost error", { slug, locale, err });
    }
  }

  const previousImages = (await parent).openGraph?.images || [];
  const pageTitle = `${pageEntry?.fields?.title ?? slug} | Contentful Site`;
  const seoTitle = pageEntry?.fields?.seoMetadata?.fields?.title || pageTitle;
  const seoDescription =
    pageEntry?.fields?.seoMetadata?.fields?.description || "";

  const ogAsset = (pageEntry?.fields?.seoMetadata?.fields?.ogImage ?? null) as Asset | null;
  const seoOgImage = extractContentfulAssetUrl(ogAsset);
  const fullImageUrl = seoOgImage ? `${seoOgImage}?w=1200&h=630` : null;
  const images = fullImageUrl
    ? [fullImageUrl, ...previousImages]
    : [...previousImages];

  const marketCode = await getActiveMarketCode();
  // Market-prefixed URLs are duplicates of their base URL for SEO purposes.
  // Always noindex them to avoid duplicate content; follow is still allowed
  // so internal links keep their authority.
  const seoNoIndex =
    Boolean(pageEntry?.fields?.seoMetadata?.fields?.noIndex) || Boolean(marketCode);
  const seoNoFollow = pageEntry?.fields?.seoMetadata?.fields?.noFollow || false;

  const metadataBase = process.env.VERCEL_URL
    ? new URL(`https://${process.env.VERCEL_URL}`)
    : new URL(
        process.env.NEXT_PUBLIC_SITE_URL ||
          `http://localhost:${process.env.PORT || 3000}`
      );

  const { defaultLocale } = await getI18nConfig();
  const canonicalPath =
    locale === defaultLocale ? `/${slug}` : `/${locale}/${slug}`;

  return {
    title: seoTitle,
    description: seoDescription,
    openGraph: { images },
    robots: { index: !seoNoIndex, follow: !seoNoFollow },
    metadataBase,
    alternates: { canonical: canonicalPath },
  };
}

// Next.js will invalidate the cache when a
// request comes in, at most once every 60 seconds.
// revalidate is defined at top of file for this route

// We'll prerender only the params from `generateStaticParams` at build time.
// If a request comes in for a path that hasn't been generated,
// Next.js will server-render the page on-demand.
export const dynamicParams = true; // or false, to 404 on unknown paths

export async function generateStaticParams() {
  const { locales } = await getI18nConfig();
  const allSlugs = await getAllPageSlugs<LandingPageSkeleton>(
    {
      content_type: "landingPage",
      include: INCLUDES_COUNT,
    },
    false
  );

  // Return array of { locale, slug } objects for all combinations
  return locales.flatMap((locale) =>
    allSlugs.map((slug) => ({ locale, slug }))
  );
}
