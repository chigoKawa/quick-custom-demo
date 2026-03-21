import { getMicrocopyWithIds } from "@/lib/microcopy";
import { getI18nConfig } from "@/i18n-config";
import { LoginForm } from "./login-form";
import { isPreviewEnabled, getTimelineToken } from "@/lib/utils";

export default async function LoginPage(
  props: {
    params: Promise<{ locale: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  }
) {
  const { locale } = await props.params;
  const searchParams = await props.searchParams;
  const { locales, defaultLocale } = await getI18nConfig();
  const effectiveLocale = locales.includes(locale as string) ? locale : defaultLocale;
  const isPreview = isPreviewEnabled(searchParams);
  const timelineToken = getTimelineToken(searchParams);

  // Fetch microcopy with entry IDs for inspector mode
  const microcopy = await getMicrocopyWithIds(effectiveLocale, isPreview, timelineToken);

  return <LoginForm microcopy={microcopy} locale={effectiveLocale} />;
}
