"use client";

import React from "react";
import { useContentfulInspectorMode } from "@contentful/live-preview/react";
import type { IHeroBanner } from "@/features/contentful/type";
import { extractContentfulAssetUrl } from "@/lib/utils";
import MobileButton from "./mobile-button";

export default function MobileHeroBanner(entry: IHeroBanner) {
  const inspectorProps = useContentfulInspectorMode({ entryId: entry?.sys?.id ?? "" });

  if (!entry?.sys?.id || !entry?.fields) return null;
  const headline = entry.fields.headline as string;
  const body = entry.fields.body;
  const heroImage = entry.fields.heroImage ?? null;
  const imageUrl = extractContentfulAssetUrl(heroImage);
  const buttons = entry.fields.actionButtons;

  return (
    <section className="w-full">
      {/* Full-width image at top */}
      {imageUrl && (
        <div className="w-full aspect-[16/10] bg-secondary">
          <img
            src={imageUrl}
            alt={headline || ""}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Content below image */}
      <div className="px-4 py-5">
        {headline && (
          <h1
            {...inspectorProps({ fieldId: "headline" })}
            className="text-2xl font-bold tracking-tight mb-2 text-foreground"
          >
            {headline}
          </h1>
        )}

        {body && (
          <p
            {...inspectorProps({ fieldId: "body" })}
            className="text-sm text-muted-foreground mb-4 leading-relaxed"
          >
            {body}
          </p>
        )}

        {/* Buttons — stacked on mobile */}
        {Array.isArray(buttons) && buttons.length > 0 && (
          <div className="flex flex-col gap-2.5">
            {buttons
              .filter((b) => b?.sys?.id)
              .map((button, i) => (
                <MobileButton key={button.sys.id || i} button={button} fullWidth />
              ))}
          </div>
        )}
      </div>
    </section>
  );
}
