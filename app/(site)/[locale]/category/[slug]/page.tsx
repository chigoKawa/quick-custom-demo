/* eslint-disable @typescript-eslint/no-explicit-any */
import { notFound } from "next/navigation";
import type { Asset } from "contentful";
import type { Metadata, ResolvingMetadata } from "next";

import { getI18nConfig, type Locale } from "@/i18n-config";
import { getEntries } from "@/lib/contentful";
import { extractContentfulAssetUrl } from "@/lib/utils";
import { resolvePreviewMode } from "@/lib/preview";
import type {
  ICategoryPage,
  CategoryPageSkeleton,
  ILandingPage,
  LandingPageSkeleton,
} from "@/features/contentful/type";
import ContentfulLandingPage from "@/features/contentful/components/contentful-landing-page";
import LivePreviewProviderWrapper from "@/features/contentful/live-preview-provider-wrapper";
import CategoryBooksGrid from "@/features/contentful/components/category-books-grid";

const INCLUDES_COUNT = 6;

// Force dynamic rendering for preview support and fresh content
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type Props = {
  params: Promise<{ locale: Locale; slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function CategoryPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  const resolvedSearchParams = await searchParams;
  const { isPreview, timelineToken } = await resolvePreviewMode(resolvedSearchParams);

  const entries = await getEntries<CategoryPageSkeleton>(
    {
      content_type: "categoryPage",
      "fields.slug": slug,
      include: INCLUDES_COUNT,
      locale,
    },
    isPreview,
    timelineToken
  );

  const entry = entries[0] as unknown as ICategoryPage | undefined;
  if (!entry) notFound();

  const sectionsFromModel = (entry as any)?.fields?.sections as any;
  const heroBanner = (entry as any)?.fields?.heroBanner as any;
  const defaultShelf = (entry as any)?.fields?.defaultShelf as any;
  const content = Array.isArray((entry as any)?.fields?.content)
    ? ((entry as any).fields.content as any[])
    : [];

  const sections = Array.isArray(sectionsFromModel)
    ? sectionsFromModel
    : [heroBanner, defaultShelf, ...content].filter(Boolean);

  const landingLike: ILandingPage = {
    ...(entry as any),
    fields: {
      internalName:
        (entry as any)?.fields?.internalTitle || (entry as any)?.fields?.title,
      title: (entry as any)?.fields?.title,
      slug: (entry as any)?.fields?.slug,
      sections,
      seoMetadata: (entry as any)?.fields?.seoMetadata,
    },
  } as any;

  // Extract shelfApp query from defaultShelf for paginated book grid
  const shelfApp = defaultShelf?.fields?.shelfApp;
  const categoryTitle = (entry as any)?.fields?.title;

  return (
    <LivePreviewProviderWrapper
      locale={locale}
      isPreviewEnabled={isPreview}
    >
      <ContentfulLandingPage entry={landingLike as unknown as LandingPageSkeleton as any} />
      {shelfApp && (
        <CategoryBooksGrid 
          shelfApp={shelfApp} 
          title={`Browse All ${categoryTitle || "Books"}`} 
        />
      )}
    </LivePreviewProviderWrapper>
  );
}

export async function generateMetadata(
  { params, searchParams }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { locale, slug } = await params;
  const resolvedSp = await searchParams;
  const { isPreview, timelineToken } = await resolvePreviewMode(resolvedSp);

  const entries = await getEntries<CategoryPageSkeleton>(
    {
      content_type: "categoryPage",
      "fields.slug": slug,
      include: 2,
      locale,
    },
    isPreview,
    timelineToken
  );
  const entry = entries[0] as unknown as ICategoryPage | undefined;
  if (!entry) return {};

  const previousImages = (await parent).openGraph?.images || [];

  const title = (entry as any)?.fields?.title;
  const pageTitle = `${typeof title === "string" ? title : slug} | Contentful Site`;
  const seo = (entry as any)?.fields?.seoMetadata;

  const seoTitle = seo?.fields?.title || pageTitle;
  const seoDescription = seo?.fields?.description || "";

  const ogAsset = (seo?.fields?.ogImage ?? null) as Asset | null;
  const seoOgImage = extractContentfulAssetUrl(ogAsset);
  const fullImageUrl = seoOgImage ? `https:${seoOgImage}?w=1200&h=630` : null;

  const images = fullImageUrl ? [fullImageUrl, ...previousImages] : [...previousImages];

  const seoNoIndex = !!seo?.fields?.noIndex;
  const seoNoFollow = !!seo?.fields?.noFollow;

  const metadataBase = process.env.VERCEL_URL
    ? new URL(`https://${process.env.VERCEL_URL}`)
    : new URL(
        process.env.NEXT_PUBLIC_SITE_URL ||
          `http://localhost:${process.env.PORT || 3000}`
      );

  const { defaultLocale } = await getI18nConfig();
  const canonicalPath =
    locale === defaultLocale ? `/category/${slug}` : `/${locale}/category/${slug}`;

  return {
    title: seoTitle,
    description: seoDescription,
    openGraph: {
      images,
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
