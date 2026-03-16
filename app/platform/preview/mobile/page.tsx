import { getI18nConfig } from "@/i18n-config";
import { resolvePreviewEntry, supportedTypes } from "../_lib/preview-registry";
import MobilePreviewShell from "../_components/mobile-preview-shell";
import MobilePreviewContent from "../_components/mobile-preview-content";
import PreviewErrorState from "../_components/preview-error-state";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

function str(val: string | string[] | undefined): string | undefined {
  if (Array.isArray(val)) return val[0];
  return val;
}

export default async function MobilePreviewPage({ searchParams }: Props) {
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
      <MobilePreviewShell>
        <PreviewErrorState type="missing-params" />
      </MobilePreviewShell>
    );
  }

  // Unsupported content type
  if (!supportedTypes.includes(type)) {
    return (
      <MobilePreviewShell>
        <PreviewErrorState
          type="unsupported-type"
          details={{ type, supportedTypes }}
        />
      </MobilePreviewShell>
    );
  }

  // Need at least entryId or slug
  if (!entryId && !slug) {
    return (
      <MobilePreviewShell>
        <PreviewErrorState type="missing-params" />
      </MobilePreviewShell>
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
      <MobilePreviewShell>
        <PreviewErrorState
          type="not-found"
          details={{ type, entryId, slug }}
        />
      </MobilePreviewShell>
    );
  }

  return (
    <MobilePreviewShell title={result.title} contentTypeId={result.contentTypeId}>
      <MobilePreviewContent
        contentTypeId={result.contentTypeId}
        entry={result.entry}
        locale={locale}
        isPreview={isPreview}
      />
    </MobilePreviewShell>
  );
}
