"use client";

import React, { useCallback, useEffect, useState } from "react";
import { locations } from "@contentful/app-sdk";
import type { FieldAppSDK, DialogAppSDK } from "@contentful/app-sdk";
import { useSDK } from "@contentful/react-apps-toolkit";
import styles from "./auction-picker-field.module.css";

// ─── Types ────────────────────────────────────────────────────────────────────

type Mode = "auction" | "lot";

interface AuctionSummary {
  id: string;
  code: string;
  title: string;
  saleType: "Evening" | "Day" | "Online";
  startDate: string;
  endDate: string;
  location: string;
  lotCount: number;
}

interface Lot {
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

interface AuctionFieldValue {
  externalAuctionId: string;
  title: string;
  saleType: "Evening" | "Day" | "Online";
  startDate: string;
  endDate: string;
  location: string;
  lotCount: number;
}

interface LotFieldValue {
  externalLotId: string;
  title: string;
  artist: string;
  year?: number;
  lotNumber: number;
  auctionId: string;
  estimateLowGBP?: number;
  estimateHighGBP?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function formatEstimate(low?: number, high?: number) {
  if (!low && !high) return null;
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n);
  if (low && high) return `Est. ${fmt(low)} – ${fmt(high)}`;
  return `Est. ${fmt(low ?? high!)}`;
}

function saleTypeBadgeClass(type: string) {
  if (type === "Evening") return styles.badgeEvening;
  if (type === "Day") return styles.badgeDay;
  return styles.badgeOnline;
}

function autoSetInternalName(fieldSdk: FieldAppSDK | null, label: string) {
  const internalNameField = (fieldSdk as any)?.entry?.fields?.internalName;
  if (internalNameField) {
    internalNameField.setValue(label).catch(console.error);
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AuctionPickerField() {
  const sdk = useSDK<FieldAppSDK | DialogAppSDK>();
  const isDialog = sdk.location.is(locations.LOCATION_DIALOG);
  const fieldSdk = isDialog ? null : (sdk as FieldAppSDK);

  // Resolve mode from instance parameters (field) or invocation parameters (dialog)
  const instanceMode: Mode = isDialog
    ? ((sdk as DialogAppSDK).parameters?.invocation as any)?.mode ?? "auction"
    : ((sdk as FieldAppSDK).parameters?.instance as any)?.mode ?? "auction";
  const isLotMode = instanceMode === "lot";

  // Symbol fields store only the ID string; Object fields store the full snapshot
  const fieldType = (fieldSdk as FieldAppSDK | null)?.field?.type as string | undefined;
  const isSymbolField = fieldType === "Symbol";

  // ── Auction mode state ────────────────────────────────────────────────────
  const [auctionValue, setAuctionValue] = useState<AuctionFieldValue | null>(() => {
    if (isDialog || isLotMode) return null;
    const raw = fieldSdk?.field?.getValue();
    return raw && typeof raw === "object" ? (raw as AuctionFieldValue) : null;
  });
  const [lots, setLots] = useState<Lot[]>([]);
  const [lotsLoading, setLotsLoading] = useState(false);

  // ── Lot mode state ────────────────────────────────────────────────────────
  // Symbol field: raw value is a plain ID string; Object field: full snapshot
  const [lotValue, setLotValue] = useState<LotFieldValue | null>(() => {
    if (isDialog || !isLotMode) return null;
    const raw = fieldSdk?.field?.getValue();
    if (!raw) return null;
    if (typeof raw === "string") {
      // Symbol field — only the ID is stored; full data fetched separately
      return { externalLotId: raw, title: "", artist: "", lotNumber: 0, auctionId: "" };
    }
    return typeof raw === "object" ? (raw as LotFieldValue) : null;
  });

  // ── Shared dialog / list state ────────────────────────────────────────────
  const [auctions, setAuctions] = useState<AuctionSummary[]>([]);
  const [allLots, setAllLots] = useState<Lot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    sdk.window.startAutoResizer();
  }, [sdk]);

  // Hydrate lot display data when only an ID string was loaded from a Symbol field
  useEffect(() => {
    if (!isLotMode || !lotValue?.externalLotId || lotValue.title) return;
    fetch(`/api/integrations/lots/${lotValue.externalLotId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          const l = data.lot as Lot;
          setLotValue({
            externalLotId: l.id,
            title: l.title,
            artist: l.artist,
            year: l.year,
            lotNumber: l.lotNumber,
            auctionId: l.auctionId,
            estimateLowGBP: l.estimateLowGBP,
            estimateHighGBP: l.estimateHighGBP,
          });
        }
      })
      .catch(() => {});
  }, [isLotMode, lotValue?.externalLotId, lotValue?.title]);

  // Fetch lots preview when an auction is selected in auction mode
  useEffect(() => {
    if (!auctionValue?.externalAuctionId) { setLots([]); return; }
    setLotsLoading(true);
    fetch(`/api/integrations/auctions/${auctionValue.externalAuctionId}`)
      .then((r) => r.json())
      .then((data) => { if (data.success) setLots(data.auction.lots ?? []); })
      .catch(() => {})
      .finally(() => setLotsLoading(false));
  }, [auctionValue?.externalAuctionId]);

  // Load data for the dialog
  useEffect(() => {
    if (!isDialog) return;
    const dialogMode: Mode = ((sdk as DialogAppSDK).parameters?.invocation as any)?.mode ?? "auction";
    setLoading(true);

    if (dialogMode === "lot") {
      // Load all auctions, then flatten their lots
      fetch("/api/integrations/auctions")
        .then((r) => r.json())
        .then(async (data) => {
          if (!data.success) { setError(data.error ?? "Failed to load auctions"); return; }
          const expanded = await Promise.all(
            (data.auctions as AuctionSummary[]).map((a) =>
              fetch(`/api/integrations/auctions/${a.id}`)
                .then((r) => r.json())
                .then((d) => (d.success ? (d.auction.lots as Lot[]) : []))
                .catch(() => [] as Lot[])
            )
          );
          const flat = expanded.flat();
          setAllLots(flat);
          const params = (sdk as DialogAppSDK).parameters?.invocation as any;
          if (params?.currentId) setSelectedId(params.currentId);
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    } else {
      fetch("/api/integrations/auctions")
        .then((r) => r.json())
        .then((data) => {
          if (data.success) {
            setAuctions(data.auctions);
            const params = (sdk as DialogAppSDK).parameters?.invocation as any;
            if (params?.currentId) setSelectedId(params.currentId);
          } else {
            setError(data.error ?? "Failed to load auctions");
          }
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }
  }, [isDialog]);

  // ── Persist helpers ───────────────────────────────────────────────────────

  const persistAuction = useCallback((auction: AuctionSummary) => {
    const next: AuctionFieldValue = {
      externalAuctionId: auction.id,
      title: auction.title,
      saleType: auction.saleType,
      startDate: auction.startDate,
      endDate: auction.endDate,
      location: auction.location,
      lotCount: auction.lotCount,
    };
    setAuctionValue(next);
    fieldSdk?.field?.setValue(next).catch(console.error);
    autoSetInternalName(fieldSdk, `Auction — ${auction.title}`);
  }, [fieldSdk]);

  const persistLot = useCallback((lot: Lot) => {
    const next: LotFieldValue = {
      externalLotId: lot.id,
      title: lot.title,
      artist: lot.artist,
      year: lot.year,
      lotNumber: lot.lotNumber,
      auctionId: lot.auctionId,
      estimateLowGBP: lot.estimateLowGBP,
      estimateHighGBP: lot.estimateHighGBP,
    };
    setLotValue(next);
    // Symbol field → persist only the ID string; Object field → full snapshot
    const persistedValue = isSymbolField ? lot.id : next;
    fieldSdk?.field?.setValue(persistedValue).catch(console.error);
    autoSetInternalName(fieldSdk, `Lot ${lot.lotNumber} — ${lot.title} (${lot.artist})`);
  }, [fieldSdk, isSymbolField]);

  const handleRemove = useCallback(() => {
    setAuctionValue(null);
    setLotValue(null);
    setLots([]);
    fieldSdk?.field?.removeValue().catch(console.error);
  }, [fieldSdk]);

  const handleOpenDialog = useCallback(async () => {
    const currentId = isLotMode
      ? (lotValue?.externalLotId ?? null)
      : (auctionValue?.externalAuctionId ?? null);

    const result = await sdk.dialogs.openCurrentApp({
      title: isLotMode ? "Select Lot" : "Select Auction",
      width: 900,
      minHeight: 600,
      shouldCloseOnOverlayClick: true,
      shouldCloseOnEscapePress: true,
      parameters: { mode: instanceMode, currentId },
    });

    if (!result) return;
    if ((result as any).auction) persistAuction((result as any).auction);
    if ((result as any).lot) persistLot((result as any).lot);
  }, [sdk, instanceMode, isLotMode, lotValue, auctionValue, persistAuction, persistLot]);

  const handleDialogConfirm = useCallback(() => {
    if (!selectedId) return;
    const dialogMode: Mode = ((sdk as DialogAppSDK).parameters?.invocation as any)?.mode ?? "auction";
    if (dialogMode === "lot") {
      const lot = allLots.find((l) => l.id === selectedId);
      if (lot) (sdk as any).close({ lot });
    } else {
      const auction = auctions.find((a) => a.id === selectedId);
      if (auction) (sdk as any).close({ auction });
    }
  }, [sdk, selectedId, auctions, allLots]);

  const handleDialogCancel = useCallback(() => {
    (sdk as any).close(null);
  }, [sdk]);

  // ── Dialog UI ─────────────────────────────────────────────────────────────

  if (isDialog) {
    const dialogMode: Mode = ((sdk as DialogAppSDK).parameters?.invocation as any)?.mode ?? "auction";
    const isLotDialog = dialogMode === "lot";

    const filteredAuctions = auctions.filter((a) =>
      !search ||
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.code.toLowerCase().includes(search.toLowerCase()) ||
      a.location.toLowerCase().includes(search.toLowerCase())
    );

    const filteredLots = allLots.filter((l) =>
      !search ||
      l.title.toLowerCase().includes(search.toLowerCase()) ||
      l.artist.toLowerCase().includes(search.toLowerCase()) ||
      String(l.lotNumber).includes(search)
    );

    return (
      <div className={styles.dialogContainer}>
        <div className={styles.searchRow}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder={isLotDialog ? "Search by title, artist or lot number…" : "Search by title, code or location…"}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading && <div className={styles.loadingState}><div className={styles.spinner} />{isLotDialog ? "Loading lots…" : "Loading auctions…"}</div>}
        {error && <div className={styles.errorState}><div className={styles.errorTitle}>⚠️ Error</div><div className={styles.errorMessage}>{error}</div></div>}

        {!loading && !error && (
          <div className={styles.auctionList}>
            {isLotDialog ? (
              filteredLots.length === 0
                ? <div className={styles.noResults}>No lots match your search.</div>
                : filteredLots.map((l) => (
                  <div
                    key={l.id}
                    className={`${styles.auctionRow} ${selectedId === l.id ? styles.auctionRowSelected : ""}`}
                    onClick={() => setSelectedId(l.id)}
                  >
                    <div className={styles.auctionRowIcon}>🖼</div>
                    <div className={styles.auctionRowInfo}>
                      <div className={styles.auctionRowTitle}>Lot {l.lotNumber} — {l.title}</div>
                      <div className={styles.auctionRowMeta}>
                        <span style={{ fontStyle: "italic" }}>{l.artist}{l.year ? `, ${l.year}` : ""}</span>
                        {formatEstimate(l.estimateLowGBP, l.estimateHighGBP) && (
                          <span style={{ color: "#7b1c2e", fontWeight: 600 }}>{formatEstimate(l.estimateLowGBP, l.estimateHighGBP)}</span>
                        )}
                        <span style={{ fontFamily: "monospace", fontSize: 11, color: "#aaa" }}>{l.id}</span>
                      </div>
                    </div>
                    {selectedId === l.id && <div className={styles.checkmark}>✓</div>}
                  </div>
                ))
            ) : (
              filteredAuctions.length === 0
                ? <div className={styles.noResults}>No auctions match your search.</div>
                : filteredAuctions.map((a) => (
                  <div
                    key={a.id}
                    className={`${styles.auctionRow} ${selectedId === a.id ? styles.auctionRowSelected : ""}`}
                    onClick={() => setSelectedId(a.id)}
                  >
                    <div className={styles.auctionRowIcon}>🎨</div>
                    <div className={styles.auctionRowInfo}>
                      <div className={styles.auctionRowTitle}>{a.title}</div>
                      <div className={styles.auctionRowMeta}>
                        <span className={`${styles.badge} ${saleTypeBadgeClass(a.saleType)}`}>{a.saleType}</span>
                        <span>📍 {a.location}</span>
                        <span>📅 {formatDate(a.startDate)}</span>
                        <span>🖼 {a.lotCount} lots</span>
                        <span style={{ fontFamily: "monospace", fontSize: 11 }}>{a.code}</span>
                      </div>
                    </div>
                    {selectedId === a.id && <div className={styles.checkmark}>✓</div>}
                  </div>
                ))
            )}
          </div>
        )}

        <div className={styles.dialogFooter}>
          <button className={styles.cancelButton} onClick={handleDialogCancel}>Cancel</button>
          <button className={styles.saveButton} disabled={!selectedId} onClick={handleDialogConfirm}>
            {isLotDialog ? "Select Lot" : "Select Auction"}
          </button>
        </div>
      </div>
    );
  }

  // ── Field UI — Lot mode ───────────────────────────────────────────────────

  if (isLotMode) {
    if (!lotValue) {
      return (
        <div className={styles.container}>
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🖼</div>
            <div className={styles.emptyTitle}>No lot linked</div>
            <div className={styles.emptyText}>
              Link a lot from the external system to embed it with its artist, estimate and lot number.
            </div>
            <button className={styles.selectButton} onClick={handleOpenDialog}>Select lot</button>
          </div>
        </div>
      );
    }

    return (
      <div className={styles.container}>
        <div className={styles.selectedCard}>
          <div className={styles.selectedCardIcon}>🖼</div>
          <div className={styles.selectedCardInfo}>
            <div className={styles.selectedCardTitle}>Lot {lotValue.lotNumber} — {lotValue.title}</div>
            <div className={styles.selectedCardMeta}>
              <span style={{ fontStyle: "italic" }}>{lotValue.artist}{lotValue.year ? `, ${lotValue.year}` : ""}</span>
              {formatEstimate(lotValue.estimateLowGBP, lotValue.estimateHighGBP) && (
                <span style={{ color: "#7b1c2e", fontWeight: 600 }}>{formatEstimate(lotValue.estimateLowGBP, lotValue.estimateHighGBP)}</span>
              )}
            </div>
            <div style={{ marginTop: 4, fontSize: 11, fontFamily: "monospace", color: "#aaa" }}>
              {lotValue.externalLotId}
            </div>
          </div>
          <div className={styles.selectedCardActions}>
            <button className={styles.changeButton} onClick={handleOpenDialog}>Change</button>
            <button className={styles.removeButton} onClick={handleRemove}>Remove</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Field UI — Auction mode (empty) ───────────────────────────────────────

  if (!auctionValue) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🎨</div>
          <div className={styles.emptyTitle}>No auction linked</div>
          <div className={styles.emptyText}>
            Link an auction from the external system to surface its date, sale type and lot count automatically.
          </div>
          <button className={styles.selectButton} onClick={handleOpenDialog}>Select auction</button>
        </div>
      </div>
    );
  }

  // ── Field UI — Auction mode (selected) ────────────────────────────────────

  return (
    <div className={styles.container}>
      <div className={styles.selectedCard}>
        <div className={styles.selectedCardIcon}>🎨</div>
        <div className={styles.selectedCardInfo}>
          <div className={styles.selectedCardTitle}>{auctionValue.title}</div>
          <div className={styles.selectedCardMeta}>
            <span className={`${styles.badge} ${saleTypeBadgeClass(auctionValue.saleType)}`}>{auctionValue.saleType}</span>
            <span>📍 {auctionValue.location}</span>
            <span>📅 {formatDate(auctionValue.startDate)} – {formatDate(auctionValue.endDate)}</span>
            <span>🖼 {auctionValue.lotCount} lots</span>
          </div>
          <div style={{ marginTop: 4, fontSize: 11, fontFamily: "monospace", color: "#aaa" }}>
            {auctionValue.externalAuctionId}
          </div>
        </div>
        <div className={styles.selectedCardActions}>
          <button className={styles.changeButton} onClick={handleOpenDialog}>Change</button>
          <button className={styles.removeButton} onClick={handleRemove}>Remove</button>
        </div>
      </div>

      {lotsLoading && <div className={styles.loadingState} style={{ padding: "16px 0" }}><div className={styles.spinner} /></div>}
      {!lotsLoading && lots.length > 0 && (
        <div className={styles.lotsSection}>
          <div className={styles.lotsSectionTitle}>{lots.length} lots in this auction</div>
          <div className={styles.lotsGrid}>
            {lots.map((lot) => (
              <div key={lot.id} className={styles.lotCard}>
                <div className={styles.lotNumber}>Lot {lot.lotNumber}</div>
                <div className={styles.lotTitle}>{lot.title}</div>
                <div className={styles.lotArtist}>{lot.artist}{lot.year ? `, ${lot.year}` : ""}</div>
                {formatEstimate(lot.estimateLowGBP, lot.estimateHighGBP) && (
                  <div className={styles.lotEstimate}>{formatEstimate(lot.estimateLowGBP, lot.estimateHighGBP)}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
