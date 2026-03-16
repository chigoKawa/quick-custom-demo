"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { IShelfModule } from "@/features/contentful/type";
import { useContentfulInspectorMode } from "@contentful/live-preview/react";

type ShelfCard = {
  title: string;
  author: string;
  price: number;
  originalPrice?: number;
  image: string;
  badge?: string;
};

function buildQuery(shelfApp: any): string {
  const parts: string[] = [];
  const base = typeof shelfApp?.query === "string" ? shelfApp.query.trim() : "";
  if (base) parts.push(base);
  const adv = shelfApp?.advanced;
  if (typeof adv?.title === "string" && adv.title.trim()) parts.push(`title:${adv.title.trim()}`);
  if (typeof adv?.author === "string" && adv.author.trim()) parts.push(`author:${adv.author.trim()}`);
  if (typeof adv?.subject === "string" && adv.subject.trim()) parts.push(`subject:${adv.subject.trim()}`);
  return parts.join(" ").trim();
}

export default function MobileShelfModule(entry: IShelfModule) {
  const inspectorProps = useContentfulInspectorMode({ entryId: entry?.sys?.id ?? "" });
  const shelfApp = entry?.fields?.shelfApp as any;
  const title = (entry?.fields?.title as string) || (entry?.fields?.internalTitle as string) || "";
  const subtitle = typeof entry?.fields?.subtitle === "string" ? entry.fields.subtitle : undefined;

  const query = useMemo(() => buildQuery(shelfApp), [shelfApp]);
  const limit = Math.max(1, Math.min(12, typeof shelfApp?.limit === "number" ? shelfApp.limit : 6));
  const url = useMemo(() => `/api/catalog/search?q=${encodeURIComponent(query)}&limit=${limit}`, [query, limit]);

  const [cards, setCards] = useState<ShelfCard[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query) return;
    let cancelled = false;
    setLoading(true);

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const items = Array.isArray(data?.items) ? data.items : [];
        setCards(
          items.map((item: any) => ({
            title: item.title || "Untitled",
            author: Array.isArray(item.authors) ? item.authors.map((a: any) => a.name).filter(Boolean).join(", ") : "",
            price: typeof item.price?.amount === "number" ? item.price.amount : 0,
            originalPrice: typeof item.originalPrice === "number" ? item.originalPrice : undefined,
            image: item.coverUrl || "/placeholder.svg",
            badge: typeof item.badge === "string" ? item.badge : undefined,
          }))
        );
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [query, url]);

  if (!entry?.sys?.id || !entry?.fields || !title) return null;

  return (
    <section className="w-full py-4">
      <div className="px-4 mb-3">
        <h2
          {...inspectorProps({ fieldId: "title" })}
          className="text-lg font-bold text-foreground"
        >
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>

      {loading && (
        <div className="flex gap-3 px-4 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex-none w-32 animate-pulse">
              <div className="aspect-[3/4] rounded-lg bg-muted mb-2" />
              <div className="h-3 bg-muted rounded w-3/4 mb-1" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {!loading && cards.length > 0 && (
        <div className="flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory scrollbar-hide">
          {cards.map((card, i) => (
            <div key={i} className="flex-none w-32 snap-start">
              <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-secondary mb-2">
                <img src={card.image} alt={card.title} className="w-full h-full object-cover" />
                {card.badge && (
                  <span className="absolute top-1.5 left-1.5 bg-primary text-primary-foreground text-[10px] font-medium px-1.5 py-0.5 rounded-full">
                    {card.badge}
                  </span>
                )}
              </div>
              <p className="text-xs font-medium text-foreground line-clamp-2 leading-tight">{card.title}</p>
              {card.author && (
                <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{card.author}</p>
              )}
              <div className="flex items-center gap-1 mt-1">
                <span className="text-xs font-semibold text-foreground">
                  ${card.price.toFixed(2)}
                </span>
                {card.originalPrice && card.originalPrice > card.price && (
                  <span className="text-[10px] text-muted-foreground line-through">
                    ${card.originalPrice.toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && cards.length === 0 && query && (
        <p className="px-4 text-xs text-muted-foreground">No items found.</p>
      )}
    </section>
  );
}
