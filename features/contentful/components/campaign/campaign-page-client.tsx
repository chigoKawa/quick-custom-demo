"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import {
  useContentfulLiveUpdates,
  useContentfulInspectorMode,
} from "@contentful/live-preview/react";
import { cn } from "@/lib/utils";
import type { ICampaign, IProductCategory } from "../../type";
import ContentfulLandingPage from "../contentful-landing-page";

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
  const c = (currency ?? "NOK").toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: c, minimumFractionDigits: 2 }).format(price);
  } catch {
    return `${c} ${price.toFixed(2)}`;
  }
}

interface CampaignPageClientProps {
  entry: ICampaign;
  locale: string;
  isPreview: boolean;
}

function isCampaignActive(entry: ICampaign): boolean {
  const now = new Date();
  const from = entry.fields.validFrom ? new Date(entry.fields.validFrom) : null;
  const to = entry.fields.validTo ? new Date(entry.fields.validTo) : null;
  if (from && now < from) return false;
  if (to && now > to) return false;
  return true;
}

export default function CampaignPageClient({
  entry: serverEntry,
  locale,
  isPreview,
}: CampaignPageClientProps) {
  const { nt_experiences: _ntExp, nt_variants: _ntVar, ...campaignFields } = serverEntry.fields as any;
  const entry = useContentfulLiveUpdates({ sys: serverEntry.sys, fields: campaignFields } as ICampaign) || serverEntry;
  const inspectorProps = useContentfulInspectorMode({ entryId: entry.sys.id });

  const active = isCampaignActive(entry);
  const heroComponent = entry.fields.heroComponent;
  const promoTitle = entry.fields.promoTitle;
  const targetCategories = (entry.fields.targetCategories ?? []) as IProductCategory[];
  const topSections = Array.isArray(entry.fields.topSections) ? entry.fields.topSections : [];
  const bottomSections = Array.isArray(entry.fields.bottomSections) ? entry.fields.bottomSections : [];

  const productsData = entry.fields.targetProducts as {
    selectionMode?: string;
    selectedProducts?: ProductData[];
  } | null;
  const targetedProducts: ProductData[] = productsData?.selectedProducts ?? [];

  const validTo = entry.fields.validTo ? new Date(entry.fields.validTo) : null;

  // --- Category products: client-fetched so live preview updates reactively ---
  const [categoryProductMap, setCategoryProductMap] = useState<Record<string, ProductData[]>>({});
  const [loadingIds, setLoadingIds] = useState<string[]>([]);
  // Track which IDs have already been fetched (or are in-flight) to avoid duplicate requests
  const fetchedRef = useRef<Set<string>>(new Set());

  // Collect only IDs from fully-resolved entries (fields present).
  // In live preview, Contentful may push unresolved links first.
  const resolvedCategoryIds = targetCategories
    .map((c) => c.fields?.commerceCategoryId as string | undefined)
    .filter((id): id is string => Boolean(id));

  // Sorted stable key — re-runs effect only when the resolved set changes
  const categoryIdsKey = [...resolvedCategoryIds].sort().join(",");

  useEffect(() => {
    if (!categoryIdsKey) {
      setCategoryProductMap({});
      setLoadingIds([]);
      fetchedRef.current.clear();
      return;
    }

    const ids = categoryIdsKey.split(",");
    const toFetch = ids.filter((id) => !fetchedRef.current.has(id));
    if (toFetch.length === 0) return;

    // Mark as in-flight immediately so concurrent renders don't double-fetch
    toFetch.forEach((id) => fetchedRef.current.add(id));
    setLoadingIds((prev) => [...new Set([...prev, ...toFetch])]);

    Promise.all(
      toFetch.map((id) =>
        fetch(`/api/integrations/products?category=${id}&limit=12`)
          .then((r) => r.json())
          .then((data) => ({
            id,
            products: data.success
              ? (data.products as any[]).map((p) => ({
                  id: p.id,
                  title: p.title,
                  price: p.price,
                  currency: p.currency,
                  image: p.images?.[0],
                  sku: p.sku,
                  category: p.category,
                }))
              : [],
          }))
          .catch(() => ({ id, products: [] as ProductData[] }))
      )
    ).then((results) => {
      setCategoryProductMap((prev) => {
        const next = { ...prev };
        results.forEach(({ id, products }) => { next[id] = products; });
        return next;
      });
      setLoadingIds((prev) => prev.filter((id) => !toFetch.includes(id)));
    });
  }, [categoryIdsKey]);

  const heroLanding = heroComponent
    ? { ...entry, fields: { internalName: entry.fields.internalName, title: entry.fields.name, slug: entry.fields.slug, sections: [heroComponent] } } as any
    : null;

  const topLanding = topSections.length > 0
    ? { ...entry, fields: { internalName: `${entry.fields.internalName}-top`, title: entry.fields.name, slug: entry.fields.slug, sections: topSections } } as any
    : null;

  const bottomLanding = bottomSections.length > 0
    ? { ...entry, fields: { internalName: `${entry.fields.internalName}-bottom`, title: entry.fields.name, slug: entry.fields.slug, sections: bottomSections } } as any
    : null;

  return (
    <>
      {/* Hero */}
      {heroLanding && <ContentfulLandingPage entry={heroLanding} />}

      {/* Campaign metadata */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        {!active && isPreview && (
          <div className="mb-6 p-4 rounded-xl bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm font-medium">
            This campaign is not currently active. You are viewing it in preview mode.
          </div>
        )}

        {promoTitle ? (
          <h1
            {...inspectorProps({ fieldId: "promoTitle" })}
            className="text-3xl md:text-4xl font-bold tracking-tight mb-2"
          >
            {promoTitle}
          </h1>
        ) : (
          <h1
            {...inspectorProps({ fieldId: "name" })}
            className="text-3xl md:text-4xl font-bold tracking-tight mb-2"
          >
            {entry.fields.name}
          </h1>
        )}

        {validTo && active && (
          <p className="text-sm text-muted-foreground mb-2">
            Campaign ends{" "}
            {validTo.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })}
          </p>
        )}
      </section>

      {/* Top sections */}
      {topLanding && <ContentfulLandingPage entry={topLanding} />}

      {/* Featured products carousel */}
      {targetedProducts.length > 0 && (
        <div {...(inspectorProps({ fieldId: "targetProducts" }) as any)}>
          <ProductCarousel
            products={targetedProducts}
            title="Featured Products"
            locale={locale}
          />
        </div>
      )}

      {/* Category carousels — reactive to live preview */}
      {targetCategories.map((cat) => {
        const catId = cat.fields?.commerceCategoryId as string | undefined;
        // Unresolved link — entry fields not yet available (live preview lag)
        if (!catId) return null;

        const isLoading = loadingIds.includes(catId);
        const products = categoryProductMap[catId] ?? [];

        if (isLoading) {
          return (
            <div key={cat.sys.id} className="max-w-7xl mx-auto px-4 py-12 flex items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          );
        }

        if (products.length === 0) return null;

        return (
          <ProductCarousel
            key={cat.sys.id}
            products={products}
            title={cat.fields.title}
            viewAllHref={`/${locale}/products/category/${cat.fields.slug}`}
            locale={locale}
          />
        );
      })}

      {/* Bottom sections */}
      {bottomLanding && <ContentfulLandingPage entry={bottomLanding} />}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Reusable carousel — mirrors ProductCatalogSection carousel layout  */
/* ------------------------------------------------------------------ */

interface ProductCarouselProps {
  products: ProductData[];
  title?: string;
  viewAllHref?: string;
  locale: string;
}

function ProductCarousel({ products, title, viewAllHref, locale }: ProductCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(checkScroll);
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll, products.length]);

  const scroll = useCallback((direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.querySelector<HTMLElement>("[data-carousel-card]")?.offsetWidth ?? 280;
    // Scroll 1 card on mobile, 2 on larger screens
    const count = window.innerWidth < 640 ? 1 : 2;
    el.scrollBy({ left: direction === "left" ? -(cardWidth + 16) * count : (cardWidth + 16) * count, behavior: "smooth" });
  }, []);

  return (
    <section className="py-10 md:py-14">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="min-w-0">
            {title && (
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight truncate">{title}</h2>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            {viewAllHref && (
              <Link href={viewAllHref} className="text-sm font-medium text-primary hover:underline mr-1 hidden sm:inline">
                View all
              </Link>
            )}
            <button
              type="button"
              aria-label="Scroll left"
              onClick={() => scroll("left")}
              disabled={!canScrollLeft}
              className={cn(
                "w-9 h-9 rounded-full border border-border/60 bg-background flex items-center justify-center transition-all duration-200",
                canScrollLeft ? "hover:bg-muted cursor-pointer shadow-sm" : "opacity-30 cursor-default"
              )}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Scroll right"
              onClick={() => scroll("right")}
              disabled={!canScrollRight}
              className={cn(
                "w-9 h-9 rounded-full border border-border/60 bg-background flex items-center justify-center transition-all duration-200",
                canScrollRight ? "hover:bg-muted cursor-pointer shadow-sm" : "opacity-30 cursor-default"
              )}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Track */}
        <div className="relative">
          <div
            className={cn(
              "pointer-events-none absolute left-0 top-0 bottom-0 w-12 z-10 bg-gradient-to-r from-background/80 to-transparent transition-opacity duration-300",
              canScrollLeft ? "opacity-100" : "opacity-0"
            )}
          />
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory scrollbar-hide pb-2 -mb-2"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/${locale}/products/${product.id}`}
                data-carousel-card
                className="group block snap-start shrink-0 w-[72vw] xs:w-[60vw] sm:w-[230px] md:w-[calc(25%-12px)] lg:w-[calc(20%-13px)]"
              >
                <article className="h-full bg-card rounded-2xl overflow-hidden border border-border/50 shadow-sm hover:shadow-xl hover:border-border transition-all duration-300 hover:-translate-y-1">
                  <div className="aspect-square overflow-hidden bg-gradient-to-br from-muted/50 to-muted relative">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        loading="lazy"
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
                    {product.price > 0 && (
                      <p className="text-lg font-bold text-primary">
                        {formatPrice(product.price, product.currency)}
                      </p>
                    )}
                  </div>
                </article>
              </Link>
            ))}
          </div>
          <div
            className={cn(
              "pointer-events-none absolute right-0 top-0 bottom-0 w-12 z-10 bg-gradient-to-l from-background/80 to-transparent transition-opacity duration-300",
              canScrollRight ? "opacity-100" : "opacity-0"
            )}
          />
        </div>
      </div>
    </section>
  );
}
