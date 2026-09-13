"use client";

import { useEffect } from "react";

/**
 * Ensures `preview` is present in the URL.
 *
 * The Ninetailed preview plugin only attaches when AppProviders sees `preview`
 * in the client-side search params (`isPreviewEnabled`, lib/utils.ts). The
 * harness routes resolve preview server-side for the *fetch*, so landing on one
 * of these URLs without the param gives you content but no audience-switcher
 * widget.
 *
 * This must happen on the client, not via a server `redirect()`: during
 * `next build`'s page-data collection these routes are invoked with empty
 * searchParams, so a server redirect fires at build time and aborts the build
 * with "Cannot find module for page: /_document".
 *
 * `replace` rather than `push`, so the Back button still leaves the harness.
 */
export default function EnsurePreviewParam() {
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has("preview")) return;
    url.searchParams.set("preview", "true");
    window.location.replace(url.toString());
  }, []);

  return null;
}
