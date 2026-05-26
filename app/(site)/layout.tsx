import AppProviders from "@/features/app-providers";
import { DemoPanel } from "@/features/demo-panel";
import { getI18nConfig } from "@/i18n-config";
import { getActiveMarketCode } from "@/lib/market-overrides/server";
import { MarketProvider } from "@/lib/market-overrides/react";
import { getMarkets } from "@/lib/markets";

export default async function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [marketCode, { locales }, markets] = await Promise.all([
    getActiveMarketCode(),
    getI18nConfig(),
    getMarkets(),
  ]);
  return (
    <MarketProvider marketCode={marketCode}>
      <AppProviders>
        <DemoPanel markets={markets} i18nLocales={locales} />
        {children}
      </AppProviders>
    </MarketProvider>
  );
}
