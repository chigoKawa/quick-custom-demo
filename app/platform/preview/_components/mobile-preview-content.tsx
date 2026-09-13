"use client";

import React from "react";
import type { ICampaign, ILandingPage } from "@/features/contentful/type";
import AppProviders from "@/features/app-providers";
import LivePreviewProviderWrapper from "@/features/contentful/live-preview-provider-wrapper";
import PersonalizedCampaign from "@/features/contentful/components/campaign/personalized-campaign";
import MobileLandingPage from "./mobile-landing-page";
import { MobileCampaignExperienceRenderer } from "./mobile-campaign";

type Props = {
  contentTypeId: string;
  entry: unknown;
  locale: string;
  isPreview: boolean;
};

/**
 * Renders the appropriate Contentful component inside the mobile preview shell,
 * wrapped with Live Preview provider for inspector mode + live updates.
 *
 * Campaigns additionally need NinetailedProvider (campaign-level personalization
 * calls useNinetailed via <Experience>), which AppProviders mounts — along with
 * its own ContentfulLivePreviewProvider, so the two paths differ in wrapping.
 *
 * Add new content type renderers here as they become supported.
 */
export default function MobilePreviewContent({
  contentTypeId,
  entry,
  locale,
  isPreview,
}: Props) {
  if (contentTypeId === "campaign") {
    return (
      <AppProviders skipLivePreviewWrapper>
        <LivePreviewProviderWrapper locale={locale} isPreviewEnabled={isPreview}>
          <PersonalizedCampaign
            entry={entry as ICampaign}
            locale={locale}
            isPreview={isPreview}
            renderer={MobileCampaignExperienceRenderer}
          />
        </LivePreviewProviderWrapper>
      </AppProviders>
    );
  }

  return (
    <LivePreviewProviderWrapper locale={locale} isPreviewEnabled={isPreview}>
      <ContentRenderer contentTypeId={contentTypeId} entry={entry} />
    </LivePreviewProviderWrapper>
  );
}

function ContentRenderer({
  contentTypeId,
  entry,
}: {
  contentTypeId: string;
  entry: unknown;
}) {
  switch (contentTypeId) {
    case "landingPage":
      return <MobileLandingPage entry={entry as ILandingPage} />;

    default:
      return (
        <div className="flex items-center justify-center h-full p-8 text-center">
          <div>
            <p className="text-lg font-semibold text-neutral-800 mb-2">
              Unsupported content type
            </p>
            <p className="text-sm text-neutral-500">
              <code className="px-1.5 py-0.5 bg-neutral-100 rounded text-xs font-mono">
                {contentTypeId}
              </code>{" "}
              is not yet supported in mobile preview.
            </p>
          </div>
        </div>
      );
  }
}
