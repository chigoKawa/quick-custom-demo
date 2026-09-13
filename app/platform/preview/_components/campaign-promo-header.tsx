"use client";

import React from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { CampaignPromo } from "../_lib/campaign-promo";

type Props = {
  promo: CampaignPromo;
  validTo?: string;
  /** Mobile variant — tighter type, smaller image. */
  compact?: boolean;
  className?: string;
};

function formatEnds(validTo?: string): string | null {
  if (!validTo) return null;
  const date = new Date(validTo);
  if (Number.isNaN(date.getTime())) return null;
  return `Ends ${format(date, "d MMM")}`;
}

/**
 * The campaign's promotional unit, shared by the mobile and in-store surfaces
 * so both channels visibly derive from the same source field. Uses design
 * tokens only, so it inherits any injected brand theme.
 */
export default function CampaignPromoHeader({ promo, validTo, compact, className }: Props) {
  const ends = formatEnds(validTo);

  // With no promoTitle the resolver falls back to the campaign name, which is
  // also the eyebrow — showing both just repeats the same words. Drop the
  // eyebrow in that case.
  const showName = Boolean(promo.name) && promo.name !== promo.headline;

  // Nothing left to say: no headline beyond the name, no subtitle, no image.
  // The caller (a product-led campaign) has already shown everything.
  const isRedundant = !showName && !promo.subtitle && !promo.imageUrl;
  if (isRedundant && !ends) return null;

  return (
    <section className={cn("flex w-full min-h-0 flex-col", className)}>
      {promo.imageUrl && (
        // On the kiosk the image is capped by viewport height rather than a
        // fixed ratio, so the scan target and provenance footer stay on screen.
        <div
          className={cn(
            "w-full bg-secondary",
            compact ? "aspect-[16/10]" : "aspect-[4/5] max-h-[55%] shrink-0"
          )}
        >
          <img
            src={promo.imageUrl}
            alt={promo.headline || promo.name}
            className="h-full w-full object-cover"
            style={{ objectPosition: promo.objectPosition || "center center" }}
          />
        </div>
      )}

      <div className={cn(compact ? "px-4 py-5" : "px-8 py-8")}>
        {showName && (
          <p
            className={cn(
              "font-mono uppercase tracking-widest text-muted-foreground",
              compact ? "text-[11px]" : "text-xs"
            )}
          >
            {promo.name}
          </p>
        )}

        {promo.headline && (
          <h1
            className={cn(
              "mt-2 font-bold tracking-tight text-foreground",
              compact ? "text-2xl" : "text-4xl"
            )}
          >
            {promo.headline}
          </h1>
        )}

        {promo.subtitle && (
          <p
            className={cn(
              "mt-3 leading-relaxed text-muted-foreground",
              compact ? "text-sm" : "text-lg"
            )}
          >
            {promo.subtitle}
          </p>
        )}

        {ends && (
          <p
            className={cn(
              "mt-4 font-semibold uppercase tracking-widest text-muted-foreground",
              compact ? "text-[11px]" : "text-xs"
            )}
          >
            {ends}
          </p>
        )}
      </div>
    </section>
  );
}
