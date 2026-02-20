"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTracking } from "@/features/tracking/use-tracking";

export type KbHit = {
  id: string;
  slug: string;
  title: string;
  summary?: string;
  score?: number;
};

export function useKbSearch(locale: string) {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hits, setHits] = useState<KbHit[]>([]);
  const [total, setTotal] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const { trackMetric } = useTracking();

  const canSearch = useMemo(() => q.trim().length >= 2, [q]);

  const runSearch = useCallback(
    async (query: string) => {
      if (!query) return;
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ q: query, locale });
        const res = await fetch(`/api/kb/search?${params.toString()}`, {
          signal: ctrl.signal,
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Search failed");
        const data = (await res.json()) as { total: number; hits: KbHit[] };
        setHits(data.hits || []);
        setTotal(data.total || 0);
      } catch (e) {
        if ((e as any)?.name === "AbortError") return;
        setError("Search failed");
        setHits([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [locale]
  );

  const onSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault?.();
      const query = q.trim();
      if (!query) return;
      await runSearch(query);
      try {
        trackMetric("kb_search", { queryLength: query.length, locale });
      } catch {
        // non-fatal
      }
    },
    [q, runSearch, trackMetric, locale]
  );

  return {
    q,
    setQ,
    canSearch,
    loading,
    error,
    hits,
    total,
    onSubmit,
    runSearch,
  } as const;
}
