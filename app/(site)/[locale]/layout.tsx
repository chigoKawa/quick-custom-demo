import PersonalizedSiteSettings from "@/features/personalization/personalized-site-settings";
import CouponAlert from "@/features/personalization/coupon-alert";
import { SiteChromeLocaleProvider } from "@/features/site-chrome-locale";
import { getSiteSettings } from "@/lib/site-settings";
import { themeToCSS } from "@/lib/theme";
import { draftMode, headers } from "next/headers";
import { getI18nConfig, type Locale } from "@/i18n-config";

export const revalidate = 60;

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: Locale }>;
}>) {
  const { locale: rawLocale } = await params;
  const { locales, defaultLocale } = await getI18nConfig();
  const locale = locales.includes(rawLocale) ? rawLocale : defaultLocale;

  const { isEnabled: isDraftMode } = await draftMode();
  const headersList = await headers();
  const isPreview =
    isDraftMode || headersList.get("x-contentful-preview") === "1";
  const timelineToken = headersList.get("x-contentful-timeline") || null;
  const environmentId = isPreview
    ? headersList.get("x-contentful-env") || null
    : null;

  let siteSettings = null;
  try {
    siteSettings = await getSiteSettings(
      locale,
      isPreview,
      timelineToken || undefined,
      environmentId || undefined
    );
  } catch (error) {
    console.error("Failed to fetch site settings:", error);
  }

  const themeCSS = themeToCSS(siteSettings?.fields?.theme ?? null);

  return (
    <SiteChromeLocaleProvider locale={locale} defaultLocale={defaultLocale}>
      {themeCSS && <style dangerouslySetInnerHTML={{ __html: themeCSS }} />}
      <PersonalizedSiteSettings key={locale} siteSettings={siteSettings}>
        <CouponAlert />
        {children}
      </PersonalizedSiteSettings>
    </SiteChromeLocaleProvider>
  );
}
