"use client";

import React, { FC, useState } from "react";
import Link from "next/link";
import { useContentfulLiveUpdates } from "@contentful/live-preview/react";
import { sectionsComponentMap } from "../../component-maps/sections";
import type { IProductStory } from "../../type";
import {
  extractPrimaryProduct,
  extractAdditionalProducts,
  type StoryProductData,
} from "@/lib/product-story";
import { ProductStoryAddToCart } from "@/features/contentful/components/product-story/product-story-add-to-cart";
import { useMicrocopyHelper } from "@/hooks/use-microcopy";
import type { MicrocopyDataMap } from "@/lib/microcopy";

interface Props {
  entry: IProductStory;
  locale: string;
  microcopy?: MicrocopyDataMap | null;
}

export default function ProductStoryPage({ entry: published, locale, microcopy }: Props) {
  const entry = useContentfulLiveUpdates(published) || published;
  const t = useMicrocopyHelper(microcopy);

  const product = extractPrimaryProduct(entry.fields.primaryProduct);
  const additionalProducts = extractAdditionalProducts(
    entry.fields.additionalProducts
  );
  const heroEntry = (entry.fields as Record<string, unknown>).heroModule as
    | Record<string, unknown>
    | undefined;
  const sections = entry.fields.sections as unknown as Array<Record<string, unknown>> | undefined;
  const storyAngles = (entry.fields.storyAngle ?? []) as string[];

  // Build gallery images: primary product image + additional product images
  const galleryImages: string[] = [];
  if (product?.image) galleryImages.push(product.image);
  for (const p of additionalProducts) {
    if (p.image && !galleryImages.includes(p.image)) galleryImages.push(p.image);
  }

  return (
    <div className="min-h-screen">
      {/* ── Hero Section ── */}
      {heroEntry ? (
        <HeroFromEntry entry={heroEntry} />
      ) : product ? (
        <DefaultProductHero product={product} angles={storyAngles} />
      ) : null}

      

      {/* ── Primary Product + Add to Cart ── */}
      {product && (
        <section className="relative">
          <div className="max-w-7xl mx-auto px-4 py-16 md:py-24">
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">
              {/* Image Gallery */}
              <ProductGallery images={galleryImages} alt={product.title} />

              {/* Info + ATC */}
              <div className="flex flex-col space-y-6">
                <div>
                  {product.category && (
                    <span className="text-sm font-medium uppercase tracking-widest text-muted-foreground mb-2 block">
                      {product.category}
                    </span>
                  )}
                  <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-tight">
                    {product.title}
                  </h2>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    {product.price > 0 && (
                      <span className="text-3xl md:text-4xl font-bold text-primary">
                        &pound;{product.price.toFixed(2)}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-600 bg-green-50 dark:bg-green-950/30 px-3 py-1.5 rounded-full">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span {...t("product.inStock", "In Stock").inspectorProps}>
                        {t("product.inStock", "In Stock").value}
                      </span>
                    </span>
                  </div>
                  {product.sku && (
                    <p className="text-sm text-muted-foreground font-mono">
                      SKU: {product.sku}
                    </p>
                  )}
                </div>

                <ProductStoryAddToCart
                  productId={product.id}
                  productTitle={product.title}
                  productPrice={product.price}
                  productSku={product.sku}
                  microcopy={microcopy}
                />

                {/* Trust badges */}
                <div className="grid grid-cols-3 gap-4 py-6 border-t border-border/50">
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
          </div>
        </section>
      )}

      {/* ── Story Body Sections (reuses landing-page component map) ── */}
      {Array.isArray(sections) && sections.length > 0 && (
        <div className="w-full overflow-hidden max-w-7xl mx-auto">
          {sections.map((sectionEntry, index) => {
            const contentTypeId =
              (sectionEntry?.sys as Record<string, unknown>)?.contentType &&
              typeof (sectionEntry.sys as Record<string, unknown>).contentType === "object"
                ? ((sectionEntry.sys as Record<string, Record<string, unknown>>).contentType?.sys as Record<string, unknown>)?.id ??
                  ((sectionEntry.sys as Record<string, Record<string, unknown>>).contentType as Record<string, unknown>)?.id ??
                  null
                : null;

            const Component =
              contentTypeId && typeof contentTypeId === "string"
                ? (sectionsComponentMap as Record<string, FC<Record<string, unknown>>>)[contentTypeId]
                : undefined;

            if (!Component) {
              if (process.env.NODE_ENV === "development") {
                console.warn("[ProductStory] Unknown section type", { contentTypeId });
              }
              return null;
            }

            return (
              <Component
                key={(sectionEntry?.sys as Record<string, unknown>)?.id as string ?? `section-${index}`}
                {...sectionEntry}
              />
            );
          })}
        </div>
      )}

      {/* ── Cross-sell / Additional Products ── */}
      {additionalProducts.length > 0 && (
        <section className="py-16 md:py-24 bg-gradient-to-b from-muted/30 to-background">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-14">
              <h2
                className="text-3xl md:text-4xl font-bold tracking-tight mb-3"
                {...t("product.completeLook.title", "Complete the Look").inspectorProps}
              >
                {t("product.completeLook.title", "Complete the Look").value}
              </h2>
              <p
                className="text-lg text-muted-foreground max-w-2xl mx-auto"
                {...t("product.completeLook.description", "Pair it with these hand-picked products for the perfect combination.").inspectorProps}
              >
                {t("product.completeLook.description", "Pair it with these hand-picked products for the perfect combination.").value}
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {additionalProducts.map((p) => (
                <CrossSellCard key={p.id} product={p} locale={locale} viewDetailsLabel={t("product.viewDetails", "View Details").value} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Story Angles (tags) ── */}
      {storyAngles.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="flex flex-wrap gap-2">
            {storyAngles.map((angle) => (
              <span
                key={angle}
                className="px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium"
              >
                {angle}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────

function HeroFromEntry({ entry }: { entry: Record<string, unknown> }) {
  const contentTypeId =
    (entry?.sys as Record<string, unknown>)?.contentType &&
    typeof (entry.sys as Record<string, unknown>).contentType === "object"
      ? ((entry.sys as Record<string, Record<string, unknown>>).contentType?.sys as Record<string, unknown>)?.id ??
        null
      : null;

  if (!contentTypeId || typeof contentTypeId !== "string") return null;

  const Component = (sectionsComponentMap as Record<string, FC<Record<string, unknown>>>)[contentTypeId];
  if (!Component) return null;

  return <Component {...entry} />;
}

function DefaultProductHero({
  product,
  angles,
}: {
  product: StoryProductData;
  angles: string[];
}) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-primary/5">

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 -right-32 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
      </div>
      <div className="max-w-7xl mx-auto px-4 py-20 md:py-32 relative text-center">
        {angles.length > 0 && (
          <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-4">
            {angles.join(" · ")}
          </p>
        )}
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-[1.1]">
          The Story of{" "}
          <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            {product.title}
          </span>
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          Discover what makes this product special — from design philosophy to
          real-world performance.
        </p>
      </div>
    </section>
  );
}

function ProductGallery({ images, alt }: { images: string[]; alt: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const mainImage = images[activeIndex] ?? images[0];

  if (images.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[320px] md:min-h-[480px]">
        <div className="w-32 h-32 rounded-3xl bg-primary/10 flex items-center justify-center">
          <svg className="w-16 h-16 text-primary/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col-reverse lg:flex-row gap-4">
      {/* Thumbnails — below on mobile, left on desktop */}
      {images.length > 1 && (
        <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-y-auto lg:max-h-[540px] pb-1 lg:pb-0 lg:pr-1">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIndex(idx)}
              className={`flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                idx === activeIndex
                  ? "border-primary ring-1 ring-primary/30"
                  : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt={`${alt} ${idx + 1}`} className="w-full h-full object-contain p-1" />
            </button>
          ))}
        </div>
      )}
      {/* Main image — no card, just the product with a soft shadow */}
      <div className="flex-1 flex items-start justify-center group">
        {mainImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mainImage}
            alt={alt}
            className="max-w-full w-auto h-auto object-contain transition-transform duration-700 group-hover:scale-[1.03]"
            style={{ maxHeight: "540px", filter: "drop-shadow(0 10px 30px rgba(0,0,0,0.08))" }}
          />
        ) : null}
      </div>
    </div>
  );
}

function TrustBadge({ label, d }: { label: { value: string; inspectorProps: Record<string, unknown> }; d: string }) {
  return (
    <div className="flex flex-col items-center text-center gap-2">
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
        <svg
          className="w-5 h-5 text-primary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d={d}
          />
        </svg>
      </div>
      <span className="text-xs font-medium" {...label.inspectorProps}>{label.value}</span>
    </div>
  );
}

function CrossSellCard({
  product,
  locale,
  viewDetailsLabel,
}: {
  product: StoryProductData;
  locale: string;
  viewDetailsLabel: string;
}) {
  return (
    <Link
      href={`/${locale}/products/${product.id}`}
      className="group block"
    >
      <article className="h-full bg-card rounded-2xl overflow-hidden border border-border/50 shadow-sm hover:shadow-xl hover:border-border transition-all duration-300 hover:-translate-y-1">
        <div className="aspect-square overflow-hidden bg-gradient-to-br from-muted/50 to-muted relative">
          {product.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image}
              alt={product.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
              <svg
                className="w-12 h-12 text-primary/30"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
            </div>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 px-4 py-2 rounded-full bg-background/90 backdrop-blur-sm text-sm font-medium shadow-lg">
              {viewDetailsLabel}
            </span>
          </div>
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-sm md:text-base line-clamp-2 group-hover:text-primary transition-colors leading-snug mb-2">
            {product.title}
          </h3>
          {product.price > 0 && (
            <p className="text-lg font-bold text-primary">
              &pound;{product.price.toFixed(2)}
            </p>
          )}
        </div>
      </article>
    </Link>
  );
}
