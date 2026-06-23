import { Locale } from "@/i18n-config"; // Import locale type for internationalization
import { getEntries } from "@/lib/contentful"; // Function to fetch data from Contentful
import ContentfulLandingPage from "@/features/contentful/components/contentful-landing-page"; // Component to render the landing page
import { ILandingPage, LandingPageSkeleton } from "@/features/contentful/type"; // Types for Contentful landing page entries
import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { resolvePreviewMode } from "@/lib/preview";
import LivePreviewProviderWrapper from "@/features/contentful/live-preview-provider-wrapper";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Get the homepage slug from environment variables
const PAGE_SLUG = "blog";
const INCLUDES_COUNT = 6;

type Props = {
  params: Promise<{ locale: Locale; slug: string }>; // Extract locale from the URL params
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>; // Extract preview from the URL search params

  // searchParams: { preview?: string };
};

export default async function IndexPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const resolvedSearchParams = await searchParams;
  const { isPreview, timelineToken, environmentId } = await resolvePreviewMode(resolvedSearchParams);

  const entries = await getEntries<LandingPageSkeleton>(
    {
      content_type: "landingPage",
      "fields.slug": PAGE_SLUG,
      include: INCLUDES_COUNT,
      locale,
    },
    isPreview,
    timelineToken,
    environmentId
  );

  // Get the first entry and cast it to ILandingPage type
  const pageEntry = entries[0] as ILandingPage;

  if (!pageEntry) {
    notFound();
  }

  return (
    <div>
      {/* Render the landing page component with the fetched data */}
      <LivePreviewProviderWrapper
        locale={locale}
        isPreviewEnabled={isPreview}
      >
        <ContentfulLandingPage entry={pageEntry} />
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
  const { isPreview, timelineToken, environmentId } = await resolvePreviewMode(resolvedSp);
  const { locale } = await params;

  const entries = await getEntries<LandingPageSkeleton>(
    {
      content_type: "landingPage",
      "fields.slug": PAGE_SLUG,
      include: INCLUDES_COUNT,
      locale,
    },
    isPreview,
    timelineToken,
    environmentId
  );

  // Get the first entry and cast it to ILandingPage type
  const pageEntry = entries[0] as ILandingPage;
  const previousImages = (await parent).openGraph?.images || [];
  const pageTitle = `${pageEntry?.fields?.title} | Contentful Site`;

  return {
    title: pageTitle,
    openGraph: {
      images: [...previousImages],
    },
  };
}
