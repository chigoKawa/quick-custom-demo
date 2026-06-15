"use client";

import React, { FC, useMemo, useState } from "react";
import { useContentfulLiveUpdates } from "@contentful/live-preview/react";
import { sectionsComponentMap } from "../../component-maps/sections";
import type { IProductStory } from "../../type";
import { extractPrimaryProduct } from "@/lib/product-story";
import { ProductStoryAddToCart } from "@/features/contentful/components/product-story/product-story-add-to-cart";
import { useMicrocopyHelper } from "@/hooks/use-microcopy";
import type { MicrocopyDataMap } from "@/lib/microcopy";
import { extractContentfulAssetUrl } from "@/lib/utils";
import type { Asset } from "contentful";
import { documentToReactComponents } from "@contentful/rich-text-react-renderer";
import { useContentfulInspectorMode } from "@contentful/live-preview/react";
import { baseRichTextOptions } from "../../richtext";
import type { Document } from "@contentful/rich-text-types";
import {
  resolveFieldsForMarket,
  MARKET_OVERRIDE_FIELD_ID,
} from "@/lib/market-overrides";
import { useActiveMarket } from "@/lib/market-overrides/react";
import RelatedProductsSection from "./related-products-section";
import type { RelatedProductStory } from "@/lib/related-product-stories";

interface Props {
  entry: IProductStory;
  locale: string;
  microcopy?: MicrocopyDataMap | null;
  relatedProducts?: RelatedProductStory[];
}

