import { notFound } from "next/navigation";
import type { Metadata, ResolvingMetadata } from "next";
import type { Asset } from "contentful";
import { getI18nConfig, type Locale } from "@/i18n-config";
import { extractContentfulAssetUrl, isPreviewEnabled, getTimelineToken } from "@/lib/utils";
import { getMicrocopyWithIds } from "@/lib/microcopy";
import {
  getProductStoryBySlug,
  getAllProductStorySlugs,
  mapProductStoryToProps,
} from "@/lib/product-story";
import LivePreviewProviderWrapper from "@/features/contentful/live-preview-provider-wrapper";
import ProductStoryPage from "@/features/contentful/components/product-story/product-story-page";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type Props = {
  params: Promise<{ locale: Locale; slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function StoryRoute({ params, searchParams }: Props) {
  const resolvedSearchParams = await searchParams;
  const preview = isPreviewEnabled(resolvedSearchParams);
  const timelineToken = getTimelineToken(resolvedSearchParams);
  const { locale, slug } = await params;
  const { locales, defaultLocale } = await getI18nConfig();
  const effectiveLocale = locales.includes(locale as string) ? locale : defaultLocale;

  const [entry, microcopy] = await Promise.all([
    getProductStoryBySlug(slug, effectiveLocale, !!preview, timelineToken),
    getMicrocopyWithIds(effectiveLocale, !!preview, timelineToken),
  ]);

  if (!entry) {
    notFound();
  }

  const pageData = mapProductStoryToProps(entry);

  return (
    <LivePreviewProviderWrapper
      locale={effectiveLocale}
      isPreviewEnabled={!!preview}
    >
      <ProductStoryPage entry={pageData} locale={effectiveLocale} microcopy={microcopy} />
    </LivePreviewProviderWrapper>
  );
}

// ── SEO metadata ──

export async function generateMetadata(
  { params, searchParams }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const resolvedSp = await searchParams;
  const preview = isPreviewEnabled(resolvedSp);
  const { locale, slug } = await params;
  const { locales, defaultLocale } = await getI18nConfig();
  const effectiveLocale = locales.includes(locale as string) ? locale : defaultLocale;

  const timelineToken = getTimelineToken(resolvedSp);

  const entry = await getProductStoryBySlug(slug, effectiveLocale, !!preview, timelineToken);
  const previousImages = (await parent).openGraph?.images || [];

  const title = entry?.fields?.internalName ?? slug;
  const seo = entry?.fields?.seoMetadata;
  const seoTitle = seo?.fields?.title || `${title} | Product Story`;
  const seoDescription = seo?.fields?.description || "";
  const ogAsset = (seo?.fields?.ogImage ?? null) as Asset | null;
  const seoOgImage = extractContentfulAssetUrl(ogAsset);
  const fullImageUrl = seoOgImage ? `${seoOgImage}?w=1200&h=630` : null;
  const images = fullImageUrl
    ? [fullImageUrl, ...previousImages]
    : [...previousImages];

  const seoNoIndex = seo?.fields?.noIndex || false;
  const seoNoFollow = seo?.fields?.noFollow || false;

  const metadataBase = process.env.VERCEL_URL
    ? new URL(`https://${process.env.VERCEL_URL}`)
    : new URL(
        process.env.NEXT_PUBLIC_SITE_URL ||
          `http://localhost:${process.env.PORT || 3000}`
      );

  const canonicalPath =
    locale === defaultLocale
      ? `/stories/${slug}`
      : `/${locale}/stories/${slug}`;

  return {
    title: seoTitle,
    description: seoDescription,
    openGraph: { images },
    robots: { index: !seoNoIndex, follow: !seoNoFollow },
    metadataBase,
    alternates: { canonical: canonicalPath },
  };
}

// ── Static params ──

export const dynamicParams = true;

export async function generateStaticParams() {
  const { locales } = await getI18nConfig();
  const slugs = await getAllProductStorySlugs(false);
  return locales.flatMap((locale) =>
    slugs.map((slug) => ({ locale, slug }))
  );
}
