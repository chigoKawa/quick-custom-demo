"use client";

import React from "react";
import { useContentfulInspectorMode } from "@contentful/live-preview/react";
import type { IFormEmbed } from "@/features/contentful/type";

export default function MobileFormEmbed(entry: IFormEmbed) {
  const inspectorProps = useContentfulInspectorMode({ entryId: entry?.sys?.id ?? "" });

  if (!entry?.sys?.id || !entry?.fields) return null;
  const title = entry.fields.title as string;
  const introCopy = entry.fields.introCopy;

  return (
    <section className="w-full py-4">
      <div className="px-4">
        {title && (
          <h2
            {...inspectorProps({ fieldId: "title" })}
            className="text-lg font-bold text-foreground mb-1"
          >
            {title}
          </h2>
        )}
        {introCopy && (
          <p
            {...inspectorProps({ fieldId: "introCopy" })}
            className="text-sm text-muted-foreground mb-4 leading-relaxed"
          >
            {introCopy}
          </p>
        )}
        {/* Form placeholder — actual form rendering requires JS form SDK */}
        <div className="rounded-lg border border-dashed border-muted-foreground/30 p-4 text-center">
          <p className="text-xs text-muted-foreground">Form preview not available in mobile view</p>
        </div>
      </div>
    </section>
  );
}
