"use client";

import React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useKbSearch } from "@/features/kb/use-kb-search";
import type { KbHit } from "@/features/kb/use-kb-search";

type Props = {
  locale: string;
};

function titleizeSlug(slug: string): string {
  return (slug || "")
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function KbSearchSection({ locale }: Props) {
  const { q, setQ, canSearch, loading, error, hits, total, onSubmit } = useKbSearch(locale);
  const searchParams = useSearchParams();

  const group = (searchParams.get("group") || "").trim() || undefined;
  const category = (searchParams.get("category") || "").trim() || undefined;

  const basePath = `/${locale}/knowledge-base`;
  const groupLabel = group ? titleizeSlug(group) : undefined;
  const categoryLabel = category ? titleizeSlug(category) : undefined;

  const [filteredHits, setFilteredHits] = React.useState<KbHit[]>([]);
  const [filteredTotal, setFilteredTotal] = React.useState(0);
  const [filteredLoading, setFilteredLoading] = React.useState(false);
  const [filteredError, setFilteredError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let aborted = false;
    const run = async () => {
      if (!group && !category) {
        setFilteredHits([]);
        setFilteredTotal(0);
        setFilteredError(null);
        setFilteredLoading(false);
        return;
      }

      setFilteredLoading(true);
      setFilteredError(null);
      try {
        const params = new URLSearchParams({
          locale,
          limit: "12",
          q: "",
        });
        if (group) params.set("group", group);
        if (category) params.set("category", category);
        const res = await fetch(`/api/kb/search?${params.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to load filtered articles");
        const data = (await res.json()) as { total: number; hits: KbHit[] };
        if (aborted) return;
        setFilteredHits(Array.isArray(data?.hits) ? data.hits : []);
        setFilteredTotal(typeof data?.total === "number" ? data.total : 0);
      } catch {
        if (aborted) return;
        setFilteredError("Failed to load articles");
        setFilteredHits([]);
        setFilteredTotal(0);
      } finally {
        if (!aborted) setFilteredLoading(false);
      }
    };
    void run();
    return () => {
      aborted = true;
    };
  }, [group, category, locale]);

  return (
    <section className="container mx-auto px-4 py-14 md:py-20">
      <div className="max-w-3xl mx-auto text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mb-3">Knowledge Base</h1>
        <p className="text-muted-foreground">Search our articles by keywords. Start typing to see results.</p>
      </div>

      {group || category ? (
        <div className="max-w-3xl mx-auto mb-8">
          <div className="rounded-xl border bg-background p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Browsing</div>
                <div className="text-lg font-semibold leading-snug">
                  {groupLabel ? `Topic: ${groupLabel}` : null}
                  {groupLabel && categoryLabel ? " · " : null}
                  {categoryLabel ? `Category: ${categoryLabel}` : null}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {filteredTotal > 0 ? (
                  <div className="text-sm text-muted-foreground">
                    {filteredTotal} article{filteredTotal === 1 ? "" : "s"}
                  </div>
                ) : null}
                <Link
                  href={basePath}
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  Clear
                </Link>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {group ? (
                <Link
                  href={category ? `${basePath}?category=${encodeURIComponent(category)}` : basePath}
                  className="inline-flex items-center rounded-full border bg-muted px-3 py-1 text-sm hover:border-primary"
                >
                  <span className="font-medium">Topic</span>
                  <span className="px-1 text-muted-foreground">:</span>
                  <span>{groupLabel}</span>
                  <span className="pl-2 text-muted-foreground">×</span>
                </Link>
              ) : null}
              {category ? (
                <Link
                  href={group ? `${basePath}?group=${encodeURIComponent(group)}` : basePath}
                  className="inline-flex items-center rounded-full border bg-muted px-3 py-1 text-sm hover:border-primary"
                >
                  <span className="font-medium">Category</span>
                  <span className="px-1 text-muted-foreground">:</span>
                  <span>{categoryLabel}</span>
                  <span className="pl-2 text-muted-foreground">×</span>
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="max-w-2xl mx-auto flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search articles..."
          className="flex-1 border rounded-md px-4 py-3 bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Search knowledge base"
        />
        <button
          type="submit"
          className="rounded-md px-5 py-3 bg-primary text-primary-foreground disabled:opacity-60 transition-colors hover:bg-primary/90"
          disabled={!canSearch || loading}
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {error ? (
        <div className="max-w-2xl mx-auto mt-6 text-sm text-red-600">{error}</div>
      ) : null}

      <div className="max-w-3xl mx-auto mt-10">
        {total > 0 ? (
          <p className="text-sm text-muted-foreground mb-3">{total} result{total === 1 ? "" : "s"}</p>
        ) : null}
        <ul className="grid grid-cols-1 gap-4">
          {hits.map((h) => (
            <li key={h.id} className="h-full">
              <Link
                href={`/${locale}/knowledge-base/${h.slug}`}
                className="group block h-full rounded-xl border bg-background p-5 transition-colors transition-shadow hover:border-primary hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <h3 className="text-lg font-semibold mb-1 leading-snug group-hover:text-primary">{h.title}</h3>
                {h.summary ? (
                  <p className="text-sm text-muted-foreground line-clamp-3">{h.summary}</p>
                ) : null}
                <div className="mt-3 text-sm text-muted-foreground group-hover:text-primary">Read article</div>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {group || category ? (
        <div className="max-w-3xl mx-auto mt-12">
          {filteredLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : filteredError ? (
            <div className="text-sm text-red-600">{filteredError}</div>
          ) : filteredHits.length === 0 ? (
            <div className="text-sm text-muted-foreground">No articles found for this filter.</div>
          ) : (
            <ul className="grid grid-cols-1 gap-4">
              {filteredHits.map((h) => (
                <li key={h.id} className="h-full">
                  <Link
                    href={`/${locale}/knowledge-base/${h.slug}`}
                    className="group block h-full rounded-xl border bg-background p-5 transition-colors transition-shadow hover:border-primary hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <h3 className="text-lg font-semibold mb-1 leading-snug group-hover:text-primary">{h.title}</h3>
                    {h.summary ? (
                      <p className="text-sm text-muted-foreground line-clamp-3">{h.summary}</p>
                    ) : null}
                    <div className="mt-3 text-sm text-muted-foreground group-hover:text-primary">Read article</div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  );
}
