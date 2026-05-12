"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useContentfulLiveUpdates } from "@contentful/live-preview/react";
import type { ILotReference } from "../../type";

// ── Types ──────────────────────────────────────────────────────────────────

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

type BidState = "idle" | "confirming" | "submitted" | "won";

// ── Helpers ────────────────────────────────────────────────────────────────

function formatGBP(n: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency", currency: "GBP", maximumFractionDigits: 0,
  }).format(n);
}

function formatEstimate(low?: number, high?: number) {
  if (!low && !high) return null;
  if (low && high) return `${formatGBP(low)} – ${formatGBP(high)}`;
  return formatGBP(low ?? high!);
}

function startingBid(low?: number) {
  if (!low) return 10000;
  return Math.round(low * 0.6 / 1000) * 1000;
}

function nextIncrement(current: number) {
  if (current < 100000) return 5000;
  if (current < 500000) return 10000;
  if (current < 1000000) return 25000;
  return 50000;
}

// ── Component ──────────────────────────────────────────────────────────────

interface Props {
  auctionId: string;
  lotNumber: number;
  locale: string;
  ctfEntries: ILotReference[];
  conceptToLotIds: Record<string, string[]>;
  isPreview: boolean;
}

export default function LotPageClient({ auctionId, lotNumber, locale, ctfEntries, conceptToLotIds, isPreview }: Props) {
  const [lot, setLot] = useState<LotData | null>(null);
  const [allLots, setAllLots] = useState<LotData[]>([]);
  const [crossAuctionLots, setCrossAuctionLots] = useState<LotData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Bidding state
  const [currentBid, setCurrentBid] = useState(0);
  const [bidState, setBidState] = useState<BidState>("idle");
  const [selectedImage, setSelectedImage] = useState(0);

  const localePath = locale === "en-US" ? "" : `/${locale}`;

  useEffect(() => {
    fetch(`/api/integrations/auctions/${auctionId}`)
      .then((r) => r.json())
      .then(async (d) => {
        if (!d.success) { setError(d.error ?? "Not found"); return; }
        const lots: LotData[] = d.auction.lots;
        setAllLots(lots);
        const found = lots.find((l) => l.lotNumber === lotNumber);
        if (!found) { setError("Lot not found"); return; }
        setLot(found);
        setCurrentBid(startingBid(found.estimateLowGBP));

        // Fetch cross-auction related lots by concept
        const currentLotConceptIds = Object.entries(conceptToLotIds)
          .filter(([, ids]) => ids.includes(found.id))
          .map(([c]) => c);
        if (currentLotConceptIds.length === 0) return;

        const relatedIds = [...new Set(
          currentLotConceptIds.flatMap((c) => conceptToLotIds[c] ?? [])
        )].filter((id) => id !== found.id);

        // Separate into same-auction (already have data) and cross-auction
        const sameAuctionIds = new Set(lots.map((l) => l.id));
        const crossIds = relatedIds.filter((id) => !sameAuctionIds.has(id));

        if (crossIds.length === 0) return;

        const fetched = await Promise.all(
          crossIds.map((id) =>
            fetch(`/api/integrations/lots/${id}`)
              .then((r) => r.json())
              .then((r) => r.success ? r.lot as LotData : null)
              .catch(() => null)
          )
        );
        setCrossAuctionLots(fetched.filter((l): l is LotData => l !== null));
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, [auctionId, lotNumber, conceptToLotIds]);

  // Match Contentful entry by externalLotId
  const rawCtfEntry = lot
    ? ctfEntries.find((e) => e.fields.externalLotId === lot.id) ?? null
    : null;
  const ctfEntry = useContentfulLiveUpdates(rawCtfEntry);
  const entry = ctfEntry ?? rawCtfEntry;

  // Overrides from Contentful
  const displayTitle = entry?.fields?.promoTitle ?? lot?.title ?? "";
  const displayCopy = entry?.fields?.promoCopy;
  const isFeatured = entry?.fields?.featured;

  // Gallery: Contentful images take priority, then API heroImageUrl
  const ctfGallery: string[] = ((entry?.fields?.gallery as any[]) ?? [])
    .map((a: any) => a?.fields?.file?.url ? `https:${a.fields.file.url}` : null)
    .filter((u): u is string => Boolean(u));
  const apiImage = lot?.heroImageUrl && !lot.heroImageUrl.includes("example.com")
    ? [lot.heroImageUrl] : [];
  const gallery = ctfGallery.length > 0 ? ctfGallery : apiImage;

  // Other lots in the auction (for "Also in this sale")
  const otherLots = useMemo(
    () => allLots.filter((l) => l.lotNumber !== lotNumber).slice(0, 5),
    [allLots, lotNumber]
  );

  // Related works by taxonomy concept — same-auction + cross-auction lots
  const relatedLots = useMemo(() => {
    if (!lot) return [];
    const conceptIds = Object.entries(conceptToLotIds)
      .filter(([, ids]) => ids.includes(lot.id))
      .map(([conceptId]) => conceptId);
    if (conceptIds.length === 0) return [];
    const relatedIds = new Set([...new Set(
      conceptIds.flatMap((c) => conceptToLotIds[c] ?? [])
    )].filter((id) => id !== lot.id));
    const sameAuction = allLots.filter((l) => relatedIds.has(l.id));
    const crossAuction = crossAuctionLots.filter((l) => relatedIds.has(l.id));
    return [...sameAuction, ...crossAuction].slice(0, 6);
  }, [lot, allLots, crossAuctionLots, conceptToLotIds]);

  // Bidding
  const increment = nextIncrement(currentBid);
  const nextBid = currentBid + increment;

  function placeBid() {
    if (bidState === "idle") { setBidState("confirming"); return; }
    if (bidState === "confirming") {
      setBidState("submitted");
      setTimeout(() => setBidState("won"), 1500);
    }
  }

  function raiseBid() {
    setCurrentBid((prev) => prev + nextIncrement(prev));
    setBidState("idle");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#9b1b30] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !lot) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-muted-foreground">{error ?? "Lot not found"}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* ── Breadcrumb ── */}
      <div className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-widest">
            <Link href={`${localePath}/`} className="hover:text-foreground transition-colors">Home</Link>
            <span>/</span>
            <Link href={`${localePath}/auctions/${auctionId}`} className="hover:text-foreground transition-colors">
              Auction
            </Link>
            <span>/</span>
            <span className="text-foreground">Lot {lot.lotNumber}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid lg:grid-cols-[1fr_380px] gap-10 xl:gap-16">

          {/* ── Left: Image + Details ── */}
          <div>
            {/* Main image */}
            <div className="aspect-[4/3] bg-muted rounded-sm overflow-hidden mb-3 border border-border">
              {gallery.length > 0 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={gallery[selectedImage]}
                  alt={displayTitle}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-6xl text-muted-foreground/20">🖼</span>
                </div>
              )}
            </div>

            {/* Thumbnail strip */}
            {gallery.length > 1 && (
              <div className="flex gap-2 mb-6">
                {gallery.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`w-16 h-16 rounded border-2 overflow-hidden transition-colors ${
                      selectedImage === i ? "border-[#9b1b30]" : "border-border hover:border-muted-foreground"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Lot details */}
            <div className="border-t border-border pt-6">
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                Lot {lot.lotNumber}
              </div>
              {isFeatured && (
                <span className="inline-block text-xs font-semibold uppercase tracking-wider text-amber-700 bg-amber-100 rounded px-2 py-0.5 mb-3">
                  Featured
                </span>
              )}
              <h1 className="text-2xl md:text-3xl font-serif font-medium tracking-tight mb-2">
                {displayTitle}
              </h1>
              <p className="text-base text-muted-foreground italic mb-6">
                {lot.artist}{lot.year ? `, b. ${lot.year}` : ""}
              </p>

              {displayCopy && (
                <div className="prose prose-sm max-w-none text-muted-foreground border-t border-border pt-4 mb-6">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-foreground not-italic mb-2">Lot Essay</h3>
                  <p>{displayCopy}</p>
                </div>
              )}

              {/* Estimate */}
              {formatEstimate(lot.estimateLowGBP, lot.estimateHighGBP) && (
                <div className="border-t border-border pt-4">
                  <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Estimate</div>
                  <div className="text-lg font-medium">
                    {formatEstimate(lot.estimateLowGBP, lot.estimateHighGBP)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Right: Bidding panel ── */}
          <div className="lg:sticky lg:top-6 self-start">
            <div className="border border-border rounded-xl p-6 bg-white shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
                {bidState === "won" ? "Congratulations" : "Place a bid"}
              </div>

              {bidState === "won" ? (
                <div className="text-center py-6">
                  <div className="text-4xl mb-3">🎉</div>
                  <div className="text-lg font-serif font-medium mb-1">You've won this lot!</div>
                  <div className="text-2xl font-semibold text-[#9b1b30] mb-4">{formatGBP(currentBid)}</div>
                  <p className="text-sm text-muted-foreground mb-6">
                    A Christie's specialist will be in touch with payment and shipping details.
                  </p>
                  <Link
                    href={`${localePath}/auctions/${auctionId}`}
                    className="text-sm text-[#9b1b30] hover:underline"
                  >
                    ← Back to auction
                  </Link>
                </div>
              ) : (
                <>
                  {/* Current bid */}
                  <div className="mb-6">
                    <div className="text-xs text-muted-foreground mb-1">
                      {bidState === "confirming" ? "Your bid" : "Starting bid"}
                    </div>
                    <div className="text-3xl font-serif font-medium tracking-tight">
                      {formatGBP(bidState === "confirming" ? nextBid : currentBid)}
                    </div>
                    {formatEstimate(lot.estimateLowGBP, lot.estimateHighGBP) && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Est. {formatEstimate(lot.estimateLowGBP, lot.estimateHighGBP)}
                      </div>
                    )}
                  </div>

                  {/* Bid increment info */}
                  {bidState === "idle" && (
                    <div className="text-xs text-muted-foreground mb-4 bg-muted/50 rounded-lg px-3 py-2">
                      Next increment: {formatGBP(increment)}
                    </div>
                  )}

                  {bidState === "confirming" && (
                    <div className="text-sm text-muted-foreground mb-4 bg-[#9b1b30]/5 border border-[#9b1b30]/20 rounded-lg px-3 py-3">
                      Confirm your bid of{" "}
                      <span className="font-semibold text-[#9b1b30]">{formatGBP(nextBid)}</span>?
                    </div>
                  )}

                  {/* CTA buttons */}
                  <button
                    onClick={placeBid}
                    className="w-full py-3 px-4 rounded-lg font-semibold text-sm transition-colors bg-[#9b1b30] hover:bg-[#7b1424] text-white mb-3"
                  >
                    {bidState === "confirming" ? "Confirm Bid" : "Place Bid"}
                  </button>

                  {bidState === "confirming" && (
                    <button
                      onClick={() => setBidState("idle")}
                      className="w-full py-3 px-4 rounded-lg font-semibold text-sm border border-border hover:bg-muted transition-colors"
                    >
                      Cancel
                    </button>
                  )}

                  {bidState === "idle" && (
                    <button
                      onClick={raiseBid}
                      className="w-full py-2.5 px-4 rounded-lg text-sm border border-border hover:bg-muted transition-colors text-muted-foreground"
                    >
                      Raise starting bid to {formatGBP(currentBid + increment)}
                    </button>
                  )}

                  {/* Submitted loading */}
                  {bidState === "submitted" && (
                    <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
                      <div className="w-4 h-4 border-2 border-[#9b1b30] border-t-transparent rounded-full animate-spin" />
                      Processing…
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Lot navigation */}
            {allLots.length > 1 && (
              <div className="mt-4 flex justify-between text-sm">
                {(() => {
                  const idx = allLots.findIndex((l) => l.lotNumber === lotNumber);
                  const prev = allLots[idx - 1];
                  const next = allLots[idx + 1];
                  return (
                    <>
                      {prev ? (
                        <Link href={`${localePath}/auctions/${auctionId}/lot/${prev.lotNumber}`} className="text-[#9b1b30] hover:underline">
                          ← Lot {prev.lotNumber}
                        </Link>
                      ) : <span />}
                      {next ? (
                        <Link href={`${localePath}/auctions/${auctionId}/lot/${next.lotNumber}`} className="text-[#9b1b30] hover:underline">
                          Lot {next.lotNumber} →
                        </Link>
                      ) : <span />}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </div>

        {/* ── Also in this sale ── */}
        {otherLots.length > 0 && (
          <div className="mt-16 pt-10 border-t border-border">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Also in this sale
              </h2>
              <Link href={`${localePath}/auctions/${auctionId}`} className="text-xs text-[#9b1b30] hover:underline uppercase tracking-wider">
                View all lots
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {otherLots.map((l) => (
                <Link
                  key={l.id}
                  href={`${localePath}/auctions/${auctionId}/lot/${l.lotNumber}`}
                  className="group"
                >
                  <div className="aspect-square bg-muted rounded-sm overflow-hidden mb-2 border border-border group-hover:border-[#9b1b30]/40 transition-colors">
                    {l.heroImageUrl && !l.heroImageUrl.includes("example.com") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={l.heroImageUrl} alt={l.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-2xl text-muted-foreground/30">🖼</span>
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Lot {l.lotNumber}</div>
                  <div className="text-sm font-medium line-clamp-1 group-hover:text-[#9b1b30] transition-colors">{l.title}</div>
                  <div className="text-xs text-muted-foreground italic">{l.artist}</div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── You may also like (taxonomy-driven) ── */}
      {relatedLots.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 pb-16">
          <div className="border-t border-border pt-10">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-6">
              You may also like
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              {relatedLots.map((l) => (
                <Link
                  key={l.id}
                  href={`${localePath}/auctions/${l.auctionId}/lot/${l.lotNumber}`}
                  className="group"
                >
                  <div className="aspect-square bg-muted rounded-sm overflow-hidden mb-2 border border-border group-hover:border-[#9b1b30]/40 transition-colors">
                    {l.heroImageUrl && !l.heroImageUrl.includes("example.com") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={l.heroImageUrl} alt={l.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-2xl text-muted-foreground/30">🖼</span>
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Lot {l.lotNumber}</div>
                  <div className="text-sm font-medium line-clamp-1 group-hover:text-[#9b1b30] transition-colors">{l.title}</div>
                  <div className="text-xs text-muted-foreground italic">{l.artist}</div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
