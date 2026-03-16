"use client";

import React from "react";
import { useContentfulLiveUpdates } from "@contentful/live-preview/react";
import type { ILandingPage } from "@/features/contentful/type";
import { mobileSectionsComponentMap } from "./mobile-sections";

type Props = {
  entry: ILandingPage;
};

/**
 * Mobile-optimized landing page renderer.
 * Uses the mobile component map to render each section in a layout
 * designed for ~390px mobile viewport. Renders baseline content only
 * (no Ninetailed personalization — appropriate for preview context).
 *
 * Supports Contentful Live Preview via useContentfulLiveUpdates.
 */
export default function MobileLandingPage({ entry }: Props) {
  const liveEntry = useContentfulLiveUpdates(entry);
  const activeEntry = liveEntry || entry;

  if (!activeEntry?.fields?.sections) {
    return (
      <div className="flex items-center justify-center h-full p-6 text-center">
        <p className="text-sm text-muted-foreground">No sections to display</p>
      </div>
    );
  }

  const sections = Array.isArray(activeEntry.fields.sections)
    ? activeEntry.fields.sections
    : [];

  return (
    <div className="w-full">
      {sections.map((section: any, index: number) => {
        if (!section?.sys?.contentType?.sys?.id) {
          return null;
        }

        const contentTypeId = section.sys.contentType.sys.id;
        const Component = mobileSectionsComponentMap[contentTypeId];

        if (!Component) {
          if (process.env.NODE_ENV === "development") {
            console.warn(
              `[MobileLandingPage] No mobile component for "${contentTypeId}" (entry ${section.sys.id})`
            );
          }
          return (
            <div
              key={section.sys.id || index}
              className="mx-4 my-3 rounded-lg border border-dashed border-muted-foreground/30 p-3 text-center"
            >
              <p className="text-xs text-muted-foreground">
                <code className="font-mono">{contentTypeId}</code> — no mobile preview available
              </p>
            </div>
          );
        }

        return (
          <Component
            key={`mobile-${section.sys.id || index}`}
            {...section}
          />
        );
      })}
    </div>
  );
}
