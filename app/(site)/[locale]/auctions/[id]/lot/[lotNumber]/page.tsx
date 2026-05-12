import type { Locale } from "@/i18n-config";
import { getEntriesInEnvironment } from "@/lib/contentful";
import { resolvePreviewMode } from "@/lib/preview";
import type { LotReferenceSkeleton, ILotReference } from "@/features/contentful/type";
import LivePreviewProviderWrapper from "@/features/contentful/live-preview-provider-wrapper";
import LotPageClient from "@/features/contentful/components/auction/lot-page-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  params: Promise<{ locale: Locale; id: string; lotNumber: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function LotPage({ params, searchParams }: Props) {
  const { locale, id: auctionId, lotNumber } = await params;
  const resolvedSp = await searchParams;
  const { isPreview } = await resolvePreviewMode(resolvedSp);

  const allCtfEntries = await getEntriesInEnvironment<LotReferenceSkeleton>({
    options: { content_type: "lotReference", include: 2, locale },
    isPreviewEnabled: isPreview,
    environment: "christies",
  }) as unknown as ILotReference[];

  // Build a concept → externalLotIds map so the client can find related lots by concept
  const conceptToLotIds: Record<string, string[]> = {};
  for (const e of allCtfEntries) {
    const concepts: string[] = ((e as any).metadata?.concepts ?? [])
      .map((c: any) => c?.sys?.id)
      .filter(Boolean);
    for (const conceptId of concepts) {
      if (!conceptToLotIds[conceptId]) conceptToLotIds[conceptId] = [];
      conceptToLotIds[conceptId].push(e.fields.externalLotId);
    }
  }

  return (
    <LivePreviewProviderWrapper locale={locale} isPreviewEnabled={isPreview}>
      <LotPageClient
        auctionId={auctionId}
        lotNumber={Number(lotNumber)}
        locale={locale}
        ctfEntries={allCtfEntries}
        conceptToLotIds={conceptToLotIds}
        isPreview={isPreview}
      />
    </LivePreviewProviderWrapper>
  );
}
