"use client";

import React, { FC } from "react";
// Importing interfaces and components
import { ILandingPage } from "../type";
// Import live updates hook from Contentful -> https://github.com/contentful/live-preview
import { useContentfulLiveUpdates } from "@contentful/live-preview/react";
import { sectionsComponentMap } from "../component-maps/sections";

// Define the props interface for the ContentfulLandingPage component
interface IProps {
  // The entry prop contains the data for a landing page fetched from Contentful
  entry: ILandingPage;
}

// Main ContentfulLandingPage component
const ContentfulLandingPage: FC<IProps> = ({ entry: publishedEntry }) => {
  // Use live updates hook for Contentful preview mode or fallback to the published entry
  const entry = useContentfulLiveUpdates(publishedEntry) || publishedEntry;

  const sections = entry?.fields?.sections as unknown as Array<any> | undefined;

  return (
    <div className="w-full overflow-hidden">
      {/* New: render Frames if present */}
      {Array.isArray(sections)
        ? sections.map((sectionEntry, index) => {
            const contentTypeId =
              sectionEntry?.sys?.contentType?.sys?.id ??
              sectionEntry?.sys?.contentType?.id ??
              sectionEntry?.sys?.contentTypeId ??
              null;
            const Component =
              contentTypeId && typeof contentTypeId === "string"
                ? (sectionsComponentMap as Record<string, FC<any>>)[contentTypeId]
                : undefined;

            if (!Component) {
              if (process.env.NODE_ENV === "development") {
                // eslint-disable-next-line no-console
                console.warn("Unknown section type", { contentTypeId, sectionEntry });
              }
              return null;
            }

            return <Component key={sectionEntry?.sys?.id ?? `section-${index}`} {...sectionEntry} />;
          })
        : null}
    </div>
  );
};

export default ContentfulLandingPage;
