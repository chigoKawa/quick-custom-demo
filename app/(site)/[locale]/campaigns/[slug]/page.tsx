/* eslint-disable @typescript-eslint/no-explicit-any */
import { notFound, redirect } from "next/navigation";
import type { Metadata, ResolvingMetadata } from "next";

import type { Locale } from "@/i18n-config";
import { getEntries } from "@/lib/contentful";
import { resolvePreviewMode } from "@/lib/preview";
import type { CampaignSkeleton, ICampaign } from "@/features/contentful/type";
import LivePreviewProviderWrapper from "@/features/contentful/live-preview-provider-wrapper";
import CampaignPageClient from "@/features/contentful/components/campaign/campaign-page-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  params: Promise<{ locale: Locale; slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

function isCampaignActive(entry: ICampaign): boolean {
  const now = new Date();
  const from = entry.fields.validFrom ? new Date(entry.fields.validFrom) : null;
  const to = entry.fields.validTo ? new Date(entry.fields.validTo) : null;
  if (from && now < from) return false;
  if (to && now > to) return false;
  return true;
}

export default async function CampaignPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  const resolvedSp = await searchParams;
  const { isPreview, timelineToken, environmentId } = await resolvePreviewMode(resolvedSp);

  const entries = await getEntries<CampaignSkeleton>(
    {
      content_type: "campaign",
      "fields.slug": slug,
      include: 6,
      locale,
    },
    isPreview,
    timelineToken,
    environmentId,
  );

  const entry = entries[0] as unknown as ICampaign | undefined;
  if (!entry) notFound();

  const active = isCampaignActive(entry);
  if (!active && !isPreview) redirect(`/${locale}`);

  return (
    <LivePreviewProviderWrapper locale={locale} isPreviewEnabled={isPreview}>
      <CampaignPageClient
        entry={entry}
        locale={locale}
        isPreview={isPreview}
      />
    </LivePreviewProviderWrapper>
  );
}

export async function generateMetadata(
  { params, searchParams }: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const { locale, slug } = await params;
  const resolvedSp = await searchParams;
  const { isPreview, timelineToken, environmentId } = await resolvePreviewMode(resolvedSp);

  const entries = await getEntries<CampaignSkeleton>(
    {
      content_type: "campaign",
      "fields.slug": slug,
      include: 2,
      locale,
    },
    isPreview,
    timelineToken,
    environmentId,
  );

  const entry = entries[0] as unknown as ICampaign | undefined;
  if (!entry) return {};

  const seo = entry.fields.seoMetadata as any;

  return {
    title: seo?.fields?.title ?? `${entry.fields.name} | Campaign`,
    description: seo?.fields?.description ?? "",
  };
}
