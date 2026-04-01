import { NextRequest, NextResponse } from "next/server";
import { createClient } from "contentful-management";
import type { PageTreeEntry } from "@/app/ctf-apps/page-tree/types";

const SPACE_ID = process.env.NEXT_PUBLIC_CTF_SPACE_ID!;
const ENVIRONMENT_ID = process.env.NEXT_PUBLIC_CTF_ENVIRONMENT || "master";

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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const contentTypeId = searchParams.get("contentTypeId") || "landingPage";
  const locale = searchParams.get("locale") || "en-US";

  try {
    const client = getCmaClient();

    let skip = 0;
    const limit = 200;
    let total = Infinity;
    const allItems: PageTreeEntry[] = [];

    while (allItems.length < total) {
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
          (fields.slug?.[locale] as string) ||
          (fields.slug?.["en-US"] as string) ||
          "";

        const fullPath =
          (fields.fullPath?.[locale] as string | undefined) ||
          (fields.fullPath?.["en-US"] as string | undefined) ||
          null;

        const parentLink = fields.parent?.[locale] as
          | { sys?: { id?: string } }
          | undefined;
        const parentId = parentLink?.sys?.id ?? null;

        const entry: PageTreeEntry = {
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
        };

        allItems.push(entry);
      }

      skip += response.items.length;

      // Safety check: if no items returned, break to avoid infinite loop
      if (response.items.length === 0) break;
    }

    return NextResponse.json({ success: true, data: allItems });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
