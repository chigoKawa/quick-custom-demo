import { NextResponse } from "next/server";
import type { CatalogErrorPayload } from "@/lib/open-library.types";
import { parseDebugFlag, parseLimit, searchCatalog } from "@/lib/open-library";
import { applyBookReferenceOverrideToListItem, getBookReferenceOverrides } from "@/lib/book-references";

function parseOffset(value: string | null): number {
  const num = value ? Number(value) : 0;
  return Number.isFinite(num) && num >= 0 ? Math.min(num, 10000) : 0;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const limit = parseLimit(url.searchParams.get("limit"), 10);
  const offset = parseOffset(url.searchParams.get("offset"));
  const debug = parseDebugFlag(url.searchParams.get("debug"));
  const locale = url.searchParams.get("locale") ?? "en-US";

  if (!q.trim()) {
    return NextResponse.json<CatalogErrorPayload>(
      { error: "Missing q" },
      { status: 400 }
    );
  }

  const ttlSeconds = 300;

  const result = await searchCatalog({
    q,
    limit,
    offset,
    revalidateSeconds: ttlSeconds,
    debug,
  });

  if (!result.ok) {
    return NextResponse.json<CatalogErrorPayload>(
      {
        error: result.error,
        details: debug ? result.details : undefined,
      },
      { status: result.status }
    );
  }

  const overrides = await getBookReferenceOverrides({ locale, preview: false });
  const items = result.items.map((item) => {
    const override = applyBookReferenceOverrideToListItem(item, overrides);
    return {
      ...item,
      title: override.title,
      coverUrl: override.coverUrl,
      badge: override.badge,
      originalPrice: override.originalPrice,
    };
  });

  return NextResponse.json(
    {
      items,
      total: result.total,
      debug: result.debug,
    },
    { status: 200 }
  );
}
