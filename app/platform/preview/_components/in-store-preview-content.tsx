"use client";

import React from "react";
import type { ICampaign } from "@/features/contentful/type";
import AppProviders from "@/features/app-providers";
import LivePreviewProviderWrapper from "@/features/contentful/live-preview-provider-wrapper";
import PersonalizedCampaign from "@/features/contentful/components/campaign/personalized-campaign";
import { InStoreCampaignExperienceRenderer } from "./in-store-campaign";

type Props = {
  contentTypeId: string;
  entry: unknown;
  locale: string;
  isPreview: boolean;
};

/**
 * Renders a Contentful entry inside the in-store shell.
 *
 * AppProviders supplies NinetailedProvider, which campaign-level personalization
 * requires (<Experience> → useNinetailed throws without it). Its own live-preview
 * wrapper is skipped so the locale-aware one below is the single provider.
 *
 * Add new content type renderers here as they become supported.
 */
export default function InStorePreviewContent({
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
            renderer={InStoreCampaignExperienceRenderer}
          />
        </LivePreviewProviderWrapper>
      </AppProviders>
    );
  }

  return (
    <div className="flex h-full items-center justify-center bg-neutral-950 p-8 text-center">
      <div>
        <p className="mb-2 text-lg font-semibold text-white">Unsupported content type</p>
        <p className="text-sm text-neutral-400">
          <code className="rounded bg-neutral-800 px-1.5 py-0.5 font-mono text-xs">
            {contentTypeId}
          </code>{" "}
          is not yet supported in in-store preview.
        </p>
      </div>
    </div>
  );
}
