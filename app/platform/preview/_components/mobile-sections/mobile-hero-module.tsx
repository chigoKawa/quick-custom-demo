"use client";

import React from "react";
import { useContentfulInspectorMode } from "@contentful/live-preview/react";
import type { IHeroModule } from "@/features/contentful/type";
import { extractImageWithFocalPoint } from "@/lib/focal-point";
import type { IBaseButton } from "@/features/contentful/type";
import MobileButton from "./mobile-button";

function mapButtons(buttons: unknown): IBaseButton[] {
  if (!Array.isArray(buttons)) return [];
  return (buttons as IBaseButton[]).filter((b) => b?.sys?.id && b?.fields?.label);
}

export default function MobileHeroModule(entry: IHeroModule) {
  const inspectorProps = useContentfulInspectorMode({ entryId: entry?.sys?.id ?? "" });

  if (!entry?.sys?.id || !entry?.fields) return null;
  const title = entry.fields.headline ?? "";
  const description = entry.fields.subCopy;

  const imageEntry = entry.fields.image;
  const { url: imageUrl, alt: imageAlt, objectPosition } = extractImageWithFocalPoint(imageEntry);

  const buttons = mapButtons(entry.fields.buttons);

  if (!title) return null;

  return (
    <section className="w-full">
      {/* Full-width image */}
      {imageUrl && (
        <div className="w-full aspect-[16/10] bg-secondary">
          <img
            src={imageUrl}
            alt={imageAlt || title}
            className="w-full h-full object-cover"
            style={{ objectPosition: objectPosition || "center center" }}
          />
        </div>
      )}

      {/* Content */}
      <div className="px-4 py-5">
        <h2
          {...inspectorProps({ fieldId: "headline" })}
          className="text-2xl font-bold tracking-tight mb-2 text-foreground"
        >
          {title}
        </h2>

        {description && (
          <p
            {...inspectorProps({ fieldId: "subCopy" })}
            className="text-sm text-muted-foreground mb-4 leading-relaxed"
          >
            {description}
          </p>
        )}

        {buttons.length > 0 && (
          <div className="flex flex-col gap-2.5">
            {buttons.slice(0, 2).map((button, i) => (
              <MobileButton key={button.sys.id || i} button={button} fullWidth />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
