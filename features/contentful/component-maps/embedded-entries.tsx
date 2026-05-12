"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import CtaWrapper from "../components/cta/cta-wrapper";
import CodeSnippet from "../components/code-snippet/code-snippet";
import PersonWrapper from "../components/person/person-wrapper";
import PaymentMethodsBlock from "../components/payment-methods/payment-methods-block";
import MarketContentBlock from "../components/market-content-block/market-content-block";
import ProductCatalogSection from "../components/product-catalog/product-catalog-section";
import ProductCategoryShelf from "../components/product-catalog/product-category-shelf";

function PexelsImageBlock({ entry }: { entry: any }) {
  const pexels = entry?.fields?.pexelsImage;
  if (!pexels) return null;

  const src =
    pexels.src?.landscape ||
    pexels.src?.large2x ||
    pexels.src?.large ||
    pexels.src?.original;
  const alt = pexels.alt || "Image";
  const attribution = pexels.attribution?.text;
  const radius = entry?.fields?.radius;

  const radiusClass =
    radius === "Small"
      ? "rounded"
      : radius === "Medium"
        ? "rounded-lg"
        : radius === "Large"
          ? "rounded-2xl"
          : radius === "Full"
            ? "rounded-full"
            : "";

  return (
    <figure className="my-8">
      <img
        src={src}
        alt={alt}
        className={`w-full object-cover ${radiusClass}`}
        loading="lazy"
      />
      {attribution && (
        <figcaption className="text-xs text-center text-muted-foreground mt-2">
          {attribution}
        </figcaption>
      )}
    </figure>
  );
}

const AUCTION_PLACEHOLDER = "https://images.ctfassets.net/ace0ba6p9v98/2I5435KOFgkzr6W9eFhWqq/a1922532112ce04e62d6a0b8830e65a2/auction.png";

function LotReferenceBlock({ entry, locale }: { entry: any; locale: string }) {
  const externalLotId = entry?.fields?.externalLotId as string | undefined;
  const ctfLabel = entry?.fields?.label as string | undefined;
  const ctfPromoTitle = entry?.fields?.promoTitle as string | undefined;
  const ctfPromoCopy = entry?.fields?.promoCopy as string | undefined;
  const ctfGallery = Array.isArray(entry?.fields?.gallery) ? entry.fields.gallery as any[] : [];

  const [lot, setLot] = useState<any>(null);

  useEffect(() => {
    if (!externalLotId) return;
    fetch(`/api/integrations/lots/${externalLotId}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setLot(d.lot); })
      .catch(() => {});
  }, [externalLotId]);

  if (!externalLotId) return null;

  const title = ctfPromoTitle ?? lot?.title ?? "";
  const artist = lot?.artist;
  const year = lot?.year;
  const estimate =
    lot?.estimateLowGBP || lot?.estimateHighGBP
      ? (() => {
          const fmt = (n: number) =>
            new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n);
          return lot.estimateLowGBP && lot.estimateHighGBP
            ? `${fmt(lot.estimateLowGBP)} – ${fmt(lot.estimateHighGBP)}`
            : fmt(lot.estimateLowGBP ?? lot.estimateHighGBP);
        })()
      : null;

  // Image: first Contentful gallery image, then API hero image, then placeholder
  const ctfImageUrl = ctfGallery[0]?.fields?.file?.url
    ? `https:${ctfGallery[0].fields.file.url}`
    : undefined;
  const imageUrl =
    ctfImageUrl ??
    (lot?.heroImageUrl && !lot.heroImageUrl.includes("example.com") ? lot.heroImageUrl : undefined) ??
    AUCTION_PLACEHOLDER;

  const localePath = locale === "en-US" ? "" : `/${locale}`;
  const href = lot?.auctionId && lot?.lotNumber
    ? `${localePath}/auctions/${lot.auctionId}/lot/${lot.lotNumber}`
    : undefined;

  const inner = (
    <div className="not-prose my-6 flex gap-4 rounded-xl border border-border bg-card overflow-hidden hover:border-[#9b1b30]/40 transition-colors group">
      {/* Image */}
      <div className="shrink-0 w-28 sm:w-36 aspect-square overflow-hidden bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
      </div>
      {/* Meta */}
      <div className="flex flex-col justify-center py-3 pr-4 min-w-0">
        {ctfLabel && (
          <span className="text-xs font-semibold uppercase tracking-widest text-[#9b1b30] mb-1">{ctfLabel}</span>
        )}
        {lot?.lotNumber && (
          <span className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Lot {lot.lotNumber}</span>
        )}
        {title && (
          <p className="font-serif text-base font-medium leading-snug line-clamp-2 group-hover:text-[#9b1b30] transition-colors mb-0.5">
            {title}
          </p>
        )}
        {(artist || year) && (
          <p className="text-xs text-muted-foreground italic">
            {artist}{year ? `, ${year}` : ""}
          </p>
        )}
        {estimate && (
          <p className="text-xs text-muted-foreground mt-1">Est. {estimate}</p>
        )}
        {ctfPromoCopy && (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{ctfPromoCopy}</p>
        )}
      </div>
    </div>
  );

  return href ? <Link href={href}>{inner}</Link> : inner;
}

export const embeddedEntryComponentMap = {
  cta: CtaWrapper,
  codeSnippet: CodeSnippet,
  person: PersonWrapper,
} as const;

const LOCALE_AWARE_BLOCK_TYPES: Record<
  string,
  React.ComponentType<{ entry: any; locale: string }>
> = {
  paymentMethodsSnippet: PaymentMethodsBlock,
  marketContentBlock: MarketContentBlock,
  productCatalog: ProductCatalogSection as unknown as React.ComponentType<{ entry: any; locale: string }>,
  productCategory: ProductCategoryShelf as unknown as React.ComponentType<{ entry: any; locale: string }>,
  pexelsImageWrapper: PexelsImageBlock as unknown as React.ComponentType<{ entry: any; locale: string }>,
  lotReference: LotReferenceBlock as unknown as React.ComponentType<{ entry: any; locale: string }>,
};

function inferContentTypeId(entry: any): string | undefined {
  const explicit = entry?.sys?.contentType?.sys?.id;
  if (explicit) return explicit;

  const fields = entry?.fields;
  if (!fields) return undefined;

  if ("commerceCategoryId" in fields) return "productCategory";
  if ("pexelsImage" in fields) return "pexelsImageWrapper";
  if ("products" in fields && "cta" in fields) return "productCatalog";
  if ("externalLotId" in fields) return "lotReference";
  return undefined;
}

export function renderEmbeddedEntry(
  entry: unknown,
  options?: { isInline?: boolean; locale?: string }
): React.ReactNode {
  const contentTypeId = inferContentTypeId(entry);

  if (!contentTypeId) return null;

  const LocaleBlock = LOCALE_AWARE_BLOCK_TYPES[contentTypeId];
  if (LocaleBlock && !options?.isInline) {
    return (
      <div className="not-prose w-full">
        <LocaleBlock entry={entry as any} locale={options?.locale ?? "en-US"} />
      </div>
    );
  }

  const Component =
    embeddedEntryComponentMap[
      contentTypeId as keyof typeof embeddedEntryComponentMap
    ];
  if (!Component) return null;

  return options?.isInline ? (
    <Component isInline={true} {...(entry as any)} />
  ) : (
    <Component {...(entry as any)} />
  );
}
