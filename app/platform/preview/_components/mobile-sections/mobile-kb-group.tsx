"use client";

import React from "react";
import { useContentfulLiveUpdates } from "@contentful/live-preview/react";
import type { IKbGroup } from "@/features/contentful/type";

export default function MobileKbGroup(groupEntry: IKbGroup) {
  const entry = useContentfulLiveUpdates(groupEntry) || groupEntry;

  if (!entry?.sys?.id) return null;

  const name = typeof entry.fields?.name === "string" ? entry.fields.name : undefined;
  const description = typeof entry.fields?.description === "string" ? entry.fields.description : undefined;

  return (
    <section className="w-full py-4">
      <div className="px-4">
        {name && (
          <h2 className="text-lg font-bold text-foreground mb-1">{name}</h2>
        )}
        {description && (
          <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{description}</p>
        )}
        <div className="rounded-lg border border-dashed border-muted-foreground/30 p-3 text-center">
          <p className="text-xs text-muted-foreground">KB articles load at runtime</p>
        </div>
      </div>
    </section>
  );
}
