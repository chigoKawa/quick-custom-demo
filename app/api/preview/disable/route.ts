import { NextResponse } from "next/server";
import { draftMode } from "next/headers";

/**
 * GET /api/preview/disable
 *
 * Disables Next.js draft mode and redirects to the homepage.
 */
export async function GET() {
  const draft = await draftMode();
  draft.disable();
  return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"));
}
