"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  useContentfulLiveUpdates,
  useContentfulInspectorMode,
} from "@contentful/live-preview/react";
import type { IAuction } from "../../type";
import ContentfulLandingPage from "../contentful-landing-page";

// ── Types ──────────────────────────────────────────────────────────────────

interface AuctionData {
  id: string;
  code: string;
  title: string;
  saleType: "Evening" | "Day" | "Online";
  startDate: string;
  endDate: string;
  location: string;
  lots: LotData[];
}

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

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });
}

function formatEstimate(low?: number, high?: number) {
  if (!low && !high) return null;
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n);
  if (low && high) return `${fmt(low)} – ${fmt(high)}`;
  return fmt(low ?? high!);
}

const SALE_TYPE_STYLES: Record<string, string> = {
  Evening: "bg-[#1a1a2e] text-white",
  Day: "bg-[#f5ede0] text-[#5c3d1e]",
  Online: "bg-[#e8f5e9] text-[#1b5e20]",
};

// ── Component ──────────────────────────────────────────────────────────────

interface Props {
  auctionId: string;
  locale: string;
  ctfEntry: IAuction | null;
  relatedAuctions: IAuction[];
  isPreview: boolean;
}

export default function AuctionPageClient({ auctionId, locale, ctfEntry, relatedAuctions, isPreview }: Props) {
  const liveEntry = useContentfulLiveUpdates(ctfEntry);
  const entry = liveEntry ?? ctfEntry;
  const inspectorProps = useContentfulInspectorMode(entry ? { entryId: entry.sys.id } : undefined);

  const [auction, setAuction] = useState<AuctionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/integrations/auctions/${auctionId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setAuction(d.auction);
        else setError(d.error ?? "Auction not found");
      })
      .catch(() => setError("Failed to load auction"))
      .finally(() => setLoading(false));
  }, [auctionId]);

  // Contentful overrides
  const snap = entry?.fields?.externalAuctionId as any;
  const title = entry?.fields?.overrideTitle ?? auction?.title ?? snap?.title ?? "";
  const summary = entry?.fields?.overrideSummary;
  const saleType = entry?.fields?.overrideSaleType ?? auction?.saleType ?? snap?.saleType;

  // Contentful images override the hero area
  const ctfImages = (entry?.fields?.images as any[]) ?? [];
  const heroImageUrl = ctfImages[0]?.fields?.file?.url
    ? `https:${ctfImages[0].fields.file.url}`
    : null;

  const rawTopSections = Array.isArray(entry?.fields?.topSections) ? entry!.fields.topSections as any[] : [];
  const rawBottomSections = Array.isArray(entry?.fields?.bottomSections) ? entry!.fields.bottomSections as any[] : [];

  // Wrap sections in a fake landing page entry so ContentfulLandingPage can
  // handle live updates and inspector mode for each linked section entry.
  const topLanding = entry && rawTopSections.length > 0
    ? { ...entry, fields: { internalName: entry.fields.internalName, title: "", slug: "", sections: rawTopSections } } as any
    : null;
  const bottomLanding = entry && rawBottomSections.length > 0
    ? { ...entry, fields: { internalName: entry.fields.internalName, title: "", slug: "", sections: rawBottomSections } } as any
    : null;

  const localePath = locale === "en-US" ? "" : `/${locale}`;

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#9b1b30] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !auction) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-muted-foreground">{error ?? "Auction not found"}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* ── Top sections (editorial, above header) ── */}
      {topLanding && <ContentfulLandingPage entry={topLanding} />}

      {/* ── Header ── */}
      <div className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-widest mb-6">
            <Link href={`${localePath}/`} className="hover:text-foreground transition-colors">Home</Link>
            <span>/</span>
            <span>Auctions</span>
            <span>/</span>
            <span className="text-foreground">{auction.code}</span>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex-1">
              {/* Sale type + location */}
              <div className="flex flex-wrap items-center gap-3 mb-3">
                {saleType && (
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider ${SALE_TYPE_STYLES[saleType] ?? "bg-muted"}`}>
                    {saleType} Sale
                  </span>
                )}
                <span className="text-sm text-muted-foreground">📍 {auction.location}</span>
                <span className="text-sm text-muted-foreground font-mono">{auction.code}</span>
              </div>

              <h1
                {...(inspectorProps ? inspectorProps({ fieldId: "overrideTitle" }) : {})}
                className="text-3xl md:text-4xl font-serif font-medium tracking-tight text-foreground mb-3 leading-tight"
              >
                {title}
              </h1>

              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground mb-4">
                <span>📅 {formatDate(auction.startDate)}{auction.startDate !== auction.endDate ? ` – ${formatDate(auction.endDate)}` : ""}</span>
                <span>🖼 {auction.lots.length} lots</span>
              </div>

              {summary && (
                <p
                  {...(inspectorProps ? inspectorProps({ fieldId: "overrideSummary" }) : {})}
                  className="text-base text-muted-foreground max-w-2xl leading-relaxed"
                >
                  {summary}
                </p>
              )}
            </div>

            {/* Hero image from Contentful */}
            {heroImageUrl && (
              <div
                {...(inspectorProps ? inspectorProps({ fieldId: "images" }) : {})}
                className="lg:w-80 xl:w-96 shrink-0"
              >
                <div className="aspect-[4/3] rounded-xl overflow-hidden bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={heroImageUrl} alt={title} className="w-full h-full object-cover" />
                </div>
              </div>
            )}
          </div>

          {/* Extra Contentful images gallery */}
          {ctfImages.length > 1 && (
            <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
              {ctfImages.slice(1).map((img: any, i: number) => {
                const url = img?.fields?.file?.url ? `https:${img.fields.file.url}` : null;
                if (!url) return null;
                return (
                  <div key={i} className="shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-muted border border-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Lots grid ── */}
      <div className="max-w-7xl mx-auto px-4 py-10">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-6">
          {auction.lots.length} Lots
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {auction.lots.map((lot) => (
            <Link
              key={lot.id}
              href={`${localePath}/auctions/${auctionId}/lot/${lot.lotNumber}`}
              className="group block"
            >
              {/* Image */}
              <div className="aspect-square bg-muted rounded-sm overflow-hidden mb-3 border border-border group-hover:border-[#9b1b30]/40 transition-colors">
                {lot.heroImageUrl && !lot.heroImageUrl.includes("example.com") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={lot.heroImageUrl}
                    alt={lot.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-4xl text-muted-foreground/30">🖼</span>
                  </div>
                )}
              </div>

              {/* Meta */}
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                Lot {lot.lotNumber}
              </div>
              <div className="text-sm font-medium text-foreground leading-snug mb-0.5 line-clamp-2 group-hover:text-[#9b1b30] transition-colors">
                {lot.title}
              </div>
              <div className="text-xs text-muted-foreground italic">
                {lot.artist}{lot.year ? `, ${lot.year}` : ""}
              </div>
              {formatEstimate(lot.estimateLowGBP, lot.estimateHighGBP) && (
                <div className="text-xs text-muted-foreground mt-1">
                  Est. {formatEstimate(lot.estimateLowGBP, lot.estimateHighGBP)}
                </div>
              )}
            </Link>
          ))}
        </div>
      </div>

      {/* ── Bottom sections (editorial, below lots) ── */}
      {bottomLanding && <ContentfulLandingPage entry={bottomLanding} />}

      {/* ── Related auctions (taxonomy-driven) ── */}
      {relatedAuctions.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 pb-16">
          <div className="border-t border-border pt-10">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-6">
              You may also be interested in
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {relatedAuctions.map((rel) => {
                const snap = rel.fields.externalAuctionId as any;
                const relId = snap?.externalAuctionId;
                const relTitle = rel.fields.overrideTitle ?? snap?.title ?? "";
                const relSaleType = rel.fields.overrideSaleType ?? snap?.saleType;
                const relStart = snap?.startDate;
                const relLocation = snap?.location;
                if (!relId) return null;
                return (
                  <Link
                    key={rel.sys.id}
                    href={`${localePath}/auctions/${relId}`}
                    className="group border border-border rounded-lg p-4 hover:border-[#9b1b30]/40 transition-colors"
                  >
                    {relSaleType && (
                      <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider mb-2 ${SALE_TYPE_STYLES[relSaleType] ?? "bg-muted"}`}>
                        {relSaleType} Sale
                      </span>
                    )}
                    <div className="text-sm font-medium leading-snug group-hover:text-[#9b1b30] transition-colors mb-1">
                      {relTitle}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {relLocation && <span>📍 {relLocation}</span>}
                      {relStart && <span className="ml-3">📅 {formatDate(relStart)}</span>}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
