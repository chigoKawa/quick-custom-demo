"use client";

import React from "react";
import { useContentfulLiveUpdates } from "@contentful/live-preview/react";
import { format } from "date-fns";
import type { ICampaign } from "@/features/contentful/type";
import {
  resolveCampaignPromo,
  resolveCampaignProducts,
  formatProductPrice,
} from "../_lib/campaign-promo";
import QrPlaceholder from "./qr-placeholder";
import { useScreenOrientation } from "./screen-orientation-context";

type Props = {
  entry: ICampaign;
  locale: string;
  /** True for 9:16 totem screens, which stack rather than split. */
  portrait?: boolean;
};

/**
 * Adapter for <Experience>, which spreads the resolved entry as top-level props
 * rather than a named `entry`. Module-level so the reference stays stable across
 * profile changes. Orientation comes from context, not from the entry.
 */
export function InStoreCampaignExperienceRenderer(
  props: ICampaign & { locale?: string; isPreview?: boolean }
) {
  const { locale, isPreview: _p, ...entry } = props as unknown as Record<string, unknown>;
  const { portrait } = useScreenOrientation();
  return (
    <InStoreCampaign
      entry={entry as unknown as ICampaign}
      locale={(locale as string) ?? "en-US"}
      portrait={portrait}
    />
  );
}

/**
 * In-store signage layout for a campaign.
 *
 * Follows established digital-signage practice rather than mirroring the web
 * page: one hero zone plus supporting zones, an F-pattern reading order
 * (headline top-left of the text column), a hard cap on copy (the "3x5 rule" —
 * ~3 lines of ~5 words), high-contrast light-on-dark, and a ~5% safe margin
 * because panels crop at the frame. Sized for a 7-10ft viewing distance, so
 * type is far larger than the web or mobile channels.
 *
 * When the campaign features a product, that product leads — the screen becomes
 * a product showcase, which is what an endcap or shelf screen is actually for.
 */
