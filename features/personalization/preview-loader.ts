// Dev-only preview data loader for Ninetailed Preview Plugin
// Implements https://www.contentful.com/developers/docs/personalization/preview-plugin/
// using the Contentful JS SDK already present in the project and the utils-contentful mappers.

import { getEntriesInEnvironment } from "@/lib/contentful";
import {
  ExperienceMapper,
  AudienceMapper,
  type ExperienceEntryLike,
  type AudienceEntryLike,
} from "@ninetailed/experience.js-utils-contentful";
// Keep PreviewData payloads as unknown to avoid coupling to plugin's internal types

export type PreviewData = {
  experiences: unknown[];
  audiences: unknown[];
};

export async function loadPreviewData(): Promise<PreviewData> {
  const primaryEnv = process.env.NEXT_PUBLIC_CTF_ENVIRONMENT || "master";
  const fallbackEnv = "master";

  const loadFromEnv = async (environment: string): Promise<PreviewData> => {
    const expEntries = await getEntriesInEnvironment({
      options: {
        content_type: "nt_experience",
        include: 2,
        limit: 1000,
      },
      isPreviewEnabled: true,
      environment,
    });

    const experiences = (expEntries as unknown as ExperienceEntryLike[])
      .filter(ExperienceMapper.isExperienceEntry)
      .map(ExperienceMapper.mapExperience);

    const audEntries = await getEntriesInEnvironment({
      options: {
        content_type: "nt_audience",
        include: 1,
        limit: 1000,
      },
      isPreviewEnabled: true,
      environment,
    });

    const audiences = (audEntries as unknown as AudienceEntryLike[])
      .filter(AudienceMapper.isAudienceEntry)
      .map(AudienceMapper.mapAudience);

    return { experiences, audiences };
  };

  const primary = await loadFromEnv(primaryEnv);
  const hasAnyPrimary = primary.experiences.length > 0 || primary.audiences.length > 0;
  if (hasAnyPrimary) return primary;

  if (primaryEnv !== fallbackEnv) {
    const fallback = await loadFromEnv(fallbackEnv);
    const hasAnyFallback = fallback.experiences.length > 0 || fallback.audiences.length > 0;
    if (hasAnyFallback) {
      console.warn("[Ninetailed] Preview data not found in environment, using fallback.", {
        primaryEnv,
        fallbackEnv,
      });
      return fallback;
    }
  }

  console.warn("[Ninetailed] Preview data empty.", { env: primaryEnv });
  return primary;
}
