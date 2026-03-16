"use client";

import React from "react";
import { useContentfulInspectorMode } from "@contentful/live-preview/react";
import type { ICta } from "@/features/contentful/type";
import { extractContentfulAssetUrl, cn } from "@/lib/utils";
import MobileButton from "./mobile-button";

const bgColorClasses: Record<string, string> = {
  Default: "bg-muted/50",
  Primary: "bg-primary/10",
  Secondary: "bg-secondary",
  None: "bg-transparent",
};

export default function MobileCta(entry: ICta) {
  const inspectorProps = useContentfulInspectorMode({ entryId: entry?.sys?.id ?? "" });

  if (!entry?.sys?.id || !entry?.fields) return null;
  const title = entry.fields.title as string;
  const body = entry.fields.body;
  const images = entry.fields.images;
  const buttons = entry.fields.actionButtons;
  const backgroundColor = (entry.fields.backgroundColor as string) ?? "Default";
  const bgClass = bgColorClasses[backgroundColor] || bgColorClasses.Default;

  const extractedImages = Array.isArray(images)
    ? images.map((img) => extractContentfulAssetUrl(img)).filter(Boolean)
    : [];

  return (
    <section className={cn("w-full", bgClass)}>
      {/* Images — single full-width or horizontal scroll for multiple */}
      {extractedImages.length === 1 && (
        <div className="w-full aspect-[16/10] bg-secondary">
          <img
            src={extractedImages[0]}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      )}
      {extractedImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto px-4 pt-4 pb-2 snap-x snap-mandatory scrollbar-hide">
          {extractedImages.map((url, i) => (
            <div
              key={i}
              className="flex-none w-[70%] aspect-[4/3] rounded-xl overflow-hidden bg-secondary snap-start"
            >
              <img src={url} alt="" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="px-4 py-5">
        {title && (
          <h2
            {...inspectorProps({ fieldId: "title" })}
            className="text-xl font-bold tracking-tight mb-2 text-foreground"
          >
            {title}
          </h2>
        )}

        {body && (
          <p
            {...inspectorProps({ fieldId: "body" })}
            className="text-sm text-muted-foreground mb-4 leading-relaxed"
          >
            {body}
          </p>
        )}

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
