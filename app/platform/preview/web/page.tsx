import { getI18nConfig } from "@/i18n-config";
import { resolvePreviewEntry, supportedTypes } from "../_lib/preview-registry";
import WebPreviewShell from "../_components/web-preview-shell";
import WebPreviewContent from "../_components/web-preview-content";
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

/** Public path the entry would live at, shown in the mock address bar. */
function publicPath(type: string, locale: string, slug?: string, entryId?: string): string {
  const ref = slug || entryId || "…";
  if (type === "campaign") return `/${locale}/campaigns/${ref}`;
  return `/${locale}/${ref}`;
}

export default async function WebPreviewPage({ searchParams }: Props) {
  const sp = await searchParams;

  const type = str(sp.type);
  const entryId = str(sp.entryId);
  const slug = str(sp.slug);
  const localeParam = str(sp.locale);
  const isPreview = true; // always use Preview API in this route


  const { locales, defaultLocale } = await getI18nConfig();
  const locale =
    localeParam && locales.includes(localeParam) ? localeParam : defaultLocale;

  if (!type) {
    return (
      <WebPreviewShell locale={locale}>
        <PreviewErrorState type="missing-params" channel="web" exampleType="campaign" />
      </WebPreviewShell>
    );
  }

  if (!supportedTypes.includes(type)) {
    return (
      <WebPreviewShell locale={locale}>
        <PreviewErrorState
          type="unsupported-type"
          channel="web"
          exampleType="campaign"
          details={{ type, supportedTypes }}
        />
      </WebPreviewShell>
    );
  }

  if (!entryId && !slug) {
    return (
      <WebPreviewShell locale={locale}>
        <PreviewErrorState type="missing-params" channel="web" exampleType="campaign" />
      </WebPreviewShell>
    );
  }

  const result = await resolvePreviewEntry({
    type,
    entryId,
    slug,
    locale,
    isPreview,
  });

  if (!result) {
    return (
      <WebPreviewShell locale={locale}>
        <PreviewErrorState
          type="not-found"
          channel="web"
          exampleType="campaign"
          details={{ type, entryId, slug }}
        />
      </WebPreviewShell>
    );
  }

  return (
    <WebPreviewShell
      title={result.title}
      contentTypeId={result.contentTypeId}
      previewType={type}
      entryId={entryId}
      slug={slug}
      locale={locale}
      path={publicPath(type, locale, slug, entryId)}
    >
      <WebPreviewContent
        contentTypeId={result.contentTypeId}
        entry={result.entry}
        locale={locale}
        defaultLocale={defaultLocale}
        isPreview={isPreview}
      />
    </WebPreviewShell>
  );
}
