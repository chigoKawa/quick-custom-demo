import { getI18nConfig } from "@/i18n-config";
import { resolvePreviewEntry, supportedTypes } from "../_lib/preview-registry";
import InStorePreviewShell from "../_components/in-store-preview-shell";
import InStorePreviewContent from "../_components/in-store-preview-content";
import PreviewErrorState from "../_components/preview-error-state";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

/** Content types this channel can render (a subset of the registry's). */
const IN_STORE_TYPES = ["campaign"];

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

function str(val: string | string[] | undefined): string | undefined {
  if (Array.isArray(val)) return val[0];
  return val;
}

export default async function InStorePreviewPage({ searchParams }: Props) {
  const sp = await searchParams;

  const type = str(sp.type);
  const entryId = str(sp.entryId);
  const slug = str(sp.slug);
  const localeParam = str(sp.locale);
  const isPreview = true; // always use Preview API in this route


  // Resolve locale
  const { locales, defaultLocale } = await getI18nConfig();
  const locale =
    localeParam && locales.includes(localeParam) ? localeParam : defaultLocale;

  // Missing required params
  if (!type) {
    return (
      <InStorePreviewShell locale={locale}>
        <PreviewErrorState type="missing-params" channel="in-store" exampleType="campaign" />
      </InStorePreviewShell>
    );
  }

  // Unsupported content type. Checked against this channel's own list, not the
  // whole registry — landingPage resolves fine but has no in-store rendering.
  if (!supportedTypes.includes(type) || !IN_STORE_TYPES.includes(type)) {
    return (
      <InStorePreviewShell locale={locale}>
        <PreviewErrorState
          type="unsupported-type"
          channel="in-store"
          exampleType="campaign"
          details={{ type, supportedTypes: IN_STORE_TYPES }}
        />
      </InStorePreviewShell>
    );
  }

  // Need at least entryId or slug
  if (!entryId && !slug) {
    return (
      <InStorePreviewShell locale={locale}>
        <PreviewErrorState type="missing-params" channel="in-store" exampleType="campaign" />
      </InStorePreviewShell>
    );
  }

  // Fetch entry
  const result = await resolvePreviewEntry({
    type,
    entryId,
    slug,
    locale,
    isPreview,
  });

  if (!result) {
    return (
      <InStorePreviewShell locale={locale}>
        <PreviewErrorState
          type="not-found"
          channel="in-store"
          exampleType="campaign"
          details={{ type, entryId, slug }}
        />
      </InStorePreviewShell>
    );
  }

  return (
    <InStorePreviewShell
      title={result.title}
      contentTypeId={result.contentTypeId}
      previewType={type}
      entryId={entryId}
      slug={slug}
      locale={locale}
    >
      <InStorePreviewContent
        contentTypeId={result.contentTypeId}
        entry={result.entry}
        locale={locale}
        isPreview={isPreview}
      />
    </InStorePreviewShell>
  );
}