export default function InStoreCampaign({ entry, locale, portrait = false }: Props) {
  // Per CLAUDE.md: strip the Ninetailed link fields before the live-updates
  // hook — an include:6 campaign graph overflows lodash isEqual otherwise.
  const { nt_experiences: _ntExp, nt_variants: _ntVar, ...campaignFields } =
    (entry?.fields ?? {}) as Record<string, unknown>;

  const liveEntry =
    useContentfulLiveUpdates({ sys: entry?.sys, fields: campaignFields } as ICampaign) ?? entry;

  if (!entry?.sys?.id || !entry?.fields) {
    return (
      <div className="flex h-full items-center justify-center bg-neutral-950 p-8 text-center">
        <p className="text-sm text-neutral-400">Campaign could not be loaded</p>
      </div>
    );
  }

  // Scalar edits stream in from live preview; linked entries stay on the
  // server-resolved copy, which is the only fully-resolved one.
  const merged = {
    sys: entry.sys,
    fields: { ...entry.fields, ...(liveEntry?.fields ?? {}) },
  } as ICampaign;

  const promo = resolveCampaignPromo(merged);
  const products = resolveCampaignProducts(merged);
  const featured = products[0];
  const slug = merged.fields.slug as string | undefined;
  const validTo = merged.fields.validTo as string | undefined;

  // A featured product owns the hero zone and supplies the price; otherwise the
  // campaign's own promo imagery does.
  const heroImage = featured?.image || promo.imageUrl;
  const isProductLed = Boolean(featured?.image);

  const ends = (() => {
    if (!validTo) return null;
    const d = new Date(validTo);
    return Number.isNaN(d.getTime()) ? null : `Ends ${format(d, "d MMM")}`;
  })();

  // Shared formatter: currency comes from the product data, and all three
  // surfaces must show the same string.
  const price =
    featured && typeof featured.price === "number"
      ? formatProductPrice(featured.price, featured.currency)
      : null;

  // Signage copy is glanced at, not read: cut the supporting line at the first
  // sentence rather than letting line-clamp slice it mid-word, which reads as
  // broken rather than terse.
  const subtitle = (() => {
    const raw = (promo.subtitle || "").trim();
    if (!raw) return "";
    const firstSentence = raw.match(/^[^.!?]{20,}?[.!?]/);
    return firstSentence ? firstSentence[0].trim() : raw;
  })();

  // 3x5 rule: signage copy is glanced at, not read. Clamp hard.
  const headline = isProductLed ? featured!.title : promo.headline;
  // Suppress the kicker when it would just repeat the headline — happens when a
  // campaign has no promoTitle, so the resolver falls back to its name.
  const kicker = promo.name && promo.name !== headline ? promo.name : "";

  return (
    <div
      className={
        // Dark ground: light-on-dark is the most reliable signage contrast, and
        // it stops the panel reading as a phone screen.
        portrait
          ? "flex h-full w-full flex-col bg-neutral-950"
          : "flex h-full w-full flex-row bg-neutral-950"
      }
    >
      {/* ---------------- Hero zone: the product / campaign image ---------------- */}
      <div
        className={
          portrait
            ? "relative min-h-0 w-full flex-[3] overflow-hidden"
            : "relative h-full min-w-0 flex-[5] overflow-hidden"
        }
      >
        {heroImage ? (
          <>
            <img
              src={heroImage}
              alt={headline || kicker}
              className={
                // Product shots are packshots on white — contain keeps them whole
                // and must NOT pan: a drifting packshot looks like a glitch, and
                // over-scaling would clip the garment.
                // Campaign photography is editorial — cover fills the zone and
                // takes the slow Ken Burns pan that signage screens use.
                isProductLed
                  ? "h-full w-full bg-white object-contain"
                  : "signage-ken-burns h-full w-full object-cover"
              }
              style={
                isProductLed
                  ? undefined
                  : {
                      // Plain assets (a cta's `images[0]`) carry no focal point,
                      // and centre-cropping a tall editorial shot into a wide
                      // zone cuts the subject's head off. Bias upward, where the
                      // subject usually is; a focal point still wins when set.
                      objectPosition: promo.objectPosition || "center 25%",
                    }
              }
            />
            {/* Semi-transparent scrim: the recommended treatment when any text
                could sit over imagery, and it seats the panel visually. */}
            {!isProductLed && (
              <div className="absolute inset-0 bg-gradient-to-r from-neutral-950/70 via-neutral-950/10 to-transparent" />
            )}
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-neutral-900">
            <p className="px-6 text-center text-xs uppercase tracking-[0.2em] text-neutral-600">
              No campaign imagery
            </p>
          </div>
        )}

        {/* Offer flag — the one piece of chrome that belongs on the image. */}
        {isProductLed && (
          <div className="absolute left-0 top-0 bg-primary px-5 py-2.5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-foreground">
              Featured in store
            </p>
          </div>
        )}
      </div>

      {/* ---------------- Message zone ---------------- */}
      <div
        className={
          // ~5% safe margin — panels crop at the frame.
          portrait
            ? "flex min-h-0 w-full flex-[2] flex-col justify-center px-[5%] py-[4%]"
            : "flex h-full min-w-0 flex-[4] flex-col justify-center px-[6%] py-[5%]"
        }
      >
        {kicker && (
          <p
            className={
              portrait
                ? "text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500"
                : "text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500"
            }
          >
            {kicker}
          </p>
        )}

        {headline && (
          <h1
            className={
              // Oversized for 7-10ft legibility; bolder before bigger.
              // 4 lines rather than 3: product names run long, and clipping one
              // mid-phrase ("Outdoor Jacket — Dark") reads worse than wrapping.
              portrait
                ? "mt-3 line-clamp-4 text-3xl font-bold leading-[1.05] tracking-tight text-white"
                : "mt-4 line-clamp-4 text-[2.5rem] font-bold leading-[1.05] tracking-tight text-white"
            }
          >
            {headline}
          </h1>
        )}

        {price && (
          <p
            className={
              portrait
                ? "mt-4 text-3xl font-bold tabular-nums text-primary"
                : "mt-6 text-5xl font-bold tabular-nums text-primary"
            }
          >
            {price}
          </p>
        )}

        {/* Supporting line only when there's no price competing for attention —
            one primary message per screen. */}
        {!price && subtitle && (
          <p
            className={
              portrait
                ? "mt-3 line-clamp-2 text-sm leading-snug text-neutral-400"
                : "mt-5 line-clamp-3 text-lg leading-snug text-neutral-400"
            }
          >
            {subtitle}
          </p>
        )}

        {/* ---------------- Action zone ---------------- */}
        <div className="mt-auto pt-6">
          <div className="flex items-end justify-between gap-4 border-t border-neutral-800 pt-5">
            <div className="flex items-center gap-3">
              <QrPlaceholder
                size={portrait ? 54 : 64}
                className="border-neutral-700 bg-white"
                dotClassName="bg-neutral-950"
              />
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400">
                  Scan for details
                </p>
                <p className="mt-1 truncate font-mono text-[10px] text-neutral-600">
                  /{locale}/campaigns/{slug || "…"}
                </p>
              </div>
            </div>

            {ends && (
              <p className="shrink-0 text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400">
                {ends}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
