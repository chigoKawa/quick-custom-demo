"use client";

import React from "react";
import type { ICampaign, ILandingPage } from "@/features/contentful/type";
import AppProviders from "@/features/app-providers";
import { SiteChromeLocaleProvider } from "@/features/site-chrome-locale";
import PersonalizedCampaign from "@/features/contentful/components/campaign/personalized-campaign";
import CampaignExperienceRenderer from "@/features/contentful/components/campaign/campaign-experience-renderer";
import ContentfulLandingPage from "@/features/contentful/components/contentful-landing-page";

type Props = {
  contentTypeId: string;
  entry: unknown;
  locale: string;
  defaultLocale: string;
  isPreview: boolean;
};

/**
 * Renders the REAL web components inside the browser-frame shell, so the web
 * channel shows the actual page rather than a re-implementation.
 *
 * Why AppProviders: this route lives outside `(site)/[locale]`, where
 * NinetailedProvider is normally mounted. The real section components call
 * useTracking() → useNinetailed(), which THROWS without it — the same reason
 * app/design/system/layout.tsx re-creates the stack. AppProviders also mounts
 * ContentfulLivePreviewProvider, so this must not add its own wrapper on top.
 *
 * The mobile and in-store channels don't need this: their renderers are
 * purpose-built and touch no Ninetailed hooks.
 */
export default function WebPreviewContent({
  contentTypeId,
  entry,
  locale,
  defaultLocale,
  isPreview,
}: Props) {
  return (
    <AppProviders>
      <SiteChromeLocaleProvider locale={locale} defaultLocale={defaultLocale}>
        <ContentRenderer
          contentTypeId={contentTypeId}
          entry={entry}
          locale={locale}
          isPreview={isPreview}
        />
      </SiteChromeLocaleProvider>
    </AppProviders>
  );
}

function ContentRenderer({
  contentTypeId,
  entry,
  locale,
  isPreview,
}: {
  contentTypeId: string;
  entry: unknown;
  locale: string;
  isPreview: boolean;
}) {
  switch (contentTypeId) {
    case "campaign":
      return (
        <PersonalizedCampaign
          entry={entry as ICampaign}
          locale={locale}
          isPreview={isPreview}
          renderer={CampaignExperienceRenderer}
        />
      );

    case "landingPage":
      return <ContentfulLandingPage entry={entry as ILandingPage} />;

    default:
      return (
        <div className="flex h-full items-center justify-center p-8 text-center">
          <div>
            <p className="mb-2 text-lg font-semibold text-foreground">
              Unsupported content type
            </p>
            <p className="text-sm text-muted-foreground">
              <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs">
                {contentTypeId}
              </code>{" "}
              is not yet supported in web preview.
            </p>
          </div>
        </div>
      );
  }
}
