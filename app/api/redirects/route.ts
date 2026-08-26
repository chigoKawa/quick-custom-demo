import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_CTF_ENVIRONMENT } from "@/lib/contentful";
import { buildRedirectMap } from "@/lib/redirects";

/**
 * GET /api/redirects[?env=<environment>]
 *
 * Returns the resolved, chain-collapsed redirect map as flat JSON so that the
 * Edge middleware can consume it without importing the Contentful SDK:
 *
 *   { generatedAt: "2026-08-26T…", environment: "master", count: 3,
 *     redirects: [{ from: "/old-campaign", to: "/campaigns/spring", code: 307 }] }
 *
 * Paths are locale- and market-agnostic — middleware re-applies the incoming
 * locale prefix and `/market/<code>` segment to the destination.
 *
 * `?env=` overrides the configured Contentful environment (debugging / env
 * switcher parity); it defaults to `DEFAULT_CTF_ENVIRONMENT`.
 *
 * Always answers 200. A broken redirect map must never be able to break the
 * site, so any failure degrades to `{ redirects: [] }` rather than a 5xx —
 * middleware treats an empty map as "no redirects configured".
 *
 * `middleware.ts` `config.matcher` excludes `api`, so middleware fetching this
 * route cannot recurse.
 */

// `lib/redirects.ts` pulls in the Contentful SDK — Node only (cf. app/api/kb/search/route.ts).
export const runtime = "nodejs";

// Reading `?env` makes this route dynamic, which would render `export const
// revalidate` inert. The real cache is the module-scope TTL in
// `lib/redirect-lookup.ts`; the `s-maxage` header below lets any CDN in front of
// the app collapse bursts on top of that.
export const dynamic = "force-dynamic";

/** Matches the middleware-side TTL in `lib/redirect-lookup.ts`. */
const CACHE_SECONDS = 60;

export async function GET(request: NextRequest) {
  const environment =
    request.nextUrl.searchParams.get("env")?.trim() || DEFAULT_CTF_ENVIRONMENT;

  let redirects: Awaited<ReturnType<typeof buildRedirectMap>> = [];

  try {
    redirects = await buildRedirectMap(environment);
  } catch (error) {
    // buildRedirectMap already swallows fetch failures; this is the belt-and-braces
    // guard so an unexpected throw still yields a usable (empty) map.
    console.error("[redirects] /api/redirects failed to build the map:", error);
  }

  return NextResponse.json(
    {
      generatedAt: new Date().toISOString(),
      environment,
      count: redirects.length,
      redirects,
    },
    {
      headers: {
        "Cache-Control": `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=300`,
      },
    }
  );
}
