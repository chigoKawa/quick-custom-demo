import type { Locale } from "@/i18n-config";
import { getEntriesInEnvironment } from "@/lib/contentful";
import { resolvePreviewMode } from "@/lib/preview";
import type { AuctionSkeleton, IAuction } from "@/features/contentful/type";
import LivePreviewProviderWrapper from "@/features/contentful/live-preview-provider-wrapper";
import AuctionPageClient from "@/features/contentful/components/auction/auction-page-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  params: Promise<{ locale: Locale; id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function AuctionPage({ params, searchParams }: Props) {
  const { locale, id } = await params;
  const resolvedSp = await searchParams;
  const { isPreview } = await resolvePreviewMode(resolvedSp);

  const allAuctions = await getEntriesInEnvironment<AuctionSkeleton>({
    options: { content_type: "auction", include: 3, locale },
    isPreviewEnabled: isPreview,
  }) as unknown as IAuction[];

  // Find the entry whose externalAuctionId snapshot matches the URL id param
  const entry = allAuctions.find(
    (e) => (e.fields.externalAuctionId as any)?.externalAuctionId === id
  );

  // Find related auctions sharing at least one taxonomy concept
  const conceptIds: string[] = ((entry as any)?.metadata?.concepts ?? [])
    .map((c: any) => c?.sys?.id)
    .filter(Boolean);

  const relatedAuctions = conceptIds.length > 0
    ? allAuctions.filter((e) => {
        if ((e.fields.externalAuctionId as any)?.externalAuctionId === id) return false;
        const entryConcepts: string[] = ((e as any).metadata?.concepts ?? [])
          .map((c: any) => c?.sys?.id)
          .filter(Boolean);
        return entryConcepts.some((c) => conceptIds.includes(c));
      })
    : [];

  return (
    <LivePreviewProviderWrapper locale={locale} isPreviewEnabled={isPreview}>
      <AuctionPageClient
        auctionId={id}
        locale={locale}
        ctfEntry={entry ?? null}
        relatedAuctions={relatedAuctions}
        isPreview={isPreview}
      />
    </LivePreviewProviderWrapper>
  );
}
