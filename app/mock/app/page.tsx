import { resolvePreviewMode } from "@/lib/preview";
import AppShell from "./_components/app-shell";
import AppLivePreviewWrapper from "./_components/app-live-preview-wrapper";
import { EntriesProvider } from "./_components/entries-context";
import { loadAppData } from "./_lib/load-app-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

function pickFirst(val: string | string[] | undefined): string | null {
  if (Array.isArray(val)) return val[0] ?? null;
  return val ?? null;
}

export default async function MockAppPage({ searchParams }: Props) {
  const sp = await searchParams;
  const { isPreview, environmentId } = await resolvePreviewMode(sp);
  const envOverride = environmentId ?? null;
  const localeParam = pickFirst(sp.locale);

  const data = await loadAppData({
    isPreview,
    environmentId: envOverride,
    locale: localeParam,
  });

  const { screens, theme, brandName, logoUrl, locale, availableLocales, entriesIndex } = data;

  return (
    <AppLivePreviewWrapper isPreview={isPreview} environment={envOverride} locale={locale}>
      <EntriesProvider index={entriesIndex}>
        <AppShell
          screens={screens}
          isPreview={isPreview}
          theme={theme}
          brandName={brandName}
          logoUrl={logoUrl}
          locale={locale}
          availableLocales={availableLocales}
        />
      </EntriesProvider>
    </AppLivePreviewWrapper>
  );
}
