"use client";

import React from "react";
import type { ICampaign } from "../../type";
import CampaignPageClient from "./campaign-page-client";
import type { CampaignRendererProps } from "./personalized-campaign";

/**
 * Web channel adapter for <Experience>.
 *
 * Module-level on purpose: <Experience> must receive the same component
 * reference across renders, or it unmounts and remounts the tree on every
 * profile change.
 *
 * <Experience> spreads the resolved entry as top-level props, while
 * CampaignPageClient takes a named `entry`. Re-assembling it here is what makes
 * the two conventions meet — passing the renderer straight to `component=`
 * would leave `entry` undefined (the bug frame-duplex.tsx:369 has today).
 */
export default function CampaignExperienceRenderer(props: CampaignRendererProps) {
  const { locale, isPreview, ninetailed: _nt, ...entry } = props;

  return (
    <CampaignPageClient
      entry={entry as unknown as ICampaign}
      locale={locale}
      isPreview={isPreview}
    />
  );
}
