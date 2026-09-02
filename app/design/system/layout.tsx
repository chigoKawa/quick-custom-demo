import type { ReactNode } from "react";
import AppProviders from "@/features/app-providers";
import { SiteChromeLocaleProvider } from "@/features/site-chrome-locale";

/**
 * The design system showcase lives outside the (site)/[locale] route group,
 * which is where AppProviders normally mounts NinetailedProvider. Several
 * components rendered here call useTracking() → useNinetailed(), which *throws*
 * without that provider, so the stack has to be re-created for this route.
 *
 * The live preview wrapper is deliberately left ON. Nothing here is a real
 * Contentful entry, but section wrappers call useContentfulLiveUpdates(), which
 * throws "Live updates are not initialized" unless ContentfulLivePreviewProvider
 * is mounted above it. AppProviders mounts it with enableLiveUpdates={false}
 * outside preview — the same state these components see in production.
 */
export default function DesignSystemLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <AppProviders>
      {/* useSiteChromeLocale() falls back to en-US on its own, but the button
          wrapper builds locale-aware hrefs — being explicit keeps the rendered
          URLs stable regardless of how this page is reached. */}
      <SiteChromeLocaleProvider locale="en-US" defaultLocale="en-US">
        {children}
      </SiteChromeLocaleProvider>
    </AppProviders>
  );
}
