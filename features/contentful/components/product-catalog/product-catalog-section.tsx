"use client";

import React, { useState, useEffect, useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Link from "next/link";
import { useContentfulInspectorMode } from "@contentful/live-preview/react";
import { cn } from "@/lib/utils";
import type { IProductCatalog } from "../../type";
import ActionButtonRender from "../hero-banner/action-button-render";
import { useTracking, type MetricEventName } from "@/features/tracking/use-tracking";
import { LongText } from "@/features/contentful/components/long-text";

interface ProductData {
  id: string;
  title: string;
  price: number;
  currency?: string;
  image?: string;
  sku?: string;
  category?: string;
}

function formatPrice(price: number, currency?: string): string {
  const c = (currency ?? "GBP").toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: c, minimumFractionDigits: 2 }).format(price);
  } catch {
    return `${c} ${price.toFixed(2)}`;
  }
}

interface ProductCatalogSectionProps {
  entry: IProductCatalog;
}

/**
 * ProductCatalogSection renders products from the JSON field.
 * - Single product: CTA-style side-by-side layout
 * - Multiple products: Clickable grid with prices
 */
export default function ProductCatalogSection({ entry }: ProductCatalogSectionProps) {
  const inspectorProps = useContentfulInspectorMode({ entryId: entry.sys.id });
  const { trackMetric } = useTracking();

  const title = entry.fields.title;
  const body = entry.fields.body;
  const metricEventName = (entry.fields as unknown as { metricEventName?: MetricEventName }).metricEventName;
  const listId = entry.sys.id; // Use entry ID as list identifier
  const productsData = entry.fields.products as {
    selectionMode?: "single" | "multiple" | "category";
    selectedProduct?: ProductData;
    selectedProducts?: ProductData[];
    selectedCategory?: { id: string; name: string; slug: string };
    categoryDisplayLimit?: number;
  } | null;
  const ctaButton = entry.fields.cta;

  const isCategory = productsData?.selectionMode === "category" && !!productsData.selectedCategory;

  // For category mode, start in loading state so the skeleton shows immediately.
  const [categoryProducts, setCategoryProducts] = useState<ProductData[]>([]);
  const [loadingCategory, setLoadingCategory] = useState(isCategory);

  useEffect(() => {
    if (!isCategory) return;
    setLoadingCategory(true);
    const limit = productsData?.categoryDisplayLimit ?? 10;
    fetch(`/api/integrations/products?category=${productsData!.selectedCategory!.id}&limit=${limit}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setCategoryProducts(
            data.products.map((p: any) => ({
              id: p.id,
              title: p.title,
              price: p.price,
              currency: p.currency,
              image: p.images?.[0],
              sku: p.sku,
              category: p.category,
            }))
          );
        }
      })
      .catch(() => {})
      .finally(() => setLoadingCategory(false));
  }, [isCategory, productsData?.selectedCategory?.id, productsData?.categoryDisplayLimit]);

  // Extract products from the JSON field
  const products: ProductData[] = isCategory ? categoryProducts : [];
  if (!isCategory && productsData) {
    if (productsData.selectionMode === "single" && productsData.selectedProduct) {
      products.push(productsData.selectedProduct);
    } else if (productsData.selectionMode === "multiple" && productsData.selectedProducts) {
      products.push(...productsData.selectedProducts);
    } else if (productsData.selectedProduct) {
      products.push(productsData.selectedProduct);
    } else if (productsData.selectedProducts) {
      products.push(...productsData.selectedProducts);
    }
  }

  if (loadingCategory) {
    return <ProductCatalogSkeleton title={title} body={body} inspectorProps={inspectorProps} />;
  }

  if (products.length === 0) {
    return null;
  }

  // Helper to check if price should be shown
  const shouldShowPrice = (price: number) => price > 0;

  // Single product: CTA-style layout
  if (products.length === 1) {
    const product = products[0];
    const showPrice = shouldShowPrice(product.price);
    
    return (
      <section className="relative overflow-hidden bg-gradient-to-br from-background via-background to-muted/20">
        {/* Background decorative elements */}
        
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-32 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 py-16 md:py-24 relative">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            {/* Product Image */}
            <div className="order-1 lg:order-1 relative group">
              
              <div className="aspect-square rounded-3xl overflow-hidden bg-gradient-to-br from-muted/50 to-muted shadow-2xl ring-1 ring-black/5">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.title}
                    className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                    <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <svg className="w-12 h-12 text-primary/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
              {/* Floating badge */}
              {product.category && (
                <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-background/90 backdrop-blur-sm text-xs font-medium shadow-lg ring-1 ring-black/5">
                  {product.category}
                </div>
              )}
            </div>

            {/* Text Section */}
            <div className="order-2 lg:order-2 space-y-6">
              <div>
                <h2
                  {...inspectorProps({ fieldId: "title" })}
                  className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text"
                >
                  {title}
                </h2>

                {body && (
                  <LongText
                    text={body}
                    inspectorProps={inspectorProps({ fieldId: "body" })}
                    className="text-lg text-muted-foreground max-w-lg leading-relaxed"
                  />
                )}
              </div>

              {/* Product Info Card */}
              <div className="p-6 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 shadow-sm space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-xl font-semibold leading-tight">{product.title}</h3>
                  {showPrice && (
                    <span className="shrink-0 text-2xl md:text-3xl font-bold text-primary">
                      {formatPrice(product.price, product.currency)}
                    </span>
                  )}
                </div>
                {product.sku && (
                  <p className="text-sm text-muted-foreground font-mono">SKU: {product.sku}</p>
                )}
              </div>

              {/* CTA Button */}
              <div className="flex items-center gap-4 pt-2">
                {ctaButton ? (
                  <ActionButtonRender buttons={[ctaButton]} metricEventName={metricEventName} />
                ) : (
                  <Link
                    href={`/en-US/products/${product.id}`}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-4 text-lg font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 hover:-translate-y-0.5"
                    onClick={() => {
                      if (metricEventName) {
                        trackMetric(metricEventName, {
                          product_id: product.sku || product.id,
                          position: 1,
                          list_id: listId,
                          variant: "single",
                          productTitle: product.title,
                          productPrice: product.price,
                        });
                      }
                    }}
                  >
                    View Product
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Multiple products: Carousel layout
  return (
    <ProductCarousel
      products={products}
      title={title}
      body={body}
      ctaButton={ctaButton}
      inspectorProps={inspectorProps}
      shouldShowPrice={shouldShowPrice}
      metricEventName={metricEventName}
      listId={listId}
      trackMetric={trackMetric}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Skeleton                                                          */
/* ------------------------------------------------------------------ */

function ProductCatalogSkeleton({
  title,
  body,
  inspectorProps,
}: {
  title?: string;
  body?: string;
  inspectorProps: ReturnType<typeof useContentfulInspectorMode>;
}) {
  return (
    <section className="py-10 md:py-16 lg:py-24 bg-gradient-to-b from-muted/30 to-background">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-start justify-between mb-6 md:mb-10 gap-3">
          <div className="min-w-0">
            <h2
              {...inspectorProps({ fieldId: "title" })}
              className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-1"
            >
              {title}
            </h2>
            {body && (
              <p
                {...inspectorProps({ fieldId: "body" })}
                className="text-base md:text-lg text-muted-foreground max-w-2xl leading-relaxed"
              >
                {body}
              </p>
            )}
          </div>
          {/* Arrow placeholders */}
          <div className="flex items-center gap-2 shrink-0 mt-1">
            <div className="w-9 h-9 rounded-full border border-border/60 bg-muted/40 opacity-30" />
            <div className="w-9 h-9 rounded-full border border-border/60 bg-muted/40 opacity-30" />
          </div>
        </div>

        {/* Card skeletons */}
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="shrink-0 w-[72vw] xs:w-[60vw] sm:w-[230px] md:w-[calc(25%-12px)] rounded-2xl border border-border/50 bg-card overflow-hidden"
            >
              <div className="aspect-square bg-muted animate-pulse" />
              <div className="p-4 space-y-2">
                <div className="h-4 rounded bg-muted animate-pulse w-3/4" />
                <div className="h-4 rounded bg-muted animate-pulse w-1/2" />
                <div className="h-6 rounded bg-muted animate-pulse w-1/3 mt-1" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Carousel sub-component                                            */
/* ------------------------------------------------------------------ */

interface ProductCarouselProps {
  products: ProductData[];
  title?: string;
  body?: string;
  ctaButton: any;
  inspectorProps: ReturnType<typeof useContentfulInspectorMode>;
  shouldShowPrice: (price: number) => boolean;
  metricEventName?: MetricEventName;
  listId: string;
  trackMetric: ReturnType<typeof useTracking>["trackMetric"];
}

function ProductCarousel({
  products,
  title,
  body,
  ctaButton,
  inspectorProps,
  shouldShowPrice,
  metricEventName,
  listId,
  trackMetric,
}: ProductCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    slidesToScroll: 4,
    breakpoints: {
      "(max-width: 1023px)": { slidesToScroll: 2 },
      "(max-width: 639px)": { slidesToScroll: 1 },
    },
  });

  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  const updateButtons = useCallback(() => {
    if (!emblaApi) return;
    setCanPrev(emblaApi.canScrollPrev());
    setCanNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    updateButtons();
    emblaApi.on("select", updateButtons);
    emblaApi.on("reInit", updateButtons);
    return () => {
      emblaApi.off("select", updateButtons);
      emblaApi.off("reInit", updateButtons);
    };
  }, [emblaApi, updateButtons]);

  return (
    <section className="py-10 md:py-16 lg:py-24 bg-gradient-to-b from-muted/30 to-background">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header with nav arrows */}
        <div className="flex items-start justify-between mb-6 md:mb-10 gap-3">
          <div className="min-w-0">
            <h2
              {...inspectorProps({ fieldId: "title" })}
              className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-1"
            >
              {title}
            </h2>
            {body && (
              <p
                {...inspectorProps({ fieldId: "body" })}
                className="text-base md:text-lg text-muted-foreground max-w-2xl leading-relaxed"
              >
                {body}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 mt-1">
            <button
              type="button"
              aria-label="Previous"
              onClick={() => emblaApi?.scrollPrev()}
              disabled={!canPrev}
              className={cn(
                "w-9 h-9 rounded-full border border-border/60 bg-background flex items-center justify-center transition-all duration-200",
                canPrev ? "hover:bg-muted hover:border-border shadow-sm" : "opacity-30 cursor-default"
              )}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Next"
              onClick={() => emblaApi?.scrollNext()}
              disabled={!canNext}
              className={cn(
                "w-9 h-9 rounded-full border border-border/60 bg-background flex items-center justify-center transition-all duration-200",
                canNext ? "hover:bg-muted hover:border-border shadow-sm" : "opacity-30 cursor-default"
              )}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Embla viewport */}
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex gap-4">
            {products.map((product, i) => {
              const showPrice = shouldShowPrice(product.price);
              return (
                <Link
                  key={product.id}
                  href={`/en-US/products/${product.id}`}
                  className="group block shrink-0 w-full sm:w-[calc(50%-8px)] lg:w-[calc(25%-12px)]"
                  onClick={() => {
                    if (metricEventName) {
                      trackMetric(metricEventName, {
                        product_id: product.sku || product.id,
                        position: i + 1,
                        list_id: listId,
                        variant: "carousel",
                        productTitle: product.title,
                        productPrice: product.price,
                      });
                    }
                  }}
                >
                  <article className="h-full bg-card rounded-2xl overflow-hidden border border-border/50 shadow-sm hover:shadow-xl hover:border-border transition-all duration-300 hover:-translate-y-1">
                    <div className="aspect-square overflow-hidden bg-gradient-to-br from-muted/50 to-muted relative">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                          <svg className="w-12 h-12 text-primary/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 px-4 py-2 rounded-full bg-background/90 backdrop-blur-sm text-sm font-medium shadow-lg">
                          View Details
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-sm md:text-base line-clamp-2 group-hover:text-primary transition-colors leading-snug mb-2">
                        {product.title}
                      </h3>
                      {showPrice && (
                        <p className="text-lg md:text-xl font-bold text-primary">
                          {formatPrice(product.price, product.currency)}
                        </p>
                      )}
                    </div>
                  </article>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Optional CTA */}
        {ctaButton && (
          <div className="mt-14 text-center">
            <ActionButtonRender buttons={[ctaButton]} />
          </div>
        )}
      </div>
    </section>
  );
}
