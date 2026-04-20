import { NextRequest, NextResponse } from "next/server";
import { draftMode } from "next/headers";

/**
 * GET /api/preview/enable?secret=...&slug=/some-path
 *
 * Enables Next.js draft mode and redirects to the target page.
 * Contentful should be configured to call this URL when the user
 * clicks "Open preview" — e.g.:
 *   https://your-site.com/api/preview/enable?secret={PREVIEW_SECRET}&slug=/{entry.fields.fullPath}
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const secret = searchParams.get("secret");
  const slug = searchParams.get("slug") || "/";

  const expectedSecret =
    process.env.CONTENTFUL_PREVIEW_SECRET ||
    process.env.NEXT_PUBLIC_CTF_PREVIEW_SECRET;

  if (expectedSecret && secret !== expectedSecret) {
    return NextResponse.json({ message: "Invalid secret" }, { status: 401 });
  }

  const draft = await draftMode();
  draft.enable();

  const redirectUrl = new URL(slug, request.nextUrl.origin);
  return NextResponse.redirect(redirectUrl);
}
