import { NextRequest, NextResponse } from "next/server";
import { draftMode } from "next/headers";
import { getI18nConfig } from "@/i18n-config";

/**
 * GET /api/preview/enable?secret=...&path=/some-path&locale=de
 *
 * Enables Next.js draft mode and redirects to the target page.
 *
 * Accepts either `slug` or `path` query parameter — both are treated
 * as the URL path to redirect to after enabling draft mode.
 *
 * The optional `locale` parameter (Contentful's {locale} token) controls
 * the URL prefix. Non-default locales are prefixed (e.g. /de/some-path),
 * while the default locale uses a clean URL (e.g. /some-path).
 *
 * Contentful preview URL examples:
 *   https://your-site.com/api/preview/enable?secret={SECRET}&slug={entry.fields.slug}&locale={locale}
 *   https://your-site.com/api/preview/enable?secret={SECRET}&path={entry.fields.fullPath}&locale={locale}
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const secret = searchParams.get("secret");
  const rawPath = searchParams.get("path") || searchParams.get("slug") || "/";
  const locale = searchParams.get("locale");

  const expectedSecret =
    process.env.CONTENTFUL_PREVIEW_SECRET ||
    process.env.NEXT_PUBLIC_CTF_PREVIEW_SECRET;

  if (expectedSecret && secret !== expectedSecret) {
    return NextResponse.json({ message: "Invalid secret" }, { status: 401 });
  }

  const draft = await draftMode();
  draft.enable();

  // Normalize: strip protocol/host, collapse leading slashes to one
  let pathname = rawPath.replace(/^https?:\/\/[^/]*/, "");
  pathname = "/" + pathname.replace(/^\/+/, "");

  // Prefix with locale when it differs from the default (default uses clean URLs)
  if (locale) {
    const { defaultLocale } = await getI18nConfig();
    if (locale !== defaultLocale) {
      pathname = `/${locale}${pathname}`;
    }
  }

  const redirectUrl = new URL(pathname, request.nextUrl.origin);

  // Always append ?preview so the page route, middleware, and resolvePreviewMode
  // all detect preview mode — draftMode cookies alone can be lost during redirects.
  redirectUrl.searchParams.set("preview", "");

  return NextResponse.redirect(redirectUrl);
}
