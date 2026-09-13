"use client";

import React from "react";
import { useContentfulLiveUpdates } from "@contentful/live-preview/react";
import type { ICampaign } from "@/features/contentful/type";
import { mobileSectionsComponentMap } from "./mobile-sections";
import { resolveCampaignPromo, resolveCampaignProducts } from "../_lib/campaign-promo";
import CampaignPromoHeader from "./campaign-promo-header";
import FeaturedProductShowcase from "@/features/contentful/components/campaign/featured-product-showcase";

type Props = {
  entry: ICampaign;
};

/**
 * Adapter for <Experience>, which spreads the resolved entry (baseline or
 * winning variant) as top-level props rather than a named `entry`.
 * Module-level so the component reference is stable across profile changes.
 */
export function MobileCampaignExperienceRenderer(
  props: ICampaign & { locale?: string; isPreview?: boolean }
) {
  const { locale: _l, isPreview: _p, ...entry } = props as unknown as Record<string, unknown>;
  return <MobileCampaign entry={entry as unknown as ICampaign} />;
}

/**
 * Mobile-optimized campaign renderer.
 *
 * Renders the campaign's promo header (shared with the in-store surface, so the
 * two channels visibly derive from the same field) followed by
 * heroComponent → topSections → bottomSections through the existing mobile
 * component map. Baseline content only — no Ninetailed personalization, which
 * matches the rest of the preview harness.
 */
export default function MobileCampaign({ entry }: Props) {
  // Per CLAUDE.md: never hand a fully-resolved include:6 entry to
  // useContentfulLiveUpdates — lodash isEqual blows the call stack. Strip the
  // Ninetailed link fields (where the cycles live) and keep only sys + scalars
  // for the diff, then render from the fully-resolved server entry.
  const { nt_experiences: _ntExp, nt_variants: _ntVar, ...campaignFields } =
    (entry?.fields ?? {}) as Record<string, unknown>;

  const liveEntry =
    useContentfulLiveUpdates({ sys: entry?.sys, fields: campaignFields } as ICampaign) ?? entry;

  if (!entry?.sys?.id || !entry?.fields) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center">
        <p className="text-sm text-muted-foreground">Campaign could not be loaded</p>
      </div>
    );
  }

  // Scalars (headline, promoTitle, dates) come from the live entry so text
  // edits stream in; linked sections come from the server entry, which is the
  // only fully-resolved copy.
  const promoEntry = {
    sys: entry.sys,
    fields: { ...entry.fields, ...(liveEntry?.fields ?? {}) },
  } as ICampaign;
  const promo = resolveCampaignPromo(promoEntry);
  const products = resolveCampaignProducts(promoEntry);
  const featuredProduct = products.length === 1 ? products[0] : null;

  const hero = entry.fields.heroComponent;
  const topSections = Array.isArray(entry.fields.topSections) ? entry.fields.topSections : [];
  const bottomSections = Array.isArray(entry.fields.bottomSections)
    ? entry.fields.bottomSections
    : [];

  const sections = [...(hero ? [hero] : []), ...topSections, ...bottomSections];
  const renderable = sections.filter(
    (s) => (s as { fields?: unknown })?.fields && (s as { sys?: { id?: string } })?.sys?.id
  );

  return (
    <div className="w-full">
      {/* Featured product leads, matching web and in-store. */}
      {featuredProduct && (
        <FeaturedProductShowcase product={featuredProduct} variant="mobile" />
      )}

      <CampaignPromoHeader promo={promo} validTo={entry.fields.validTo} compact />

      {renderable.length === 0 && products.length === 0 && (
        <div className="mx-4 my-4 rounded-lg border border-dashed border-muted-foreground/30 p-4 text-center">
          <p className="text-xs text-muted-foreground">
            This campaign has no resolvable sections to render.
          </p>
        </div>
      )}

      {renderable.map((section, index) => {
        const s = section as { sys: { id: string; contentType?: { sys?: { id?: string } } } };
        const contentTypeId = s.sys.contentType?.sys?.id;
        if (!contentTypeId) return null;

        const Component = mobileSectionsComponentMap[contentTypeId];

        if (!Component) {
          if (process.env.NODE_ENV === "development") {
            console.warn(
              `[MobileCampaign] No mobile component for "${contentTypeId}" (entry ${s.sys.id})`
            );
          }
          return (
            <div
              key={s.sys.id || index}
              className="mx-4 my-3 rounded-lg border border-dashed border-muted-foreground/30 p-3 text-center"
            >
              <p className="text-xs text-muted-foreground">
                <code className="font-mono">{contentTypeId}</code> — no mobile preview available
              </p>
            </div>
          );
        }

        return <Component key={`mobile-${s.sys.id || index}`} {...section} />;
      })}
    </div>
  );
}
