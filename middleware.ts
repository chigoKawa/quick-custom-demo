import { NextRequest, NextResponse } from "next/server";
import { getI18nConfig } from "./i18n-config";
import { match as matchLocale } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";
import {
  getRedirectMap,
  isAbsoluteUrl,
  resolveRedirect,
  stripLocalePrefix,
} from "./lib/redirect-lookup";

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

/**
 * Detect and strip a `/market/<code>` segment from the pathname. Supports two
 * forms:
 *
 *   /market/<code>(/rest)?           — default locale, no locale prefix
 *   /<locale>/market/<code>(/rest)?  — locale-prefixed
 *
 * Returns the market code (if present) plus the path with the market segment
 * removed. The de-marketed path is used for all downstream routing decisions
 * so the underlying page resolves normally; the user-visible URL is left
 * untouched (we only ever internally rewrite, never redirect, when a market
 * segment is present).
 */
function stripMarketSegment(
  pathname: string,
  locales: string[]
): { marketCode: string | null; pathWithoutMarket: string } {
  // /<locale>/market/<code>(/...)
  for (const locale of locales) {
    const escaped = locale.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const m = pathname.match(
      new RegExp(`^/${escaped}/market/([a-zA-Z0-9_-]+)(/.*)?$`)
    );
    if (m) {
      return {
        marketCode: m[1],
        pathWithoutMarket: `/${locale}${m[2] ?? ""}`,
      };
    }
  }
  // /market/<code>(/...)
  const m = pathname.match(/^\/market\/([a-zA-Z0-9_-]+)(\/.*)?$/);
  if (m) {
    return { marketCode: m[1], pathWithoutMarket: m[2] || "/" };
  }
  return { marketCode: null, pathWithoutMarket: pathname };
}

/**
 * Build request headers that forward preview/timeline + market flags so that
 * server components (which read `headers()`) can detect preview mode and the
 * active market override.
 */
function buildRequestHeaders(
  request: NextRequest,
  marketCode: string | null
): Headers {
  const requestHeaders = new Headers(request.headers);
  const isPreview = request.nextUrl.searchParams.has("preview");

  if (isPreview) {
    requestHeaders.set("x-contentful-preview", "1");
    const timeline = request.nextUrl.searchParams.get("timeline") ?? "";
    if (timeline) {
      requestHeaders.set("x-contentful-timeline", timeline);
    }
    const env = request.nextUrl.searchParams.get("env") ?? "";
    if (env) {
      requestHeaders.set("x-contentful-env", env);
    }
  }

  if (marketCode) {
    requestHeaders.set("x-market-code", marketCode);
  }

  return requestHeaders;
}

function applyNoCacheHeaders(res: NextResponse): NextResponse {
  for (const [k, v] of Object.entries(PREVIEW_NO_CACHE_HEADERS)) {
    res.headers.set(k, v);
  }
  return res;
}

export async function middleware(request: NextRequest) {
  const { locales, defaultLocale } = await getI18nConfig();
  const originalPathname = request.nextUrl.pathname;
  const isPreview = request.nextUrl.searchParams.has("preview");

  // Strip /market/<code> early. The de-marketed path drives all routing
  // decisions below; the original pathname is only used when computing
  // user-visible redirect destinations so the /market/<code> segment is
  // preserved in the address bar.
  const { marketCode, pathWithoutMarket } = stripMarketSegment(
    originalPathname,
    locales
  );
  const requestHeaders = buildRequestHeaders(request, marketCode);
  const pathname = pathWithoutMarket;
  const hasMarket = marketCode !== null;

  // 0) Contentful-driven redirects. Sources are matched locale- and
  //    market-agnostically, then the incoming locale prefix and /market/<code>
  //    segment are re-applied to the destination. `?preview` bypasses redirects
  //    entirely so an editor can still preview a page they have redirected away
  //    from (mirrors the !isPreview gate below).
  if (!isPreview) {
    const { locale: pathLocale, rest } = stripLocalePrefix(pathname, locales);
    const rule = resolveRedirect(
      await getRedirectMap(request.nextUrl.origin),
      rest
    );
    if (rule) {
      if (isAbsoluteUrl(rule.to)) {
        return NextResponse.redirect(rule.to, rule.code);
      }
      // clone() carries the incoming search params, so query strings survive.
      const url = request.nextUrl.clone();
      const prefix =
        pathLocale && pathLocale !== defaultLocale ? `/${pathLocale}` : "";
      const market = hasMarket ? `/market/${marketCode}` : "";
      const target = rule.to === "/" ? "" : rule.to;
      url.pathname = `${prefix}${market}${target}` || "/";
      return NextResponse.redirect(url, rule.code);
    }
  }

  const startsWithLocale = locales.find(
    (loc) => pathname === `/${loc}` || pathname.startsWith(`/${loc}/`)
  );

  // 1) If (de-marketed) URL already has a locale prefix
  if (startsWithLocale) {
    // If it's the default locale, redirect to a clean URL without the prefix.
    // Preserve the /market/<code> segment in the visible URL when present.
    if (startsWithLocale === defaultLocale) {
      const stripped = pathname.replace(
        new RegExp(`^/${defaultLocale}(?:/)?`),
        "/"
      );
      const cleanPath = stripped === "" ? "/" : stripped;
      if (!isPreview && cleanPath !== pathname) {
        const url = request.nextUrl.clone();
        url.pathname = hasMarket
          ? `/market/${marketCode}${cleanPath === "/" ? "" : cleanPath}`
          : cleanPath;
        return NextResponse.redirect(url);
      }
    }

    // When a market segment is present, the actual URL contains /market/<code>
    // but the route we want to resolve is the de-marketed path. Internally
    // rewrite so the page renders.
    if (hasMarket && pathname !== originalPathname) {
      const url = request.nextUrl.clone();
      url.pathname = pathname;
      const res = NextResponse.rewrite(url, {
        request: { headers: requestHeaders },
      });
      return isPreview ? applyNoCacheHeaders(res) : res;
    }

    const res = NextResponse.next({ request: { headers: requestHeaders } });
    return isPreview ? applyNoCacheHeaders(res) : res;
  }

  // 2) If URL is missing a locale prefix
  const best = await getLocale(request);

  // For the default locale: keep clean URL by rewriting internally.
  if (best === defaultLocale) {
    const url = request.nextUrl.clone();
    url.pathname = `/${defaultLocale}${pathname}`;
    const res = NextResponse.rewrite(url, {
      request: { headers: requestHeaders },
    });
    return isPreview ? applyNoCacheHeaders(res) : res;
  }

  // For non-default best matches: redirect to locale-prefixed URL.
  // Preserve the original /market/<code> segment in the visible URL.
  const url = request.nextUrl.clone();
  url.pathname = `/${best}${originalPathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Ignore API routes, Next.js static assets, and the non-localized top-level
  // tool routes (setup, ctf-apps, platform, mock, design) — those live outside
  // the (site)/[locale] route group and must not be locale-negotiated.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|setup|ctf-apps|platform|mock|design|.*\\..*).*)",
  ],
};
