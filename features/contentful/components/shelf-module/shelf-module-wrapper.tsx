"use client";

import React, { useEffect, useMemo, useState } from "react";

import type { IShelfModule } from "../../type";
import type { BookListItem, SearchResponse } from "@/lib/open-library.types";
import ShelfModule, { type ShelfBookCard } from "./shelf-module";

function quoteIfNeeded(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /\s/.test(trimmed) ? `"${trimmed.replaceAll('"', "\\\"")}"` : trimmed;
}

function buildOpenLibraryQueryFromShelfApp(shelfApp: any): string {
  const parts: string[] = [];
  const base = typeof shelfApp?.query === "string" ? shelfApp.query.trim() : "";
  if (base) parts.push(base);

  const adv = shelfApp?.advanced;
  const title = typeof adv?.title === "string" ? adv.title.trim() : "";
  if (title) parts.push(`title:${quoteIfNeeded(title)}`);

  const author = typeof adv?.author === "string" ? adv.author.trim() : "";
  if (author) parts.push(`author:${quoteIfNeeded(author)}`);

  const subject = typeof adv?.subject === "string" ? adv.subject.trim() : "";
  if (subject) parts.push(`subject:${quoteIfNeeded(subject)}`);

  const language = typeof adv?.language === "string" ? adv.language.trim() : "";
  if (language) parts.push(`language:${language}`);

  const year = adv?.firstPublishYear;
  if (typeof year === "number" && Number.isFinite(year)) {
    parts.push(`first_publish_year:${Math.trunc(year)}`);
  }

  const ebookAccess = typeof adv?.ebookAccess === "string" ? adv.ebookAccess.trim() : "";
  if (ebookAccess) parts.push(`ebook_access:${ebookAccess}`);

  return parts.join(" ").trim();
}

function authorLabel(item: BookListItem): string {
  const authors = Array.isArray(item.authors) ? item.authors : [];
  const names = authors.map((a) => a.name).filter(Boolean);
  return names.length > 0 ? names.join(", ") : "—";
}

function toShelfCard(item: BookListItem): ShelfBookCard {
  const price = typeof item.price?.amount === "number" ? item.price.amount : 0;
  return {
    title: item.title || "Untitled",
    author: authorLabel(item),
    price,
    originalPrice: typeof item.originalPrice === "number" ? item.originalPrice : undefined,
    image: item.coverUrl || "/placeholder.svg",
    badge: typeof item.badge === "string" ? item.badge : undefined,
    href: item.href,
  };
}

export default function ShelfModuleWrapper(entry: IShelfModule) {
  const shelfApp = entry?.fields?.shelfApp as any;

  const title =
    typeof entry?.fields?.title === "string"
      ? entry.fields.title
      : typeof entry?.fields?.internalTitle === "string"
      ? entry.fields.internalTitle
      : "";
  const subtitle = typeof entry?.fields?.subtitle === "string" ? entry.fields.subtitle : undefined;

  const limitRaw = typeof shelfApp?.limit === "number" ? shelfApp.limit : 6;
  const limit = Math.max(1, Math.min(24, Number.isFinite(limitRaw) ? limitRaw : 6));

  const query = useMemo(() => buildOpenLibraryQueryFromShelfApp(shelfApp), [shelfApp]);
  const url = useMemo(() => {
    const q = encodeURIComponent(query);
    return `/api/catalog/search?q=${q}&limit=${limit}&debug=0`;
  }, [query, limit]);

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [items, setItems] = useState<BookListItem[]>([]);

  useEffect(() => {
    if (!query) {
      setItems([]);
      setStatus("idle");
      return;
    }

    let cancelled = false;
    setStatus("loading");

    fetch(url)
      .then((r) => r.json() as Promise<SearchResponse>)
      .then((data) => {
        if (cancelled) return;
        const next = Array.isArray(data?.items) ? data.items : [];
        setItems(next);
        setStatus("success");
      })
      .catch(() => {
        if (cancelled) return;
        setItems([]);
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [query, url]);

  if (!title) return null;

  const cards = items.map(toShelfCard);

  return (
    <ShelfModule
      title={title}
      subtitle={subtitle}
      books={cards}
      viewAllLabel={undefined}
      onViewAll={undefined}
      entryId={entry?.sys?.id}
    />
  );
}
