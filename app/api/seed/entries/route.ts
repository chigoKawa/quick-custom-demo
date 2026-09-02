import { NextRequest, NextResponse } from "next/server";
import { getEntries } from "@/lib/contentful";
import { unscoped } from "@/lib/site-scope";
import type { EntrySkeletonType, Entry } from "contentful";

export const dynamic = "force-dynamic";

const ALLOWED_CONTENT_TYPES = [
  "landingPage",
  "heroBanner",
  "heroModule",
  "cta",
  "shelfModule",
  "multiItemModule",
  "productCatalog",
  "formEmbed",
  "alertBanner",
  "productStory",
];

function extractLabel(entry: Entry<EntrySkeletonType>): string {
  const f = entry.fields as Record<string, unknown>;
  return (
    (f.internalName as string) ||
    (f.internalTitle as string) ||
    (f.title as string) ||
    (f.headline as string) ||
    (f.slug as string) ||
    entry.sys.id
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const contentType = searchParams.get("contentType");
  const metricEventName = searchParams.get("metricEventName");

  if (!contentType || !ALLOWED_CONTENT_TYPES.includes(contentType)) {
    return NextResponse.json(
      { entries: [], error: "Invalid or missing contentType" },
      { status: 400 }
    );
  }

  try {
    const query: Record<string, unknown> = {
      content_type: contentType,
      limit: 100,
      order: "-sys.updatedAt",
    };

    if (metricEventName) {
      query["fields.metricEventName"] = metricEventName;
    }

    // Dev seeding tool: the allowlist above is mostly section-level types that
    // have no `site` reference, and the point of the tool is to see everything
    // in the space. Reads across all sites on purpose.
    const entries = await getEntries<EntrySkeletonType>(unscoped(query), false);

    const items = entries.map((e) => {
      const f = e.fields as Record<string, unknown>;
      return {
        id: e.sys.id,
        label: extractLabel(e),
        contentType: e.sys.contentType?.sys?.id || contentType,
        metricEventName: (f.metricEventName as string) || null,
      };
    });

    return NextResponse.json({ entries: items });
  } catch (error) {
    console.error("[seed/entries] Error:", error);
    return NextResponse.json(
      { entries: [], error: "Failed to fetch entries" },
      { status: 500 }
    );
  }
}
