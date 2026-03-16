"use client";

import React from "react";
import { useContentfulInspectorMode } from "@contentful/live-preview/react";
import type { IProductCatalog } from "@/features/contentful/type";
import MobileButton from "./mobile-button";

export default function MobileProductCatalog(entry: IProductCatalog) {
  const inspectorProps = useContentfulInspectorMode({ entryId: entry?.sys?.id ?? "" });

  if (!entry?.sys?.id || !entry?.fields) return null;
  const title = entry.fields.title as string;
  const body = entry.fields.body;
  const cta = entry.fields.cta;

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
        {body && (
          <p
            {...inspectorProps({ fieldId: "body" })}
            className="text-sm text-muted-foreground mb-4 leading-relaxed"
          >
            {body}
          </p>
        )}
        {cta && (
          <MobileButton button={cta} fullWidth />
        )}
      </div>
    </section>
  );
}
