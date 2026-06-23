import { draftMode, headers } from "next/headers";

/**
 * Server-side preview detection that checks all three possible signals:
 *
 * 1. `?preview` in searchParams (Contentful live preview URL pattern)
 * 2. Next.js draftMode cookie (set via /api/preview/enable)
 * 3. `x-contentful-preview` request header (set by middleware from ?preview)
 *
 * Returns `{ isPreview, timelineToken, environmentId }` for direct use in data fetchers.
 * When `?env=<id>` is present the Contentful client will target that environment
 * instead of the configured default.
 */
export async function resolvePreviewMode(
  searchParams?: Record<string, string | string[] | undefined> | null
): Promise<{ isPreview: boolean; timelineToken: string | null; environmentId: string | null }> {
  const hasSearchParamPreview =
    !!searchParams &&
    typeof searchParams === "object" &&
    "preview" in searchParams;

  const { isEnabled: isDraftMode } = await draftMode();

  const headersList = await headers();
  const hasHeaderPreview =
    headersList.get("x-contentful-preview") === "1";

  const isPreview = hasSearchParamPreview || isDraftMode || hasHeaderPreview;

  let timelineToken: string | null = null;
  let environmentId: string | null = null;

  if (isPreview) {
    if (searchParams && typeof searchParams === "object") {
      const raw = searchParams.timeline;
      if (typeof raw === "string" && raw.length > 0) timelineToken = raw;
      else if (Array.isArray(raw) && typeof raw[0] === "string" && raw[0].length > 0) timelineToken = raw[0];

      const envRaw = searchParams.env;
      if (typeof envRaw === "string" && envRaw.length > 0) environmentId = envRaw;
      else if (Array.isArray(envRaw) && typeof envRaw[0] === "string" && envRaw[0].length > 0) environmentId = envRaw[0];
    }
    if (!timelineToken) {
      const headerTimeline = headersList.get("x-contentful-timeline");
      if (headerTimeline) timelineToken = headerTimeline;
    }
    if (!environmentId) {
      const headerEnv = headersList.get("x-contentful-env");
      if (headerEnv) environmentId = headerEnv;
    }
  }

  return { isPreview, timelineToken, environmentId };
}
