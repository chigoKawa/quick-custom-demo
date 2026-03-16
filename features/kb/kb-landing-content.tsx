"use client";

import React from "react";
import { useContentfulLiveUpdates } from "@contentful/live-preview/react";
import KbHeroSection from "./kb-hero-section";
import KbTopicsSection from "./kb-topics-section";
import KbFooterCta from "./kb-footer-cta";
import { sectionsComponentMap } from "@/features/contentful/component-maps/sections";

type TopicData = {
  slug: string;
  name: string;
  articleCount: number;
};

import type { MicrocopyDataMap } from "@/lib/microcopy";

type Props = {
  locale: string;
  landingEntry: any;
  topicCountsData: Array<[string, number]>;
  microcopy?: MicrocopyDataMap;
};

function titleizeSlug(slug: string): string {
  return (slug || "")
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function getLocalizedStringField(value: unknown, locale: string): string | undefined {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return undefined;
  const rec = value as Record<string, unknown>;
  const direct = rec[locale];
  if (typeof direct === "string") return direct;
  for (const k of Object.keys(rec)) {
    const v = rec[k];
    if (typeof v === "string") return v;
  }
  return undefined;
}

export default function KbLandingContent({ locale, landingEntry, topicCountsData, microcopy = {} }: Props) {
  // Use live updates for the landing page entry
  const landing = useContentfulLiveUpdates(landingEntry) || landingEntry;

  // Build topic counts map
  const topicCounts = new Map<string, number>(topicCountsData);

  // Extract sections from landing page
  const sections = (landing as any)?.fields?.sections;
  const editorOrderedSlugs: string[] = [];
  const nonKbGroupSections: any[] = [];

  if (Array.isArray(sections)) {
    for (const section of sections) {
      const contentTypeId = section?.sys?.contentType?.sys?.id;
      if (contentTypeId === "kbGroup") {
        const slug = getLocalizedStringField(section?.fields?.slug, locale);
        // Only include if this slug exists in taxonomy (has articles)
        if (slug && topicCounts.has(slug)) {
          editorOrderedSlugs.push(slug);
        }
      } else if (section?.sys?.id) {
        // Collect non-kbGroup sections to render
        nonKbGroupSections.push(section);
      }
    }
  }

  // Build final topics list: editor-ordered first, then remaining by article count
  const usedSlugs = new Set(editorOrderedSlugs);
  const remainingTopics = Array.from(topicCounts.entries())
    .filter(([slug]) => !usedSlugs.has(slug))
    .sort((a, b) => b[1] - a[1]);

  const topics: TopicData[] = [
    ...editorOrderedSlugs.map((slug) => ({
      slug,
      name: titleizeSlug(slug),
      articleCount: topicCounts.get(slug) || 0,
    })),
    ...remainingTopics.map(([slug, count]) => ({
      slug,
      name: titleizeSlug(slug),
      articleCount: count,
    })),
  ].filter((t) => t.articleCount > 0);

  return (
    <div className="flex flex-col">
      <KbHeroSection locale={locale} microcopy={microcopy} />
      <KbTopicsSection locale={locale} topics={topics} microcopy={microcopy} />
      
      {/* Render non-kbGroup sections from Contentful */}
      {nonKbGroupSections.length > 0 && (
        <div className="flex flex-col">
          {nonKbGroupSections.map((section, idx) => {
            const contentTypeId = section?.sys?.contentType?.sys?.id;
            const Component = contentTypeId ? sectionsComponentMap[contentTypeId] : null;
            if (!Component) return null;
            return (
              <React.Fragment key={section?.sys?.id || idx}>
                <Component {...section} />
              </React.Fragment>
            );
          })}
        </div>
      )}
      
      <KbFooterCta locale={locale} />
    </div>
  );
}
