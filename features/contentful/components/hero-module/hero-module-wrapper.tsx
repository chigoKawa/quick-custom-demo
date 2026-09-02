"use client";

import React, { useMemo } from "react";
import { useContentfulLiveUpdates } from "@contentful/live-preview/react";

import type { IHeroModule, IBaseButton, IGeneralTopic } from "../../type";
import { extractUrlFromTarget } from "@/lib/utils";
import HeroModule, { type HeroModuleSlide } from "./hero-module";
import { extractImageWithFocalPoint } from "@/lib/focal-point";
import {
  resolveFieldsForMarket,
  MARKET_OVERRIDE_FIELD_ID,
} from "@/lib/market-overrides";
import { useActiveMarket } from "@/lib/market-overrides/react";

// Flatten a Contentful RichText document to plain text (paragraphs joined by
// newlines). The hero's `subCopy` is a plain Text field — when we pull body
// from a generalTopic (RichText) we need a scalar string.
function richTextToPlain(rt: unknown): string | undefined {
  if (!rt || typeof rt !== "object") return undefined;
  const content = (rt as { content?: Array<{ content?: Array<{ value?: string }> }> }).content;
  if (!Array.isArray(content)) return undefined;
  const text = content
    .map((block) =>
      (block.content ?? [])
        .map((n) => n.value ?? "")
        .join("")
    )
    .filter(Boolean)
    .join("\n\n")
    .trim();
  return text || undefined;
}

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
  const { locale, defaultLocale: defaultLocaleProp, ...rawEntry } = props;
  const defaultLocale = defaultLocaleProp ?? "en-US";
  const linkLocale = { locale, defaultLocale };
  const marketCode = useActiveMarket();

  const { nt_experiences: _ntExp, nt_variants: _ntVar, ...safeFields } = (rawEntry?.fields ?? {}) as Record<string, unknown>;
  const safeEntry = rawEntry?.sys ? { sys: rawEntry.sys, fields: safeFields } as unknown as typeof rawEntry : rawEntry;
  const entry = useContentfulLiveUpdates(safeEntry) || rawEntry;

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

  // Subscribe live to the optional generalTopic — its title/body override the
  // hero's own headline/subCopy. Shallow {sys, fields} only per the include:6
  // call-stack rule.
  const topicEntry = resolvedFields.topic as IGeneralTopic | undefined;
  const topicRecord = topicEntry as unknown as Record<string, unknown> | undefined;
  const liveTopic = useContentfulLiveUpdates(
    topicRecord && topicRecord.sys
      ? { sys: topicRecord.sys, fields: topicRecord.fields }
      : null
  ) ?? topicEntry;
  const topicFields = (liveTopic as IGeneralTopic | undefined)?.fields;
  const topicTitle = topicFields?.title;
  const topicBody = topicFields?.body;
  const topicBodyText = richTextToPlain(topicBody);

  // Topic fields take precedence when present; otherwise fall back to the
  // hero's own headline/subCopy. Empty strings count as "absent".
  const topicSysId = (liveTopic as { sys?: { id?: string } } | undefined)?.sys?.id;
  const titleFromTopic = Boolean(topicTitle && topicTitle.trim());
  const descriptionFromTopic = Boolean(topicBodyText);
  const title = titleFromTopic ? topicTitle!.trim() : resolvedFields.headline || "";
  const description = descriptionFromTopic ? topicBodyText : resolvedFields.subCopy;
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
    titleEntryId: titleFromTopic && topicSysId ? topicSysId : entry.sys.id,
    titleFieldId: titleFromTopic ? "title" : "headline",
    descriptionEntryId: descriptionFromTopic && topicSysId ? topicSysId : entry.sys.id,
    descriptionFieldId: descriptionFromTopic ? "body" : "subCopy",
  };

  // Render the hero if there's anything to show — title, description, or image.
  // Headline/subCopy were previously required; the optional topic override
  // lets editors keep them empty.
  if (!slide.title && !slide.description && !slide.imageUrl) return null;

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
