import React from "react";

import type { IHeroModule } from "../../type";
import { extractUrlFromTarget } from "@/lib/utils";
import type { IBaseButton } from "../../type";
import HeroModule, { type HeroModuleSlide } from "./hero-module";
import { extractImageWithFocalPoint } from "@/lib/focal-point";

function mapButtons(
  buttons: unknown,
  linkLocale: { locale?: string; defaultLocale?: string }
): Array<{ label: string; href: string }> {
  if (!Array.isArray(buttons)) return [];
  const { locale, defaultLocale = "en-US" } = linkLocale;
  return (buttons as IBaseButton[])
    .map((b) => {
      const label = b?.fields?.label;
      const href = extractUrlFromTarget(b?.fields?.target, { locale, defaultLocale });
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

  // Guard against undefined entry or missing sys
  if (!entry?.sys?.id || !entry?.fields) {
    return null;
  }

  const title = entry.fields.headline ?? "";
  const description = entry?.fields?.subCopy;

  const imagePlacement = entry?.fields?.imagePlacement;

  // Extract image with focal point support
  const imageEntry = entry.fields.image;
  const {
    url: imageUrl,
    alt: imageAlt,
    objectPosition,
    entryId: imageEntryId
  } = extractImageWithFocalPoint(imageEntry);

  const buttons = mapButtons(entry?.fields?.buttons, linkLocale);

  const slide: HeroModuleSlide = {
    title,
    description,
    imageUrl: imageUrl || undefined,
    imageAlt: imageAlt || title,
    imageObjectPosition: objectPosition,
    imageEntryId,
    imagePlacement: imagePlacement === "Left" ? "Left" : "Right",
    buttons: buttons.length > 0 ? buttons.slice(0, 2) : undefined,
  };

  if (!slide.title) return null;

  return (
    <div className="max-w-7xl mx-auto">
      <HeroModule
        slides={[slide]}
        entryId={entry?.sys?.id}
        metricEventName={(entry?.fields as unknown as { metricEventName?: string })?.metricEventName as any}
      />
    </div>
  );
}
