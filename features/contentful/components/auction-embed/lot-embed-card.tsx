"use client";

import React, { useEffect, useState } from "react";

interface LotData {
  id: string;
  auctionId: string;
  lotNumber: number;
  title: string;
  artist: string;
  year?: number;
  estimateLowGBP?: number;
  estimateHighGBP?: number;
  heroImageUrl?: string;
}

interface LotRefEntry {
  fields: {
    externalLotId?: string;
    label?: string;
    promoTitle?: string;
    promoCopy?: string;
    featured?: boolean;
    internalName?: string;
  };
}

function formatEstimate(low?: number, high?: number) {
  if (!low && !high) return null;
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n);
  if (low && high) return `Est. ${fmt(low)} – ${fmt(high)}`;
  return `Est. ${fmt(low ?? high!)}`;
}

interface Props {
  entry: LotRefEntry;
  inline?: boolean;
}

export default function LotEmbedCard({ entry, inline = false }: Props) {
  const lotId = entry.fields.externalLotId;
  const [lot, setLot] = useState<LotData | null>(null);

  useEffect(() => {
    if (!lotId) return;
    fetch(`/api/integrations/lots/${lotId}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setLot(d.lot as LotData); })
      .catch(() => {});
  }, [lotId]);

  const displayTitle = entry.fields.promoTitle ?? lot?.title ?? entry.fields.label ?? entry.fields.internalName ?? "Lot";
  const displayArtist = lot?.artist;
  const displayYear = lot?.year;
  const lotNumber = lot?.lotNumber;
  const estimate = formatEstimate(lot?.estimateLowGBP, lot?.estimateHighGBP);
  const imageUrl = lot?.heroImageUrl;

  if (inline) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-[#7b1c2e]/30 bg-[#7b1c2e]/5 text-sm font-medium text-[#7b1c2e]">
        <span>🖼</span>
        {lotNumber != null && <span className="text-xs font-semibold">Lot {lotNumber}</span>}
        <span>{displayTitle}</span>
        {displayArtist && <span className="text-xs opacity-70 italic">· {displayArtist}</span>}
      </span>
    );
  }

  return (
    <div className="my-6 rounded-2xl border border-border bg-card shadow-sm overflow-hidden not-prose">
      <div className="flex gap-0">
        {/* Image panel */}
        {imageUrl && (
          <div className="shrink-0 w-28 sm:w-36 bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={displayTitle}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 px-5 py-4 min-w-0">
          <div className="flex items-start gap-3 mb-2">
            {lotNumber != null && (
              <span className="shrink-0 text-xs font-bold uppercase tracking-wider text-[#7b1c2e] bg-[#7b1c2e]/10 rounded px-2 py-1">
                Lot {lotNumber}
              </span>
            )}
            {entry.fields.featured && (
              <span className="shrink-0 text-xs font-semibold uppercase tracking-wider text-amber-700 bg-amber-100 rounded px-2 py-1">
                Featured
              </span>
            )}
          </div>

          <div className="font-semibold text-base leading-snug mb-1">
            {displayTitle}
          </div>

          {displayArtist && (
            <div className="text-sm italic text-muted-foreground mb-1">
              {displayArtist}{displayYear ? `, ${displayYear}` : ""}
            </div>
          )}

          {entry.fields.promoCopy && (
            <div className="text-sm text-muted-foreground mt-2 line-clamp-3">
              {entry.fields.promoCopy}
            </div>
          )}

          {estimate && (
            <div className="mt-3 text-sm font-semibold text-[#7b1c2e]">
              {estimate}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
