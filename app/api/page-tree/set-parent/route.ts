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
 * Body: { entryId: string; parentId: string | null; locale: string }
 *
 * Sets (or clears) the `parent` field on the given entry, then
 * recomputes and writes `fullPath` by fetching the parent chain.
 */
export async function POST(request: NextRequest) {
  try {
    const { entryId, parentId, locale = "en-US" } = await request.json() as {
      entryId: string;
      parentId: string | null;
      locale?: string;
    };

    if (!entryId) {
      return NextResponse.json({ success: false, error: "entryId is required" }, { status: 400 });
    }

    const client = getCmaClient();

    // Fetch the entry
    const entry = await client.entry.get({
      spaceId: SPACE_ID,
      environmentId: ENVIRONMENT_ID,
      entryId,
    });

    const fields = entry.fields as Record<string, Record<string, unknown>>;

    // Set or clear the parent field
    if (parentId) {
      fields.parent = {
        [locale]: { sys: { type: "Link", linkType: "Entry", id: parentId } },
      };
    } else {
      // Remove parent by setting to undefined; CMA will clear it
      delete fields.parent;
    }

    // Compute the new fullPath by fetching the parent chain
    const newPath = await computePath(client, entryId, parentId, locale);

    if (fields.fullPath !== undefined || newPath) {
      fields.fullPath = { [locale]: newPath };
    }

    // Update entry
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
  depth = 0
): Promise<string> {
  if (depth > 20) return "/(cycle-detected)";

  // Get the slug of the current entry
  const entry = await client.entry.get({
    spaceId: SPACE_ID,
    environmentId: ENVIRONMENT_ID,
    entryId,
  });
  const fields = entry.fields as Record<string, Record<string, unknown>>;
  const slug = (fields.slug?.[locale] ?? fields.slug?.["en-US"] ?? entryId) as string;

  const HOME_SLUG = process.env.NEXT_PUBLIC_CTF_HOMEPAGE_SLUG || "home";
  if (slug === HOME_SLUG) return "/";

  if (!parentId) return "/" + slug;

  // Fetch parent's path recursively
  const parentEntry = await client.entry.get({
    spaceId: SPACE_ID,
    environmentId: ENVIRONMENT_ID,
    entryId: parentId,
  });
  const parentFields = parentEntry.fields as Record<string, Record<string, unknown>>;
  const parentParentLink = parentFields.parent?.[locale] as { sys?: { id?: string } } | undefined;
  const parentParentId = parentParentLink?.sys?.id ?? null;

  const parentPath = await computePath(client, parentId, parentParentId, locale, depth + 1);
  if (parentPath === "/(cycle-detected)") return "/(cycle-detected)";
  if (parentPath === "/") return "/" + slug;
  return parentPath + "/" + slug;
}
