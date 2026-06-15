"use client";

import React, { useMemo } from "react";
import { useContentfulLiveUpdates } from "@contentful/live-preview/react";

import type { IHeroModule, IBaseButton } from "../../type";
import { extractUrlFromTarget } from "@/lib/utils";
import HeroModule, { type HeroModuleSlide } from "./hero-module";
import { extractImageWithFocalPoint } from "@/lib/focal-point";
import {
  resolveFieldsForMarket,
  MARKET_OVERRIDE_FIELD_ID,
} from "@/lib/market-overrides";
import { useActiveMarket } from "@/lib/market-overrides/react";

function mapButtons(
  buttons: unknown,
  linkLocale: { locale?: string; defaultLocale?: string },
  marketCode: string | null
): Array<{ label: string; href: string }> {
  if (!Array.isArray(buttons)) return [];
  const { locale, defaultLocale = "en-US" } = linkLocale;
  return (buttons as IBaseButton[])
    .map((b) => {
      if (!b?.fields) return null;
      // Resolve the button's own market overrides (e.g. translated label).
      // Each button is an entry of `baseButton`, so its overrides live in its
      // own `marketOverride` field.
      const fields = marketCode
        ? resolveFieldsForMarket(
            b.fields,
            (b.fields as Record<string, unknown>)[MARKET_OVERRIDE_FIELD_ID],
            marketCode
          )
        : b.fields;
      const label = fields.label;
      const href = extractUrlFromTarget(fields.target, { locale, defaultLocale });
      if (!label || !href) return null;
      return { label, href };
    })
    .filter((v): v is { label: string; href: string } => Boolean(v));
}

export default function HeroModuleWrapper(
  props: IHeroModule & { locale?: string; defaultLocale?: string }
) {
  const { locale, defaultLocale: defaultLocaleProp, ...entry } = props;
  const defaultLocale = defaultLocaleProp ?? "en-US";
  const linkLocale = { locale, defaultLocale };
  const marketCode = useActiveMarket();

  // Resolve the hero's own fields against the active market BEFORE mapping
  // to presentational props. Buttons are resolved separately inside
  // mapButtons since they each have their own overrides field.
  const resolvedFields = useMemo(() => {
    if (!entry?.fields) return undefined;
    if (!marketCode) return entry.fields;
    return resolveFieldsForMarket(
      entry.fields,
      (entry.fields as Record<string, unknown>)[MARKET_OVERRIDE_FIELD_ID],
      marketCode
    );
  }, [entry?.fields, marketCode]);

  if (!entry?.sys?.id || !resolvedFields) {
    return null;
  }

  const title = resolvedFields.headline ?? "";
  const description = resolvedFields.subCopy;
  const textAnchor = resolvedFields.textAnchor;
  const textContrast = resolvedFields.textContrast;
  const bannerSize = resolvedFields.size;

  const imageEntry = resolvedFields.image;
  // Subscribe to live updates on the nested imageWithFocalPoint entry so focal
  // point changes appear without a reload. Pass only sys+fields to avoid the
  // deep-equality stack overflow that useContentfulLiveUpdates triggers on
  // deeply-nested include:6 data.
  const liveImageEntry = useContentfulLiveUpdates(
    imageEntry && typeof imageEntry === "object" && (imageEntry as Record<string, unknown>).sys
      ? { sys: (imageEntry as Record<string, unknown>).sys, fields: (imageEntry as Record<string, unknown>).fields }
      : null
  ) ?? imageEntry;
  const {
    url: imageUrl,
    alt: imageAlt,
    objectPosition,
    focalPoint: imageFocalPoint,
    entryId: imageEntryId,
  } = extractImageWithFocalPoint(liveImageEntry);

  const buttons = mapButtons(resolvedFields.buttons, linkLocale, marketCode);

  const slide: HeroModuleSlide = {
    title,
    description,
    imageUrl: imageUrl || undefined,
    imageAlt: imageAlt || title,
    imageObjectPosition: objectPosition,
    imageEntryId,
    imageFocalPoint,
    textAnchor: textAnchor ?? undefined,
    textContrast: textContrast ?? undefined,
    bannerSize: bannerSize ?? undefined,
    buttons: buttons.length > 0 ? buttons.slice(0, 2) : undefined,
  };

  if (!slide.title) return null;

  return (
    <HeroModule
      slides={[slide]}
      entryId={entry?.sys?.id}
      metricEventName={
        (resolvedFields as unknown as { metricEventName?: string })?.metricEventName as never
      }
    />
  );
}
