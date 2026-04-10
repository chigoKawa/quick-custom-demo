import { NextRequest, NextResponse } from "next/server";
import { createClient } from "contentful-management";
import type { PageTreeEntry } from "@/app/ctf-apps/page-tree/types";

const SPACE_ID = process.env.NEXT_PUBLIC_CTF_SPACE_ID!;
const ENVIRONMENT_ID = process.env.NEXT_PUBLIC_CTF_ENVIRONMENT || "master";

interface FieldMapping {
  parent: string;
  slug: string;
  fullPath: string;
}

const DEFAULT_MAPPING: FieldMapping = {
  parent: "parent",
  slug: "slug",
  fullPath: "fullPath",
};

function getCmaClient() {
  const token = process.env.CONTENTFUL_MANAGEMENT_TOKEN;
  if (!token) {
    throw new Error("CONTENTFUL_MANAGEMENT_TOKEN is not set");
  }
  return createClient({ accessToken: token }, { type: "plain" });
}

function deriveStatus(sys: {
  publishedAt?: string | null;
  version: number;
  publishedVersion?: number | null;
}): "published" | "draft" | "changed" {
  if (!sys.publishedAt) return "draft";
  if (sys.version > (sys.publishedVersion ?? 0) + 1) return "changed";
  return "published";
}

async function fetchEntriesForType(
  client: ReturnType<typeof getCmaClient>,
  contentTypeId: string,
  locale: string,
  mapping: FieldMapping
): Promise<PageTreeEntry[]> {
  let skip = 0;
  const limit = 200;
  let total = Infinity;
  const items: PageTreeEntry[] = [];

  while (items.length < total) {
    const response = await client.entry.getMany({
      spaceId: SPACE_ID,
      environmentId: ENVIRONMENT_ID,
      query: {
        content_type: contentTypeId,
        skip,
        limit,
        order: "sys.updatedAt",
      },
    });

    total = response.total;

    for (const item of response.items) {
      const fields = item.fields as Record<string, Record<string, unknown>>;
      const sys = item.sys as {
        id: string;
        publishedAt?: string | null;
        version: number;
        publishedVersion?: number | null;
        updatedAt: string;
        contentType: { sys: { id: string } };
      };

      const title =
        (fields.title?.[locale] as string) ||
        (fields.internalName?.[locale] as string) ||
        (fields.title?.["en-US"] as string) ||
        sys.id;

      const slug =
        (fields[mapping.slug]?.[locale] as string) ||
        (fields[mapping.slug]?.["en-US"] as string) ||
        "";

      const fullPath =
        (fields[mapping.fullPath]?.[locale] as string | undefined) ??
        (fields[mapping.fullPath]?.["en-US"] as string | undefined) ??
        null;

      const parentFieldValues = fields[mapping.parent] as Record<string, { sys?: { id?: string } }> | undefined;
      const parentLink =
        parentFieldValues?.[locale] ??
        parentFieldValues?.["en-US"] ??
        (parentFieldValues ? Object.values(parentFieldValues)[0] : undefined);
      const parentId = parentLink?.sys?.id ?? null;

      items.push({
        id: sys.id,
        title,
        slug,
        fullPath,
        parentId,
        contentTypeId: sys.contentType.sys.id,
        status: deriveStatus({
          publishedAt: sys.publishedAt,
          version: sys.version,
          publishedVersion: sys.publishedVersion,
        }),
        updatedAt: sys.updatedAt,
        publishedAt: sys.publishedAt ?? null,
      });
    }

    skip += response.items.length;
    if (response.items.length === 0) break;
  }

  return items;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const locale = searchParams.get("locale") || "en-US";

  // Support both legacy single contentTypeId and new comma-separated contentTypeIds
  const idsParam =
    searchParams.get("contentTypeIds") ||
    searchParams.get("contentTypeId") ||
    "landingPage";
  const contentTypeIds = idsParam.split(",").map((s) => s.trim()).filter(Boolean);

  // Per-type field mappings: JSON-encoded { [contentTypeId]: { parent, slug, fullPath } }
  let fieldMappings: Record<string, FieldMapping> = {};
  const mappingsParam = searchParams.get("fieldMappings");
  if (mappingsParam) {
    try {
      fieldMappings = JSON.parse(mappingsParam);
    } catch {
      // ignore parse errors, use defaults
    }
  }

  try {
    const client = getCmaClient();

    const results = await Promise.all(
      contentTypeIds.map((ctId) =>
        fetchEntriesForType(
          client,
          ctId,
          locale,
          fieldMappings[ctId] ?? DEFAULT_MAPPING
        )
      )
    );

    const allItems = results.flat();

    return NextResponse.json({ success: true, data: allItems });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