export default function ProductStoryPage({ entry: published, locale, microcopy, relatedProducts = [] }: Props) {
  const entry = useContentfulLiveUpdates(published) || published;
  const t = useMicrocopyHelper(microcopy);
  const inspectorProps = useContentfulInspectorMode({ entryId: entry.sys.id });

  // Apply market overrides to the story's own fields. `productName` is the
  // primary candidate today (override-the-API-override pattern): the entry
  // can override the commerce API name globally, and the market override JSON
  // can override the entry-level override per market. Because both fields are
  // locale-scoped in Contentful and we already fetch with `locale`, this also
  // gives us per-language-per-market overrides for free.
  const marketCode = useActiveMarket();
  const resolvedFields = useMemo(() => {
    if (!entry?.fields) return entry?.fields;
    if (!marketCode) return entry.fields;
    return resolveFieldsForMarket(
      entry.fields,
      (entry.fields as Record<string, unknown>)[MARKET_OVERRIDE_FIELD_ID],
      marketCode
    );
  }, [entry?.fields, marketCode]) as IProductStory["fields"];

  const product = extractPrimaryProduct(resolvedFields.primaryProduct);
  // Resolve the displayed product name through the override chain:
  //   marketOverride.productName  >  entry.productName  >  product.title
  const productNameOverride =
    typeof resolvedFields.productName === "string" && resolvedFields.productName.length > 0
      ? resolvedFields.productName
      : null;
  const displayedProductTitle = productNameOverride ?? product?.title ?? "";

  const heroEntry = (resolvedFields as Record<string, unknown>).heroModule as
    | Record<string, unknown>
    | undefined;

  // Gallery: direct Asset links → extract URL + title as alt. Fall back to product image.
  const imageAssets = (resolvedFields.images ?? []) as unknown as Asset[];
  const galleryImages: { url: string; alt: string }[] = imageAssets
    .map((asset) => {
      const url = extractContentfulAssetUrl(asset);
      const alt = (asset?.fields?.title as string | undefined) ?? "";
      return url ? { url, alt } : null;
    })
    .filter((v): v is { url: string; alt: string } => v !== null);

  if (galleryImages.length === 0 && product?.image) {
    galleryImages.push({ url: product.image, alt: displayedProductTitle });
  }

  const topSections = (resolvedFields.topSections ?? []) as unknown as Array<Record<string, unknown>>;
  const bottomSections = (resolvedFields.bottomSections ?? []) as unknown as Array<Record<string, unknown>>;
  const storyAngles = (resolvedFields.storyAngle ?? []) as string[];

  return (
    <div className="min-h-screen bg-background">
      {/* ── Optional Hero ── */}
      {heroEntry && <SectionFromEntry entry={heroEntry} />}

      {/* ── Top Sections (above product panel) ── */}
      {topSections.length > 0 && (
        <div className="w-full">
          {topSections.map((s, i) => (
            <SectionFromEntry key={(s?.sys as Record<string, unknown>)?.id as string ?? `top-${i}`} entry={s} />
          ))}
        </div>
      )}

      {/* ── Main PDP Panel ── */}
      {product && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
          <div className="grid lg:grid-cols-[1fr_480px] xl:grid-cols-[1fr_520px] gap-8 lg:gap-16 items-start">

            {/* ── Left: Gallery ── */}
            <PDPGallery images={galleryImages} productTitle={displayedProductTitle} />

            {/* ── Right: Info + ATC ── */}
            <div className="flex flex-col gap-6 lg:sticky lg:top-24">
              {/* Category / Story angle badge */}
              {(product.category || storyAngles.length > 0) && (
                <div className="flex flex-wrap items-center gap-2">
                  {product.category && (
                    <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      {product.category}
                    </span>
                  )}
                  {product.category && storyAngles.length > 0 && (
                    <span className="text-muted-foreground/40">·</span>
                  )}
                  {storyAngles.map((angle) => (
                    <span
                      key={angle}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
                    >
                      {angle}
                    </span>
                  ))}
                </div>
              )}

              <div>
                <h1
                  className="text-3xl md:text-4xl font-bold tracking-tight leading-tight text-foreground"
                  {...inspectorProps({ fieldId: "productName" })}
                >
                  {displayedProductTitle}
                </h1>
              </div>

              {/* Price row */}
              <div className="flex items-center gap-3">
                {product.price > 0 && (
                  <span className="text-3xl font-bold text-foreground">
                    &pound;{product.price.toFixed(2)}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 px-3 py-1 rounded-full border border-emerald-200/60 dark:border-emerald-800/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span {...t("product.inStock", "In Stock").inspectorProps}>
                    {t("product.inStock", "In Stock").value}
                  </span>
                </span>
              </div>

              {product.sku && (
                <p className="text-xs text-muted-foreground font-mono tracking-wide -mt-2">
                  SKU: {product.sku}
                </p>
              )}

              {/* Rich-text description — overrides API product description when set */}
              {resolvedFields.description && (
                <div
                  className="prose prose-sm max-w-none text-muted-foreground [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-foreground [&_a]:text-primary [&_a]:underline-offset-2"
                  {...inspectorProps({ fieldId: "description" })}
                >
                  {documentToReactComponents(
                    resolvedFields.description as unknown as Document,
                    baseRichTextOptions
                  )}
                </div>
              )}

              {/* Divider */}
              <div className="h-px bg-border" />

              <ProductStoryAddToCart
                productId={product.id}
                productTitle={displayedProductTitle}
                productPrice={product.price}
                productSku={product.sku}
                microcopy={microcopy}
              />

              {/* Trust badges */}
              <div className="grid grid-cols-3 gap-3 pt-2">
                <TrustBadge
                  label={t("product.freeShipping", "Free Shipping")}
                  d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"
                />
                <TrustBadge
                  label={t("product.securePayment", "Secure Payment")}
                  d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                />
                <TrustBadge
                  label={t("product.easyReturns", "Easy Returns")}
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Bottom Sections (story content below product) ── */}
      {bottomSections.length > 0 && (
        <div className="w-full">
          {bottomSections.map((s, i) => (
            <SectionFromEntry key={(s?.sys as Record<string, unknown>)?.id as string ?? `bottom-${i}`} entry={s} />
          ))}
        </div>
      )}

      {/* ── Related products (shared taxonomy concepts) ── */}
      {relatedProducts.length > 0 && (
        <RelatedProductsSection products={relatedProducts} microcopy={microcopy} />
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────

function SectionFromEntry({ entry }: { entry: Record<string, unknown> }) {
  const contentTypeId =
    (entry?.sys as Record<string, unknown>)?.contentType &&
    typeof (entry.sys as Record<string, unknown>).contentType === "object"
      ? ((entry.sys as Record<string, Record<string, unknown>>).contentType?.sys as Record<string, unknown>)?.id ??
        ((entry.sys as Record<string, Record<string, unknown>>).contentType as Record<string, unknown>)?.id ??
        null
      : null;

  if (!contentTypeId || typeof contentTypeId !== "string") return null;
  const Component = (sectionsComponentMap as Record<string, FC<Record<string, unknown>>>)[contentTypeId];
  if (!Component) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[ProductStory] No component for contentType", contentTypeId);
    }
    return null;
  }
  return <Component {...entry} />;
}

function PDPGallery({
  images,
  productTitle,
}: {
  images: { url: string; alt: string }[];
  productTitle: string;
}) {
  const [active, setActive] = useState(0);
  const main = images[active];
  const hasThumbs = images.length > 1;

  if (images.length === 0) {
    return (
      <div className="aspect-square max-h-[600px] rounded-2xl bg-muted flex items-center justify-center">
        <svg className="w-16 h-16 text-muted-foreground/25" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="flex flex-col-reverse lg:flex-row gap-3 lg:gap-4">

      {/* ── Vertical thumbnail strip (desktop left / mobile bottom) ── */}
      {hasThumbs && (
        <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-y-auto lg:max-h-[600px] lg:w-[88px] shrink-0 pb-0.5 lg:pb-0">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              aria-label={`View image ${i + 1}`}
              className={`
                flex-shrink-0 w-[72px] h-[72px] lg:w-full lg:h-[80px] rounded-xl overflow-hidden border-2 transition-all duration-200 bg-muted
                ${i === active
                  ? "border-primary shadow-sm"
                  : "border-transparent opacity-55 hover:opacity-90 hover:border-border"}
              `}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${img.url}?w=160&h=160&fit=thumb&f=center`}
                alt={img.alt || `${productTitle} ${i + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* ── Main image ── */}
      <div className="flex-1 relative group rounded-2xl overflow-hidden bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={active}
          src={`${main.url}?w=1200&q=80`}
          alt={main.alt || productTitle}
          className="w-full aspect-square object-cover transition-opacity duration-300"
        />

        {/* Arrow navigation — only when no thumb strip (single image sequence on mobile) */}
        {hasThumbs && (
          <div className="absolute inset-0 flex items-center justify-between px-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <button
              onClick={() => setActive((p) => (p - 1 + images.length) % images.length)}
              className="pointer-events-auto w-8 h-8 rounded-full bg-background/85 backdrop-blur-sm border border-border/60 shadow flex items-center justify-center hover:bg-background transition-colors"
              aria-label="Previous"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <button
              onClick={() => setActive((p) => (p + 1) % images.length)}
              className="pointer-events-auto w-8 h-8 rounded-full bg-background/85 backdrop-blur-sm border border-border/60 shadow flex items-center justify-center hover:bg-background transition-colors"
              aria-label="Next"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
        )}

        {/* Image counter pill */}
        {hasThumbs && (
          <span className="absolute bottom-3 right-3 text-xs font-medium px-2 py-0.5 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 text-foreground/70">
            {active + 1} / {images.length}
          </span>
        )}
      </div>
    </div>
  );
}

function TrustBadge({
  label,
  d,
}: {
  label: { value: string; inspectorProps: Record<string, unknown> };
  d: string;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-1.5 p-3 rounded-xl bg-muted/50">
      <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={d} />
      </svg>
      <span className="text-[11px] font-medium leading-tight text-muted-foreground" {...label.inspectorProps}>
        {label.value}
      </span>
    </div>
  );
}
