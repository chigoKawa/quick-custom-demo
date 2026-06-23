/* eslint-disable @typescript-eslint/no-explicit-any */
import { notFound } from "next/navigation";
import type { Metadata, ResolvingMetadata } from "next";

import type { Locale } from "@/i18n-config";
import { getEntries } from "@/lib/contentful";
import { resolvePreviewMode } from "@/lib/preview";
import type { SocialVariantSkeleton, ISocialVariant } from "@/features/contentful/type";
import LivePreviewProviderWrapper from "@/features/contentful/live-preview-provider-wrapper";
import SocialVariantPreviewClient from "@/features/contentful/components/social-variant/social-variant-preview-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  params: Promise<{ locale: Locale; id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function SocialVariantPreviewPage({ params, searchParams }: Props) {
  const { locale, id } = await params;
  const resolvedSp = await searchParams;
  const { isPreview, timelineToken, environmentId } = await resolvePreviewMode(resolvedSp);

  const entries = await getEntries<SocialVariantSkeleton>(
    {
      content_type: "socialVariant",
      "sys.id": id,
      include: 3,
      locale,
    },
    isPreview,
    timelineToken,
    environmentId,
  );

  const entry = entries[0] as unknown as ISocialVariant | undefined;
  if (!entry) notFound();

  return (
    <LivePreviewProviderWrapper locale={locale} isPreviewEnabled={isPreview}>
      <SocialVariantPreviewClient
        entry={entry}
        locale={locale}
        isPreview={isPreview}
      />
    </LivePreviewProviderWrapper>
  );
}

export async function generateMetadata(
  { params, searchParams }: Props,
  _parent: ResolvingMetadata,
): Promise<Metadata> {
  const { locale, id } = await params;
  const resolvedSp = await searchParams;
  const { isPreview, timelineToken, environmentId } = await resolvePreviewMode(resolvedSp);

  const entries = await getEntries<SocialVariantSkeleton>(
    {
      content_type: "socialVariant",
      "sys.id": id,
      include: 1,
      locale,
    },
    isPreview,
    timelineToken,
    environmentId,
  );

  const entry = entries[0] as unknown as ISocialVariant | undefined;
  if (!entry) return {};

  return {
    title: `${entry.fields.internalName} | Social Variant Preview`,
    description: `${entry.fields.platform} preview — status: ${entry.fields.status}`,
  };
}
