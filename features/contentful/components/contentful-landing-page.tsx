"use client";

import React, { FC } from "react";
// Importing interfaces and components
import { ILandingPage } from "../type";
// Import live updates hook from Contentful -> https://github.com/contentful/live-preview
import { useContentfulLiveUpdates } from "@contentful/live-preview/react";
import { sectionsComponentMap } from "../component-maps/sections";
import RelatedStoriesSection, { type RelatedStoryPost } from "./landing-page/related-stories-section";
import { RevealSection } from "@/features/animations/in-view";

// Define the props interface for the ContentfulLandingPage component
interface IProps {
  // The entry prop contains the data for a landing page fetched from Contentful
  entry: ILandingPage;
  relatedPosts?: RelatedStoryPost[];
}

import { shallowEntryFields } from "@/lib/contentful-live-preview-shallow";

// Strips deeply-nested linked entries from a section's fields so that
// useContentfulLiveUpdates' lodash isEqual doesn't recurse into include:6 depth.
// Scalar fields and asset refs are kept; Entry links are replaced with bare sys stubs.
// nt_experiences / nt_variants are omitted (circular back-references).
function shallowSection(s: any): any {
  if (!s?.sys?.id || !s?.fields) return s;
  return { sys: s.sys, fields: shallowEntryFields(s.fields) };
}

// Index every entry in the server-fetched tree by sys.id.
// Only recurses into arrays and entry `fields` — never into arbitrary object values —
// to avoid call stack overflow from deeply nested or prototype-chained objects.
function buildResolvedMap(node: any, map: Map<string, any>) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) buildResolvedMap(item, map);
    return;
  }
  if (node.sys?.id && node.fields) {
    if (map.has(node.sys.id)) return; // already visited
    map.set(node.sys.id, node);
    // Only descend into the fields object, not the whole entry
    for (const v of Object.values(node.fields as object)) {
      buildResolvedMap(v, map);
    }
  }
}

// Resolve a value from live preview: if it's a bare sys stub, look it up in
// resolvedById; if it's an array, resolve each item; otherwise return as-is.
function resolveValue(v: any, resolvedById: Map<string, any>): any {
  if (Array.isArray(v)) {
    return v.map((item) => resolveValue(item, resolvedById));
  }
  if (v && typeof v === "object" && v.sys?.id && !v.fields) {
    return resolvedById.get(v.sys.id) ?? v;
  }
  return v;
}

// Main ContentfulLandingPage component
const ContentfulLandingPage: FC<IProps> = ({ entry: publishedEntry, relatedPosts }) => {
  const publishedSections = publishedEntry?.fields?.sections as unknown as Array<any> | undefined;

  // Build a deep map of every resolved entry in the server-fetched tree so we can
  // fill in bare sys stubs that come back from useContentfulLiveUpdates.
  const resolvedById = new Map<string, any>();
  buildResolvedMap(publishedEntry, resolvedById);

  // Build shallow version of the entry for useContentfulLiveUpdates: each section is
  // reduced to { sys, shallowFields } so isEqual never recurses past 1 level of fields.
  const shallowSections = Array.isArray(publishedSections)
    ? publishedSections.map(shallowSection)
    : [];
  // Strip nt_experiences / nt_variants — they contain circular back-references
  // that cause JSON.stringify to blow up when live preview tries to postMessage.
  const { nt_experiences: _ntExp, nt_variants: _ntVar, sections: _sec, ...scalarFields } = publishedEntry.fields as any;
  const shallowEntry = {
    sys: publishedEntry.sys,
    fields: { ...scalarFields, sections: shallowSections },
  } as unknown as ILandingPage;

  const liveEntry = useContentfulLiveUpdates(shallowEntry);

  // Merge live section data: use live-updated fields for scalar/structural changes,
  // and resolve any bare sys stubs against the deep resolvedById map.
  const liveSections = (liveEntry?.fields?.sections as unknown as Array<any> | undefined) ?? shallowSections;
  const sections = liveSections.map((liveSection: any) => {
    if (!liveSection?.sys?.id) return liveSection;
    const original = resolvedById.get(liveSection.sys.id);
    if (!original) return liveSection;
    // Merge: apply every live field, resolving stubs against the server-fetched tree.
    const mergedFields: Record<string, any> = { ...original.fields };
    for (const [k, v] of Object.entries(liveSection.fields ?? {})) {
      mergedFields[k] = resolveValue(v, resolvedById);
    }
    return { ...original, fields: mergedFields };
  });

  return (
    <div className="w-full">
      {Array.isArray(sections)
        ? sections.map((rawSection, index) => {
            if (!rawSection?.sys?.id) return null;

            // If live preview returned an unresolved link (no contentType/fields),
            // fall back to the fully-resolved version from the original server fetch.
            const sectionEntry =
              rawSection?.sys?.contentType || rawSection?.fields
                ? rawSection
                : (resolvedById.get(rawSection.sys.id) ?? rawSection);

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

            return (
              <RevealSection key={`${sectionEntry.sys.id}-${index}`} index={index}>
                <Component {...sectionEntry} />
              </RevealSection>
            );
          })
        : null}
      {relatedPosts && relatedPosts.length > 0 && (
        <RevealSection index={1}>
          <RelatedStoriesSection posts={relatedPosts} />
        </RevealSection>
      )}
    </div>
  );
};

export default ContentfulLandingPage;
