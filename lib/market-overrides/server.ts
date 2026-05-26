/**
 * Server-side helpers for reading the active market for the current request.
 *
 * The middleware sets `x-market-code` when the request path contains a
 * `/market/<code>` segment. Server components can call
 * `getActiveMarketCode()` to read it; the value is unvalidated by design so
 * unknown codes degrade gracefully to base content downstream.
 */

import { headers } from "next/headers";

export const MARKET_HEADER = "x-market-code" as const;

/**
 * Returns the active market code for the current request, or `null` when no
 * market segment was present in the URL.
 *
 * Always treat the value as untrusted — it's whatever the user typed into the
 * `/market/<code>/...` segment of the URL.
 */
export async function getActiveMarketCode(): Promise<string | null> {
  const h = await headers();
  const code = h.get(MARKET_HEADER);
  return code && code.length > 0 ? code : null;
}
