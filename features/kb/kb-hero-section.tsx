"use client";

import React from "react";
import Link from "next/link";
import { Search, X, Loader2 } from "lucide-react";

type KbHit = {
  id: string;
  slug: string;
  title: string;
  summary?: string;
};

import type { MicrocopyDataMap } from "@/lib/microcopy";
import { useMicrocopyHelper } from "@/hooks/use-microcopy";

type Props = {
  locale: string;
  onSearchActive?: (active: boolean) => void;
  microcopy?: MicrocopyDataMap;
};

const DEFAULT_COPY: Record<string, string> = {
  "kb.hero.title": "How can we help you?",
  "kb.hero.subtitle": "Search our knowledge base or browse topics below",
  "kb.hero.searchPlaceholder": "Enter your question here to get started",
  "kb.hero.searching": "Searching...",
  "kb.hero.noResults": "No articles found for",
};

export default function KbHeroSection({ locale, onSearchActive, microcopy }: Props) {
  const t = useMicrocopyHelper(microcopy);
  const getText = (key: string) => t(key, DEFAULT_COPY[key] || key);
  const [q, setQ] = React.useState("");
  const [debouncedQ, setDebouncedQ] = React.useState("");
  const [hits, setHits] = React.useState<KbHit[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Debounce the search query
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQ(q.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [q]);

  // Fetch search results when debounced query changes
  React.useEffect(() => {
    if (!debouncedQ) {
      setHits([]);
      setTotal(0);
      setError(null);
      setLoading(false);
      onSearchActive?.(false);
      return;
    }

    let aborted = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      onSearchActive?.(true);
      try {
        const params = new URLSearchParams({ locale, limit: "8", q: debouncedQ });
        const res = await fetch(`/api/kb/search?${params.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Search failed");
        const data = (await res.json()) as { total: number; hits: KbHit[] };
        if (aborted) return;
        setHits(Array.isArray(data?.hits) ? data.hits : []);
        setTotal(typeof data?.total === "number" ? data.total : 0);
      } catch {
        if (aborted) return;
        setError("Search failed");
        setHits([]);
        setTotal(0);
      } finally {
        if (!aborted) setLoading(false);
      }
    };
    void run();
    return () => {
      aborted = true;
    };
  }, [debouncedQ, locale, onSearchActive]);

  const clearSearch = () => {
    setQ("");
    setDebouncedQ("");
    setHits([]);
    setTotal(0);
    onSearchActive?.(false);
    inputRef.current?.focus();
  };

  const hasResults = debouncedQ && (hits.length > 0 || loading || error);

  return (
    <section className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-4" {...getText("kb.hero.title").inspectorProps}>
            {getText("kb.hero.title").value}
          </h1>
          <p className="text-primary-foreground/80 text-lg mb-8" {...getText("kb.hero.subtitle").inspectorProps}>
            {getText("kb.hero.subtitle").value}
          </p>

          <div className="relative max-w-xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                ref={inputRef}
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={getText("kb.hero.searchPlaceholder").value}
                className="w-full rounded-lg border-0 bg-white text-foreground pl-12 pr-12 py-4 text-base shadow-lg focus:outline-none focus:ring-2 focus:ring-white/50 placeholder:text-muted-foreground"
                aria-label="Search knowledge base"
              />
              {q && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Clear search"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Search results dropdown */}
            {hasResults && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border max-h-96 overflow-y-auto z-50 text-left">
                {loading ? (
                  <div className="p-4 text-center text-muted-foreground flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span {...getText("kb.hero.searching").inspectorProps}>{getText("kb.hero.searching").value}</span>
                  </div>
                ) : error ? (
                  <div className="p-4 text-center text-red-600">{error}</div>
                ) : hits.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <span {...getText("kb.hero.noResults").inspectorProps}>{getText("kb.hero.noResults").value}</span> &ldquo;{debouncedQ}&rdquo;
                  </div>
                ) : (
                  <>
                    <div className="px-4 py-2 text-xs text-muted-foreground border-b bg-muted/30">
                      {total} result{total === 1 ? "" : "s"} for &ldquo;{debouncedQ}&rdquo;
                    </div>
                    <ul>
                      {hits.map((h) => (
                        <li key={h.id}>
                          <Link
                            href={`/${locale}/knowledge-base/${h.slug}`}
                            className="block px-4 py-3 hover:bg-muted/50 transition-colors border-b last:border-b-0"
                          >
                            <div className="font-medium text-foreground">{h.title}</div>
                            {h.summary && (
                              <div className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                                {h.summary}
                              </div>
                            )}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
