"use client";

import React, { useEffect, useState } from "react";

interface AuctionSnapshot {
  externalAuctionId: string;
  title: string;
  saleType: "Evening" | "Day" | "Online";
  startDate: string;
  endDate: string;
  location: string;
  lotCount: number;
}

interface AuctionEntry {
  fields: {
    externalAuctionId?: AuctionSnapshot;
    overrideTitle?: string;
    overrideSummary?: string;
    overrideSaleType?: string;
    internalName?: string;
  };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const SALE_TYPE_STYLES: Record<string, string> = {
  Evening: "bg-[#1a1a2e] text-white",
  Day: "bg-[#f5ede0] text-[#5c3d1e]",
  Online: "bg-[#e8f5e9] text-[#1b5e20]",
};

interface Props {
  entry: AuctionEntry;
  inline?: boolean;
}

export default function AuctionEmbedCard({ entry, inline = false }: Props) {
  const snap = entry.fields.externalAuctionId as AuctionSnapshot | undefined;
  const title = entry.fields.overrideTitle ?? snap?.title ?? entry.fields.internalName ?? "Auction";
  const saleType = (entry.fields.overrideSaleType ?? snap?.saleType) as string | undefined;
  const location = snap?.location;
  const startDate = snap?.startDate;
  const endDate = snap?.endDate;
  const lotCount = snap?.lotCount;

  const [lots, setLots] = useState<{ id: string; lotNumber: number; title: string; artist: string; year?: number }[]>([]);

  useEffect(() => {
    if (!snap?.externalAuctionId || inline) return;
    fetch(`/api/integrations/auctions/${snap.externalAuctionId}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setLots(d.auction.lots ?? []); })
      .catch(() => {});
  }, [snap?.externalAuctionId, inline]);

  if (inline) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-[#7b1c2e]/30 bg-[#7b1c2e]/5 text-sm font-medium text-[#7b1c2e]">
        <span>🎨</span>
        <span>{title}</span>
        {saleType && (
          <span className="text-xs opacity-70">· {saleType}</span>
        )}
      </span>
    );
  }

  return (
    <div className="my-6 rounded-2xl border border-border bg-card shadow-sm overflow-hidden not-prose">
      {/* Header bar */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-muted/30">
        <span className="text-2xl">🎨</span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-base leading-tight truncate">{title}</div>
          {entry.fields.overrideSummary && (
            <div className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{entry.fields.overrideSummary}</div>
          )}
        </div>
        {saleType && (
          <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${SALE_TYPE_STYLES[saleType] ?? "bg-muted text-foreground"}`}>
            {saleType}
          </span>
        )}
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap gap-x-6 gap-y-2 px-5 py-3 text-sm text-muted-foreground">
        {location && (
          <span className="flex items-center gap-1.5">
            <span>📍</span>{location}
          </span>
        )}
        {startDate && endDate && (
          <span className="flex items-center gap-1.5">
            <span>📅</span>
            {formatDate(startDate)}
            {startDate !== endDate ? ` – ${formatDate(endDate)}` : ""}
          </span>
        )}
        {lotCount != null && (
          <span className="flex items-center gap-1.5">
            <span>🖼</span>{lotCount} lots
          </span>
        )}
      </div>

      {/* Lots preview */}
      {lots.length > 0 && (
        <div className="px-5 pb-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Highlights
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {lots.slice(0, 6).map((lot) => (
              <div key={lot.id} className="rounded-lg border border-border bg-background px-3 py-2 text-xs">
                <div className="font-semibold text-[#7b1c2e]">Lot {lot.lotNumber}</div>
                <div className="font-medium truncate">{lot.title}</div>
                <div className="text-muted-foreground truncate italic">{lot.artist}{lot.year ? `, ${lot.year}` : ""}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
