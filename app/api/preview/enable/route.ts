import { NextRequest, NextResponse } from "next/server";
import { draftMode } from "next/headers";

/**
 * GET /api/preview/enable?secret=...&slug=/some-path
 *
 * Enables Next.js draft mode and redirects to the target page.
 *
 * Accepts either `slug` or `path` query parameter — both are treated
 * as the URL path to redirect to after enabling draft mode.
 *
 * Contentful preview URL examples:
 *   https://your-site.com/api/preview/enable?secret={SECRET}&slug={entry.fields.slug}
 *   https://your-site.com/api/preview/enable?secret={SECRET}&path={entry.fields.fullPath}
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const secret = searchParams.get("secret");
  const rawPath = searchParams.get("path") || searchParams.get("slug") || "/";

  const expectedSecret =
    process.env.CONTENTFUL_PREVIEW_SECRET ||
    process.env.NEXT_PUBLIC_CTF_PREVIEW_SECRET;

  if (expectedSecret && secret !== expectedSecret) {
    return NextResponse.json({ message: "Invalid secret" }, { status: 401 });
  }

  const draft = await draftMode();
  draft.enable();

  // Normalize: strip any protocol/host, ensure leading slash
  let pathname = rawPath.replace(/^https?:\/\/[^/]*/, "");
  if (!pathname.startsWith("/")) pathname = "/" + pathname;

  const redirectUrl = new URL(pathname, request.nextUrl.origin);
  return NextResponse.redirect(redirectUrl);
}
