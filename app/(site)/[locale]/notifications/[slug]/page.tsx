/* eslint-disable @typescript-eslint/no-explicit-any */
import { notFound } from "next/navigation";
import type { Metadata, ResolvingMetadata } from "next";

import { getI18nConfig, type Locale } from "@/i18n-config";
import { getEntries } from "@/lib/contentful";
import { resolvePreviewMode } from "@/lib/preview";
import type { NotificationTemplateSkeleton, INotificationTemplate } from "@/features/contentful/type";
import LivePreviewProviderWrapper from "@/features/contentful/live-preview-provider-wrapper";
import NotificationPreviewClient from "@/features/contentful/components/notification/notification-preview-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  params: Promise<{ locale: Locale; slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function NotificationPreviewPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  const resolvedSp = await searchParams;
  const { isPreview, timelineToken } = await resolvePreviewMode(resolvedSp);

  const entries = await getEntries<NotificationTemplateSkeleton>(
    {
      content_type: "notificationTemplate",
      "fields.slug": slug,
      include: 3,
      locale,
    },
    isPreview,
    timelineToken,
  );

  const entry = entries[0] as unknown as INotificationTemplate | undefined;
  if (!entry) notFound();

  return (
    <LivePreviewProviderWrapper locale={locale} isPreviewEnabled={isPreview}>
      <NotificationPreviewClient
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
  const { locale, slug } = await params;
  const resolvedSp = await searchParams;
  const { isPreview, timelineToken } = await resolvePreviewMode(resolvedSp);

  const entries = await getEntries<NotificationTemplateSkeleton>(
    {
      content_type: "notificationTemplate",
      "fields.slug": slug,
      include: 1,
      locale,
    },
    isPreview,
    timelineToken,
  );

  const entry = entries[0] as unknown as INotificationTemplate | undefined;
  if (!entry) return {};

  return {
    title: `${entry.fields.internalName} | Notification Preview`,
    description: `Preview for ${entry.fields.key} (${entry.fields.channel}) notification template`,
  };
}
