import { notFound } from "next/navigation";
import { getI18nConfig } from "@/i18n-config";
import { isPreviewEnabled, getTimelineToken } from "@/lib/utils";
import { IntegrationFactory } from "@/lib/integrations/core/integration-factory";
import type { IPmsIntegration } from "@/lib/integrations/pms/pms.interface";
import {
  getPmsPropertyEntryById,
  mapPmsPropertyEntryToProps,
} from "@/lib/pms-property";
import LivePreviewProviderWrapper from "@/features/contentful/live-preview-provider-wrapper";
import PropertyDetailPage from "@/features/contentful/components/pms-property/property-detail-page";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type Props = {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function PropertyRoute({ params, searchParams }: Props) {
  const resolvedSearchParams = await searchParams;
  const preview = isPreviewEnabled(resolvedSearchParams);
  const timelineToken = getTimelineToken(resolvedSearchParams);
  const { locale, id } = await params;
  const { locales, defaultLocale } = await getI18nConfig();
  const effectiveLocale = locales.includes(locale as string) ? locale : defaultLocale;

  // Fetch PMS data and Contentful enrichment in parallel
  const [pmsProperty, ctfEntry] = await Promise.all([
    IntegrationFactory.getIntegration("pms")
      .then((pms) => (pms as IPmsIntegration).getProperty(id))
      .catch((err) => {
        console.error("[PropertyRoute] PMS fetch error", err);
        return null;
      }),
    getPmsPropertyEntryById(id, effectiveLocale, !!preview, timelineToken).catch(
      () => null
    ),
  ]);

  if (!pmsProperty) {
    notFound();
  }

  const ctfEntryProps = ctfEntry ? mapPmsPropertyEntryToProps(ctfEntry) : null;

  return (
    <LivePreviewProviderWrapper
      locale={effectiveLocale}
      isPreviewEnabled={!!preview}
    >
      <PropertyDetailPage
        pmsProperty={pmsProperty}
        ctfEntry={ctfEntryProps}
        locale={effectiveLocale}
      />
    </LivePreviewProviderWrapper>
  );
}

export const dynamicParams = true;
