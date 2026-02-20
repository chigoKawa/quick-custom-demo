import { NextRequest, NextResponse } from "next/server";
import { getMicrocopy, getMicrocopyWithIds } from "@/lib/microcopy";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const locale = searchParams.get("locale") || "en-US";
  const preview = searchParams.get("preview") === "true";
  const withIds = searchParams.get("withIds") === "true";

  try {
    if (withIds) {
      const microcopy = await getMicrocopyWithIds(locale, preview);
      return NextResponse.json({ microcopy });
    }
    const microcopy = await getMicrocopy(locale, preview);
    return NextResponse.json({ microcopy });
  } catch (error) {
    console.error("Error fetching microcopy:", error);
    return NextResponse.json({ microcopy: {} }, { status: 500 });
  }
}
