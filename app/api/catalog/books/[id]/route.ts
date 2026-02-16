import { NextResponse } from "next/server";
import type { CatalogErrorPayload } from "@/lib/open-library.types";
import {
  parseCatalogIdType,
  parseDebugFlag,
  resolveBookDetail,
} from "@/lib/open-library";
import {
  applyBookReferenceOverrideToDetail,
  getBookReferenceOverrides,
} from "@/lib/book-references";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const url = new URL(request.url);
  const idTypeRaw = url.searchParams.get("idType");
  const idType = parseCatalogIdType(idTypeRaw);
  const debug = parseDebugFlag(url.searchParams.get("debug"));
  const locale = url.searchParams.get("locale") ?? "en-US";

  if (!id || typeof id !== "string") {
    return NextResponse.json<CatalogErrorPayload>(
      { error: "Missing id" },
      { status: 400 }
    );
  }

  if (!idType) {
    return NextResponse.json<CatalogErrorPayload>(
      { error: "Invalid idType. Must be ISBN13, OLID, or WORK" },
      { status: 400 }
    );
  }

  const ttlSeconds = 300;

  const result = await resolveBookDetail({
    id,
    idType,
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
  const override = applyBookReferenceOverrideToDetail(result.book, overrides);
  const book = {
    ...result.book,
    title: override.title,
    description: override.description,
    cover: override.cover,
  };

  return NextResponse.json(
    {
      book,
      debug: result.debug,
    },
    { status: 200 }
  );
}
