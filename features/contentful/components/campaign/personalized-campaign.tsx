"use client";

import React from "react";
import { Experience } from "@ninetailed/experience.js-react";
import { ExperienceMapper } from "@ninetailed/experience.js-utils-contentful";
import { stripNtFromMappedExperiences } from "@/lib/contentful-live-preview-shallow";
import type { ICampaign } from "../../type";

/**
 * Campaign-level Ninetailed personalization.
 *
 * A campaign's experiences use `EntryReplacement` where the baseline IS the
 * campaign entry and each variant is ANOTHER campaign entry — so the whole page
 * swaps per audience (hero, sections and featured product together). This is the
 * same shape as features/personalization/personalized-site-settings.tsx, the
 * repo's existing whole-entry precedent.
 *
 * Shared by the public route and all three preview channels; each passes its own
 * `renderer`, so the mapping/stripping rules live in exactly one place.
 */

/**
 * Props a channel renderer receives. `<Experience>` spreads the resolved entry
 * (baseline or winning variant) as top-level props, so the entry arrives as
 * `sys`/`fields` — NOT as a named `entry` prop. `locale`/`isPreview` are not on
 * the entry, so they travel via the SDK's `passthroughProps`.
 */
export type CampaignRendererProps = ICampaign & {
  locale: string;
  isPreview: boolean;
  /** Injected by <Experience> when a variant was selected. */
  ninetailed?: { isPersonalized: boolean; audience: { id: string } };
};

export type CampaignRenderer = React.ComponentType<CampaignRendererProps>;

type Props = {
  entry: ICampaign;
  locale: string;
  isPreview: boolean;
  /**
   * The channel's renderer. MUST be a module-level component — an inline one
   * makes <Experience> remount the whole tree on every profile change, which
   * flickers (see personalized-site-settings.tsx).
   */
  renderer: CampaignRenderer;
};

export default function PersonalizedCampaign({ entry, locale, isPreview, renderer }: Props) {
  const Renderer = renderer;

  // Missing/!malformed entry — nothing to personalize.
  if (!entry?.sys?.id || !entry?.fields) {
    return <Renderer {...(entry as ICampaign)} locale={locale} isPreview={isPreview} />;
  }

  const experiencesUnknown = (entry.fields.nt_experiences ?? []) as unknown[];

  const isExp = ExperienceMapper.isExperienceEntry as (v: unknown) => boolean;
  const mapExp = ExperienceMapper.mapExperience as (v: unknown) => unknown;

  let mappedExperiences: unknown[] = [];
  try {
    mappedExperiences = experiencesUnknown.filter(isExp).map(mapExp);
  } catch {
    // A malformed experience must not take the page down — render the baseline.
    return <Renderer {...entry} locale={locale} isPreview={isPreview} />;
  }

  if (mappedExperiences.length === 0) {
    return <Renderer {...entry} locale={locale} isPreview={isPreview} />;
  }

  // Strip nt_experiences / nt_variants from the baseline before spreading: the
  // resolved experience entries back-reference the baseline, and that cycle
  // breaks the JSON.stringify the Ninetailed preview plugin does over postMessage.
  const { nt_experiences: _ntExp, nt_variants: _ntVar, ...campaignFields } =
    entry.fields as Record<string, unknown>;
  const baselineEntry = { sys: entry.sys, fields: campaignFields } as ICampaign;

  // The SDK infers its variant generic from `component`, which cannot be
  // reconciled with the loosely-typed mapper output; every other Personalized*
  // wrapper in the repo casts here for the same reason.
  const ExperienceAny = Experience as unknown as React.ComponentType<Record<string, unknown>>;

  return (
    <ExperienceAny
      key={entry.sys.id}
      id={entry.sys.id}
      component={Renderer}
      experiences={stripNtFromMappedExperiences(mappedExperiences)}
      passthroughProps={{ locale, isPreview }}
      {...baselineEntry}
    />
  );
}
