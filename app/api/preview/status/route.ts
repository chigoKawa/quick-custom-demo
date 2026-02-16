import { NextResponse } from "next/server";
import { draftMode } from "next/headers";

export async function GET() {
  const { isEnabled } = await draftMode();
  return NextResponse.json({ enabled: Boolean(isEnabled) }, { status: 200 });
}
