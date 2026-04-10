import { NextRequest, NextResponse } from "next/server";
import { createClient, type PlainClientAPI } from "contentful-management";

const SPACE_ID = process.env.NEXT_PUBLIC_CTF_SPACE_ID!;
const ENVIRONMENT_ID = process.env.NEXT_PUBLIC_CTF_ENVIRONMENT || "master";

function getCmaClient(): PlainClientAPI {
  const token = process.env.CONTENTFUL_MANAGEMENT_TOKEN;
  if (!token) throw new Error("CONTENTFUL_MANAGEMENT_TOKEN is not set");
  return createClient({ accessToken: token }, { type: "plain" }) as PlainClientAPI;
}

/**
 * POST /api/page-tree/set-parent
 *
 * Body: {
 *   entryId: string;
 *   parentId: string | null;
 *   locale?: string;
 *   parentFieldName?: string;   // field ID for the parent link (default: "parent")
 *   fullPathFieldName?: string;  // field ID for the full path  (default: "fullPath")
 *   slugFieldName?: string;      // field ID for the slug       (default: "slug")
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      entryId: string;
      parentId: string | null;
      locale?: string;
      parentFieldName?: string;
      fullPathFieldName?: string;
      slugFieldName?: string;
    };

    const {
      entryId,
      parentId,
      locale = "en-US",
      parentFieldName = "parent",
      fullPathFieldName = "fullPath",
      slugFieldName = "slug",
    } = body;

    if (!entryId) {
      return NextResponse.json({ success: false, error: "entryId is required" }, { status: 400 });
    }

    const client = getCmaClient();

    const entry = await client.entry.get({
      spaceId: SPACE_ID,
      environmentId: ENVIRONMENT_ID,
      entryId,
    });

    const fields = entry.fields as Record<string, Record<string, unknown>>;

    if (parentId) {
      fields[parentFieldName] = {
        [locale]: { sys: { type: "Link", linkType: "Entry", id: parentId } },
      };
    } else {
      delete fields[parentFieldName];
    }

    const newPath = await computePath(
      client,
      entryId,
      parentId,
      locale,
      slugFieldName,
      parentFieldName
    );

    if (fields[fullPathFieldName] !== undefined || newPath) {
      fields[fullPathFieldName] = { [locale]: newPath };
    }

    const updated = await client.entry.update(
      { spaceId: SPACE_ID, environmentId: ENVIRONMENT_ID, entryId },
      { ...entry, fields }
    );

    return NextResponse.json({ success: true, data: { id: updated.sys.id, fullPath: newPath } });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

async function computePath(
  client: PlainClientAPI,
  entryId: string,
  parentId: string | null,
  locale: string,
  slugFieldName: string,
  parentFieldName: string,
  depth = 0
): Promise<string> {
  if (depth > 20) return "/(cycle-detected)";

  const entry = await client.entry.get({
    spaceId: SPACE_ID,
    environmentId: ENVIRONMENT_ID,
    entryId,
  });
  const fields = entry.fields as Record<string, Record<string, unknown>>;
  const slug = (fields[slugFieldName]?.[locale] ?? fields[slugFieldName]?.["en-US"] ?? entryId) as string;

  const HOME_SLUG = process.env.NEXT_PUBLIC_CTF_HOMEPAGE_SLUG || "home";
  if (slug === HOME_SLUG) return "/";

  if (!parentId) return "/" + slug;

  const parentEntry = await client.entry.get({
    spaceId: SPACE_ID,
    environmentId: ENVIRONMENT_ID,
    entryId: parentId,
  });
  const parentFields = parentEntry.fields as Record<string, Record<string, unknown>>;

  // The parent may be a different content type with a different parent field name.
  // Try the provided field name first, then fall back to "parent".
  const parentParentLink =
    (parentFields[parentFieldName]?.[locale] as { sys?: { id?: string } } | undefined) ??
    (parentFields.parent?.[locale] as { sys?: { id?: string } } | undefined);
  const parentParentId = parentParentLink?.sys?.id ?? null;

  const parentPath = await computePath(
    client,
    parentId,
    parentParentId,
    locale,
    slugFieldName,
    parentFieldName,
    depth + 1
  );
  if (parentPath === "/(cycle-detected)") return "/(cycle-detected)";
  if (parentPath === "/") return "/" + slug;
  return parentPath + "/" + slug;
}
