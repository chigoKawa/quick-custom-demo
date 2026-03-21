import { NextRequest, NextResponse } from "next/server";
import { getI18nConfig } from "./i18n-config";
import { match as matchLocale } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";

function sanitizeLanguageTags(tags: string[]): string[] {
  return tags.filter((tag) => {
    if (!tag || tag === "*") return false;
    try {
      // Throws if invalid per BCP47
      return Intl.getCanonicalLocales(tag).length > 0;
    } catch {
      return false;
    }
  });
}

async function getLocale(request: NextRequest) {
  const { locales, defaultLocale } = await getI18nConfig();

  // Get user's preferred languages from the request headers
  const negotiatorHeaders: Record<string, string> = {};
  request.headers.forEach((value, key) => (negotiatorHeaders[key] = value));

  const acceptedLanguagesRaw = new Negotiator({ headers: negotiatorHeaders }).languages();
  const acceptedLanguages = sanitizeLanguageTags(acceptedLanguagesRaw);
  const availableLocales = sanitizeLanguageTags(locales);

  // Fall back sensibly if everything was filtered
  const candidateLanguages = acceptedLanguages.length > 0 ? acceptedLanguages : [defaultLocale];
  const candidateLocales = availableLocales.length > 0 ? availableLocales : [defaultLocale];

  const matchedLocale = matchLocale(candidateLanguages, candidateLocales, defaultLocale);
  return matchedLocale || defaultLocale;
}

/** Response headers that prevent browser/proxy caching for preview requests. */
const PREVIEW_NO_CACHE_HEADERS: HeadersInit = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function middleware(request: NextRequest) {
  const { locales, defaultLocale } = await getI18nConfig();
  const { pathname } = request.nextUrl;
  const isPreview = request.nextUrl.searchParams.has("preview");

  const startsWithLocale = locales.find(
    (loc) => pathname === `/${loc}` || pathname.startsWith(`/${loc}/`)
  );

  // 1) If URL already has a locale prefix
  if (startsWithLocale) {
    // If it's the default locale, redirect to clean URL without the locale prefix
    if (startsWithLocale === defaultLocale) {
      const stripped = pathname.replace(
        new RegExp(`^/${defaultLocale}(?:/)?`),
        "/"
      );
      const cleanPath = stripped === "" ? "/" : stripped;
      if (!isPreview && cleanPath !== pathname) {
        const url = request.nextUrl.clone();
        url.pathname = cleanPath;
        // preserve existing search params by mutating only the pathname
        return NextResponse.redirect(url);
      }
    }
    // Preview/timeline: prevent browser from caching the iframe response
    // so switching releases always triggers a fresh server render.
    if (isPreview) {
      const res = NextResponse.next();
      for (const [k, v] of Object.entries(PREVIEW_NO_CACHE_HEADERS)) {
        res.headers.set(k, v);
      }
      return res;
    }
    // Non-default locales: let the request continue
    return;
  }

  // 2) If URL is missing a locale prefix
  const best = await getLocale(request);

  // For the default locale: keep clean URL by rewriting internally
  if (best === defaultLocale) {
    const url = request.nextUrl.clone();
    url.pathname = `/${defaultLocale}${pathname}`;
    const res = NextResponse.rewrite(url);
    // Bust cache for preview/timeline requests
    if (isPreview) {
      for (const [k, v] of Object.entries(PREVIEW_NO_CACHE_HEADERS)) {
        res.headers.set(k, v);
      }
    }
    return res;
  }

  // For non-default best matches: redirect to locale-prefixed URL
  const url = request.nextUrl.clone();
  url.pathname = `/${best}${pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Ignore API routes and Next.js static assets
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|setup|ctf-apps|platform|.*\\..*).*)",
  ],
};
