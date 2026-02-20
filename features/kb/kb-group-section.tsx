"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useContentfulLiveUpdates } from "@contentful/live-preview/react";
import type { IKbGroup } from "@/features/contentful/type";
import type { KbHit } from "./use-kb-search";

function useEffectiveLocaleFromPath() {
  const pathname = usePathname();
  const info = useMemo(() => {
    const parts = (pathname || "").split("/").filter(Boolean);
    const first = parts[0] || "";
    const looksPrefixed = /^[a-z]{2}-[A-Z]{2}$/.test(first);
    return {
      locale: looksPrefixed ? first : "en-US",
      isDefaultCleanPath: !looksPrefixed, // default locale path without prefix
    } as const;
  }, [pathname]);
  return info;
}

function getLocalizedStringField(
  value: unknown,
  locale: string
): string | undefined {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return undefined;
  const rec = value as Record<string, unknown>;
  const direct = rec[locale];
  if (typeof direct === "string") return direct;
  // best-effort fallback (first locale key)
  for (const k of Object.keys(rec)) {
    const v = rec[k];
    if (typeof v === "string") return v;
  }
  return undefined;
}

export default function KbGroupSection(groupEntry: IKbGroup) {
  const entry = useContentfulLiveUpdates(groupEntry) || groupEntry;
  const { locale, isDefaultCleanPath } = useEffectiveLocaleFromPath();

  const name = getLocalizedStringField((entry?.fields as any)?.name, locale);
  const slug = getLocalizedStringField((entry?.fields as any)?.slug, locale);
  const description = getLocalizedStringField((entry?.fields as any)?.description, locale);

  const [hits, setHits] = useState<KbHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let aborted = false;
    const run = async () => {
      if (!slug) return;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          group: slug,
          locale,
          limit: "6",
          q: "", // empty term returns top matches when supported; our API will return all filtered docs
        });
        const res = await fetch(`/api/kb/search?${params.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to load group articles");
        const data = (await res.json()) as { hits: KbHit[] };
        if (!aborted) setHits(data?.hits || []);
      } catch (e) {
        if (!aborted) setError("Failed to load articles");
      } finally {
        if (!aborted) setLoading(false);
      }
    };
    void run();
    return () => {
      aborted = true;
    };
  }, [slug, locale]);

  return (
    <section className="w-full py-10 md:py-14">
      <div className="container mx-auto px-4">
        <div className="mb-6">
          {name ? <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">{name}</h2> : null}
          {description ? (
            <p className="text-muted-foreground mt-2 max-w-3xl">{description}</p>
          ) : null}
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : hits.length === 0 ? (
          <div className="text-sm text-muted-foreground">No articles yet.</div>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {hits.map((h) => (
              <li key={h.id} className="h-full">
                <Link
                  href={
                    isDefaultCleanPath
                      ? `/knowledge-base/${encodeURIComponent(h.slug)}`
                      : `/${locale}/knowledge-base/${encodeURIComponent(h.slug)}`
                  }
                  className="group block h-full rounded-xl border bg-background p-5 transition-colors transition-shadow hover:border-primary hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex h-full flex-col justify-between gap-2">
                    <div>
                      <div className="font-semibold leading-snug group-hover:text-primary">{h.title}</div>
                      {h.summary ? (
                        <div className="mt-2 text-sm text-muted-foreground line-clamp-2">{h.summary}</div>
                      ) : null}
                    </div>
                    <div className="text-sm text-muted-foreground group-hover:text-primary">Read article</div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
