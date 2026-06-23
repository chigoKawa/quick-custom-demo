import LivePreviewProviderWrapper from "@/features/contentful/live-preview-provider-wrapper";
import { resolvePreviewMode } from "@/lib/preview";
import { getKbIndex } from "@/lib/kb/loader";
import { getEntries } from "@/lib/contentful";
import { ILandingPage, LandingPageSkeleton } from "@/features/contentful/type";
import { getMicrocopyWithIds } from "@/lib/microcopy";
import KbLandingContent from "@/features/kb/kb-landing-content";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const INCLUDES_COUNT = 6;

export default async function KnowledgeBasePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { locale = "en-US" } = await params;
  const resolvedSearchParams = await searchParams;
  const { isPreview, timelineToken, environmentId } = await resolvePreviewMode(resolvedSearchParams);

  let landing: ILandingPage | undefined;
  let microcopy: Record<string, { value: string; entryId: string }> = {};

  try {
    const [entries, microcopyData] = await Promise.all([
      getEntries<LandingPageSkeleton>(
        {
          content_type: "landingPage",
          "fields.slug": "knowledge-base",
          include: INCLUDES_COUNT,
          locale,
        },
        isPreview,
        timelineToken,
        environmentId
      ),
      getMicrocopyWithIds(locale, isPreview, timelineToken, environmentId),
    ]);
    landing = entries?.[0] as ILandingPage | undefined;
    microcopy = microcopyData;
  } catch (err) {
    console.error("[knowledge-base] getEntries error", { locale, err });
  }

  // Get topics from the KB index (taxonomy-driven)
  const idx = getKbIndex(locale);
  const topicCounts: Array<[string, number]> = [];
  const topicCountsMap = new Map<string, number>();
  for (const doc of idx?.docs || []) {
    for (const g of doc?.groups || []) {
      if (typeof g === "string" && g) {
        topicCountsMap.set(g, (topicCountsMap.get(g) || 0) + 1);
      }
    }
  }
  for (const [slug, count] of topicCountsMap.entries()) {
    topicCounts.push([slug, count]);
  }

  return (
    <LivePreviewProviderWrapper locale={locale} isPreviewEnabled={isPreview}>
      <KbLandingContent
        locale={locale}
        landingEntry={landing || null}
        topicCountsData={topicCounts}
        microcopy={microcopy}
      />
    </LivePreviewProviderWrapper>
  );
}
