import { NextRequest, NextResponse } from "next/server";
import { getKbIndex } from "@/lib/kb/loader";
import type { KbDoc } from "@/lib/kb/types";
import { create, insert, search } from "@orama/orama";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").slice(0, 200);
    const locale = (searchParams.get("locale") || "en-US").trim().slice(0, 20);
    const category = (searchParams.get("category") || "").trim() || undefined;
    const group = (searchParams.get("group") || "").trim() || undefined;
    const limit = Math.min(parseInt(searchParams.get("limit") || "10", 10), 25);

    const idx = getKbIndex(locale);
    if (!idx) return NextResponse.json({ hits: [], total: 0 }, { status: 200 });

    // Build an in-memory Orama DB for this request from the persisted docs
    const db = await create({ schema: {
      id: "string",
      slug: "string",
      title: "string",
      summary: "string",
      body: "string",
      categoriesJoined: "string",
      groupsJoined: "string",
      updatedAt: "string",
    }});

    const allDocs = idx.docs || [];
    const docs = allDocs
      .filter((d: KbDoc) => {
      if (category && !(d.categories || []).includes(category)) return false;
      if (group && !(d.groups || []).includes(group)) return false;
      return true;
      })
      .map((d) => ({
        id: d.id,
        slug: d.slug,
        title: d.title || "",
        summary: d.summary || "",
        body: d.body || "",
        categoriesJoined: d.categoriesJoined || "",
        groupsJoined: d.groupsJoined || "",
        updatedAt: d.updatedAt || "",
      }));

    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.log("[kb/search]", {
        locale,
        q: q ? "(provided)" : "(empty)",
        category,
        group,
        loadedDocs: allDocs.length,
        matchedDocs: docs.length,
      });
    }

    for (const d of docs) {
      await insert(db, d);
    }

    if (!q) {
      // Return top docs when no search term is provided
      const sorted = docs
        .slice()
        .sort((a, b) => {
          const ta = Date.parse(a.updatedAt || "");
          const tb = Date.parse(b.updatedAt || "");
          return tb - ta;
        })
        .slice(0, limit);
      return NextResponse.json({
        total: sorted.length,
        hits: sorted.map((d) => ({ id: d.id, slug: d.slug, title: d.title, summary: d.summary })),
      });
    }

    const res = await search(db, {
      term: q,
      properties: ["title", "summary", "body"],
      limit,
    });

    return NextResponse.json({
      total: res.count,
      hits: res.hits.map((h: { document: { id: string; slug: string; title: string; summary?: string }; score: number }) => ({
        id: h.document.id,
        slug: h.document.slug,
        title: h.document.title,
        summary: h.document.summary,
        score: h.score,
      })),
    });
  } catch (e) {
    return NextResponse.json({ hits: [], total: 0 }, { status: 200 });
  }
}
